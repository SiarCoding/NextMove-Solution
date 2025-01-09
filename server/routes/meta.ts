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
  date_start?: string;  // FB Insights gibt das an
  date_stop?: string;
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

// -------------------------------------
// Hauptfunktion: registriert alle Routen
// -------------------------------------
export default function setupMetaRoutes(app: Express) {
  // 1) Meta connect: Speichert AccessToken in DB
  app.post(
    "/api/meta/connect",
    (async (req: Request & { user?: User }, res: Response) => {
      try {
        const { accessToken } = req.body;
        if (!accessToken) {
          return res.status(400).json({ error: "Access token is required" });
        }

        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: "User not authenticated" });
        }

        // Access Token in DB speichern
        await db
          .update(users)
          .set({
            metaAccessToken: accessToken,
            metaConnected: true,
          })
          .where(eq(users.id, userId));

        console.log("Meta connection successful for user:", userId);
        return res.json({ success: true });
      } catch (error) {
        console.error("Error in /api/meta/connect:", error);
        return res
          .status(500)
          .json({ error: "Failed to connect Meta account" });
      }
    }) as RequestHandler
  );

  // 2) Hol alle AdAccounts des Nutzers
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
          return res
            .status(400)
            .json({ error: "No Meta access token found" });
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
        return res.json(accountsData.data || []);
      } catch (error) {
        console.error("Error fetching adaccounts:", error);
        return res
          .status(500)
          .json({ error: "Failed to fetch ad accounts" });
      }
    }) as RequestHandler
  );

  // 3) Insights für EIN gewähltes AdAccount laden & in DB speichern
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
          return res
            .status(400)
            .json({ error: "No adAccountId provided" });
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
        const metaData = await fetchInsightsForAdAccount(
          accessToken,
          adAccountId,
          "last_30d" // <-- hier fix "last_30d". Du könntest das auch dynamisch machen
        );

        // Speichere in DB (hier als Demo: ein Eintrag)
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

  // 4) Metriken abrufen (aus DB)
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
        return res
          .status(500)
          .json({ error: "Failed to fetch metrics" });
      }
    }) as RequestHandler
  );

  // 5) NEU: Zeitraumbezogene Insights ohne Speichern in DB
  //    /api/meta/fetch-insights?timeframe=daily|weekly|monthly|total
  app.get(
    "/api/meta/fetch-insights",
    (async (req: Request & { user?: User }, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: "Not authenticated" });
        }

        const timeframe = (req.query.timeframe as string) || "weekly";
        // Mögliche Presets:
        let datePreset = "last_7d";
        if (timeframe === "daily") datePreset = "yesterday";
        else if (timeframe === "weekly") datePreset = "last_7d";
        else if (timeframe === "monthly") datePreset = "last_30d";
        else if (timeframe === "total") datePreset = "lifetime";

        // AccessToken
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

        // Wähle z. B. EIN Ad-Konto oder mehrere
        // Hier nur Demo: Du könntest erst "adaccounts" abfragen und ID wählen
        const adAccountId = "act_1234567890";
        const url =
          `https://graph.facebook.com/v18.0/${adAccountId}/insights?` +
          `fields=date_start,date_stop,impressions,clicks,spend,actions,action_values,reach,cpc,cpm` +
          `&date_preset=${datePreset}&time_increment=1&level=account`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          const error = await response.json();
          console.error("Meta Insights API Error:", error);
          return res
            .status(500)
            .json({ error: error.error?.message || "Failed to fetch" });
        }

        const data = await response.json();
        // Baue ein Array an "Tageswerten" (o. ä.)
        // z. B. { date, leads, adSpend, clicks, impressions }
        const results = (data.data || []).map((day: MetaInsightsResponse) => {
          const imps = parseInt(day.impressions || "0");
          const clks = parseInt(day.clicks || "0");
          const spnd = parseFloat(day.spend || "0");
          // Summe Leads
          const leadCount = (day.actions || [])
            .filter((a) => a.action_type === "lead")
            .reduce((sum, a) => sum + parseInt(a.value || "0"), 0);

          return {
            // date => nimm date_start 
            date: day.date_start || new Date().toISOString().slice(0, 10),
            leads: leadCount,
            adSpend: spnd.toString(),
            clicks: clks,
            impressions: imps,
          };
        });

        return res.json(results);
      } catch (error) {
        console.error("Error in GET /api/meta/fetch-insights:", error);
        return res
          .status(500)
          .json({ error: "Failed to fetch timeframe-based insights" });
      }
    }) as RequestHandler
  );
}

// -------------------------------------
// Hilfsfunktion: Insights für EIN Ad-Konto (fix: last_30d)
// -------------------------------------
async function fetchInsightsForAdAccount(
  userAccessToken: string,
  adAccountId: string,
  datePreset: string
): Promise<MetaMetrics> {
  // Falls der Nutzer nur "1234567890" geschickt hat, ggf. "act_" voranstellen:
  const normalizedId = adAccountId.startsWith("act_")
    ? adAccountId
    : `act_${adAccountId}`;

  const insightsResponse = await fetch(
    `https://graph.facebook.com/v18.0/${normalizedId}/insights?` +
      `fields=impressions,clicks,spend,actions,action_values,reach,cpc,cpm&` +
      `date_preset=${datePreset}&time_increment=1&level=account`,
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
        cpc: parseFloat(curr.cpc || "0"),
        cpm: parseFloat(curr.cpm || "0"),
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
  const leads = insights.actions
    .filter((a: MetaAction) => a.action_type === "lead")
    .reduce((sum: number, a: MetaAction) => sum + parseInt(a.value || "0"), 0);

  // Rückgabe als MetaMetrics
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
