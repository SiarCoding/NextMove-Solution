import { type Express, type Request, type Response, type RequestHandler } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "db";
import { users, metrics, notifications } from "../../db/schema";
import { type User, type NewNotification } from "../../db/schema";

// ---------------------
// Typen für Meta-API
// ---------------------
interface MetaMetrics {
  leads: number;
  spend: number;
  clicks: number;
  impressions: number;
  reach: number;
  cpc: number;
  cpm: number;
}

interface MetaAction {
  action_type: string;
  value: string;
}

interface MetaInsightsResponse {
  impressions?: string;
  clicks?: string;
  spend?: string;
  reach?: string;
  cpc?: string;
  cpm?: string;
  actions?: MetaAction[];
}

interface InsightsAccumulator {
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  cpc: number;
  cpm: number;
  actions: MetaAction[];
}

export default function setupMetaRoutes(app: Express) {
  // -------------------------------------
  // 1) Meta connect: Speichert AccessToken
  // -------------------------------------
  app.post(
    "/api/meta/connect",
    (async (req: Request & { user?: User }, res: Response) => {
      try {
        console.log("Received Meta connect request");
        const { accessToken } = req.body;
        if (!accessToken) {
          return res.status(400).json({ error: "Access token is required" });
        }

        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: "User not authenticated" });
        }

        // Access Token in DB speichern
        await db.update(users).set({
          metaAccessToken: accessToken,
          metaConnected: true,
        })
        .where(eq(users.id, userId));

        console.log("Meta connection successful for user:", userId);
        return res.json({ success: true });
      } catch (error) {
        console.error("Error in /api/meta/connect:", error);
        return res.status(500).json({ error: "Failed to connect Meta account" });
      }
    }) as RequestHandler
  );

  // -------------------------------------
  // 2) Hol alle AdAccounts des Nutzers
  // -------------------------------------
  app.get(
    "/api/meta/adaccounts",
    (async (req: Request & { user?: User }, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: "User not authenticated" });
        }

        // AccessToken holen
        const userRecord = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { metaAccessToken: true },
        });
        const accessToken = userRecord?.metaAccessToken;
        if (!accessToken) {
          return res.status(400).json({ error: "No Meta access token found" });
        }

        // Anfrage an Facebook: Alle AdAccounts
        const accountResponse = await fetch(
          "https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id,account_status,business,currency",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (!accountResponse.ok) {
          const error = await accountResponse.json();
          throw new Error(
            `Failed to fetch ad accounts: ${error.error?.message || "Unknown"}`
          );
        }

        const accountsData = await accountResponse.json();
        // Gibt Array zurück: { data: [ ... ] }
        // Wir senden "accountsData.data" direkt als JSON
        return res.json(accountsData.data || []);
      } catch (error) {
        console.error("Error fetching adaccounts:", error);
        return res.status(500).json({ error: "Failed to fetch ad accounts" });
      }
    }) as RequestHandler
  );

  // -------------------------------------
  // 3) Insights für EIN gewähltes AdAccount laden und speichern
  // -------------------------------------
  app.post(
    "/api/meta/fetch-insights",
    (async (req: Request & { user?: User }, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: "Not authenticated" });
        }

        const { adAccountId } = req.body;
        if (!adAccountId) {
          return res.status(400).json({ error: "No adAccountId provided" });
        }

        // AccessToken holen
        const userRecord = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { metaAccessToken: true },
        });
        const accessToken = userRecord?.metaAccessToken;
        if (!accessToken) {
          return res
            .status(400)
            .json({ error: "No Meta access token found in DB" });
        }

        // Insights holen
        const metaData = await fetchInsightsForAdAccount(accessToken, adAccountId);

        // Speichere in DB (als Demo: 1 Eintrag)
        await db.insert(metrics).values({
          userId,
          leads: Math.floor(metaData.leads),
          adSpend: metaData.spend.toString(),
          clicks: Math.floor(metaData.clicks),
          impressions: Math.floor(metaData.impressions),
          date: new Date(),
        });

        return res.json({ success: true });
      } catch (error) {
        console.error("Error in /api/meta/fetch-insights:", error);
        return res
          .status(500)
          .json({ error: "Failed to fetch & store insights" });
      }
    }) as RequestHandler
  );

  // -------------------------------------
  // 4) Metriken abrufen
  // -------------------------------------
  app.get(
    "/api/metrics/:userId",
    (async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);

        const metricsData = await db.query.metrics.findMany({
          where: eq(metrics.userId, userId),
          orderBy: desc(metrics.date),
          limit: 30,
        });
        if (!metricsData || metricsData.length === 0) {
          return res.json([]);
        }

        // Optional: Notification, wenn neue Leads
        const previousMetrics = await db.query.metrics.findFirst({
          where: and(
            eq(metrics.userId, userId),
            sql`date < ${metricsData[0].date}`
          ),
          orderBy: desc(metrics.date),
        });

        const currentLeads = metricsData[0]?.leads ?? 0;
        const previousLeads = previousMetrics?.leads ?? 0;

        if (currentLeads > previousLeads) {
          const newLeads = currentLeads - previousLeads;
          const newNotification: NewNotification = {
            userId,
            type: "lead",
            message: `${newLeads} neue${
              newLeads === 1 ? "r" : ""
            } Lead${newLeads === 1 ? "" : "s"} über Meta Ads`,
            read: false,
            createdAt: new Date(),
          };
          await db.insert(notifications).values(newNotification);
        }

        // Sortiert nach Datum (älteste zuerst)
        const sortedMetrics = [...metricsData].sort(
          (a, b) => +a.date - +b.date
        );
        return res.json(sortedMetrics);
      } catch (error) {
        console.error("Error fetching metrics:", error);
        return res.status(500).json({ error: "Failed to fetch metrics" });
      }
    }) as RequestHandler
  );

  // -------------------------------------
  // Hilfsfunktion: Insights für EIN Ad-Konto
  // -------------------------------------
  async function fetchInsightsForAdAccount(
    userAccessToken: string,
    adAccountId: string
  ): Promise<MetaMetrics> {
    // adAccountId kann z. B. "act_1234567890" sein
    // Falls der Nutzer nur "1234567890" geschickt hat, ggf. "act_" voranstellen:
    const normalizedId = adAccountId.startsWith("act_")
      ? adAccountId
      : `act_${adAccountId}`;

    // Anfrage an FB
    const insightsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${normalizedId}/insights?` +
        `fields=impressions,clicks,spend,actions,action_values,reach,cpc,cpm&` +
        `date_preset=last_30d&time_increment=1&level=account`,
      {
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!insightsResponse.ok) {
      const error = await insightsResponse.json();
      console.error("Meta Insights API Error:", error);
      throw new Error(`Failed to fetch insights: ${error.error?.message}`);
    }

    const data = await insightsResponse.json();
    console.log("Insights Response:", data);

    // Aufsummieren
    const insights = (data.data || []).reduce(
      (acc: InsightsAccumulator, curr: MetaInsightsResponse) => {
        const imps = parseInt(curr.impressions || "0");
        const clks = parseInt(curr.clicks || "0");
        const spnd = parseFloat(curr.spend || "0");
        const rch = parseInt(curr.reach || "0");
        return {
          impressions: acc.impressions + imps,
          clicks: acc.clicks + clks,
          spend: acc.spend + spnd,
          reach: acc.reach + rch,
          cpc: parseFloat(curr.cpc || "0"), // falls du den Durchschn. willst, müsstest du separat rechnen
          cpm: parseFloat(curr.cpm || "0"), // dito
          actions: [...acc.actions, ...(curr.actions || [])],
        };
      },
      {
        impressions: 0,
        clicks: 0,
        spend: 0,
        reach: 0,
        cpc: 0,
        cpm: 0,
        actions: [],
      } as InsightsAccumulator
    );

    // Leads summieren
// Leads summieren
const leads = insights.actions
  .filter((a: MetaAction) => a.action_type === "lead")
  .reduce((sum: number, a: MetaAction) => sum + parseInt(a.value || "0"), 0);

    return {
      leads,
      spend: insights.spend,
      clicks: insights.clicks,
      impressions: insights.impressions,
      reach: insights.reach,
      cpc: insights.cpc,
      cpm: insights.cpm,
    };
  }
}
