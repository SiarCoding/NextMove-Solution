import { type Express, type Request, type Response, type RequestHandler } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "db";
import { users, metrics, notifications } from "../../db/schema";
import { type User, type NewNotification } from "../../db/schema";

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
  impressions: string;
  clicks: string;
  spend: string;
  reach: string;
  cpc: string;
  cpm: string;
  actions: MetaAction[];
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
  // Route zum Verbinden des Meta-Kontos (unverändert)
  app.post('/api/meta/connect', (async (req: Request & { user?: User }, res: Response) => {
    try {
      const { accessToken } = req.body;
      if (!accessToken) {
        return res.status(400).json({ error: 'Access token is required' });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Speichere AccessToken + metaConnected
      await db.update(users)
        .set({
          metaAccessToken: accessToken,
          metaConnected: true,
        })
        .where(eq(users.id, userId));

      console.log('Meta connection successful for user:', userId);

      // Optional: Hol gleich die ersten Insights für EIN Konto (hier weggelassen)
      return res.json({ success: true });
    } catch (error) {
      console.error('Error in /api/meta/connect:', error);
      return res.status(500).json({ error: 'Failed to connect Meta account' });
    }
  }) as RequestHandler);

  // **NEUER** Endpunkt: Liste aller Ad-Konten zurückgeben
  app.get('/api/meta/adaccounts', (async (req: Request & { user?: User }, res: Response) => {
    try {
      // Nutzer muss eingeloggt sein
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Den gespeicherten Access Token aus DB holen
      const userRecord = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          metaAccessToken: true,
        },
      });

      const accessToken = userRecord?.metaAccessToken;
      if (!accessToken) {
        return res.status(400).json({ error: 'No Meta access token found' });
      }

      // Hole alle Ad Accounts von Meta
      const accountResponse = await fetch(
        'https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id,account_status,business,currency',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      if (!accountResponse.ok) {
        const error = await accountResponse.json();
        throw new Error(`Failed to fetch ad accounts: ${error.error?.message || 'Unknown error'}`);
      }

      const accountsJson = await accountResponse.json();
      // Sende die Konten direkt an den Client
      return res.json(accountsJson.data || []);
    } catch (error) {
      console.error('Error fetching ad accounts:', error);
      return res.status(500).json({ error: 'Failed to fetch ad accounts' });
    }
  }) as RequestHandler);

  // **NEUER** Endpunkt: Insights für ein ausgewähltes Konto holen & speichern
  app.post('/api/meta/fetch-insights', (async (req: Request & { user?: User }, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { adAccountId } = req.body;
      if (!adAccountId) {
        return res.status(400).json({ error: 'No adAccountId provided' });
      }

      // Access Token aus DB
      const userRecord = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          metaAccessToken: true,
        },
      });

      const accessToken = userRecord?.metaAccessToken;
      if (!accessToken) {
        return res.status(400).json({ error: 'No Meta access token found' });
      }

      // Hole Insights für das ausgewählte Konto
      const metaData = await fetchMetaMetrics(accessToken, adAccountId);

      // Speichere in der DB (du könntest hier auch mehrere Datensätze anlegen)
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
      console.error('Error in /api/meta/fetch-insights:', error);
      return res.status(500).json({ error: 'Failed to fetch & store insights' });
    }
  }) as RequestHandler);

  // Route zum Abrufen der Meta-Metriken (unverändert)
  app.get('/api/metrics/:userId', (async (req: Request, res: Response) => {
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

      // Notifications-Logik wie gehabt:
      const previousMetrics = await db.query.metrics.findFirst({
        where: and(eq(metrics.userId, userId), sql`date < ${metricsData[0].date}`),
        orderBy: desc(metrics.date),
      });

      const currentLeads = metricsData[0]?.leads ?? 0;
      const previousLeads = previousMetrics?.leads ?? 0;

      if (currentLeads > previousLeads) {
        const newLeads = currentLeads - previousLeads;
        const newNotification: NewNotification = {
          userId,
          type: 'lead',
          message: `${newLeads} neue${newLeads === 1 ? 'r' : ''} Lead${newLeads === 1 ? '' : 's'} über Meta Ads`,
          read: false,
          createdAt: new Date(),
        };
        await db.insert(notifications).values(newNotification);
      }

      // Sortieren (älteste zuerst)
      const sortedMetrics = [...metricsData].sort((a, b) => +a.date - +b.date);
      return res.json(sortedMetrics);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  }) as RequestHandler);

  // Route zum Abrufen der Notifications usw. (unverändert)
  app.get('/api/notifications', /* ... */ (req, res) => {});
  app.post('/api/notifications/:id/read', /* ... */ (req, res) => {});
  app.post('/api/data-deletion', /* ... */ (req, res) => {});

  // -------------------------------------------------------
  // Hilfsfunktion: Holt Insights für EIN bestimmtes adAccountId
  // -------------------------------------------------------
  async function fetchMetaMetrics(userAccessToken: string, adAccountId: string): Promise<MetaMetrics> {
    try {
      // Hol die Insights für dieses spezielle adAccountId
      const insightsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${adAccountId}/insights?` +
          `fields=impressions,clicks,spend,actions,action_values,reach,cpc,cpm&` +
          `date_preset=last_30d&time_increment=1&level=account`,
        {
          headers: {
            Authorization: `Bearer ${userAccessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!insightsResponse.ok) {
        const error = await insightsResponse.json();
        console.error('Meta Insights API Error:', error);
        throw new Error(`Failed to fetch insights: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await insightsResponse.json();
      console.log('Insights Response:', data);

      // Aufsummieren
      const insights = data.data?.reduce(
        (acc: InsightsAccumulator, curr: MetaInsightsResponse) => ({
          impressions: acc.impressions + parseInt(curr.impressions || '0'),
          clicks: acc.clicks + parseInt(curr.clicks || '0'),
          spend: acc.spend + parseFloat(curr.spend || '0'),
          reach: acc.reach + parseInt(curr.reach || '0'),
          cpc: parseFloat(curr.cpc || '0'), // Wenn du den Durchschnitt willst, müsstest du extra rechnen
          cpm: parseFloat(curr.cpm || '0'), // dito
          actions: [...acc.actions, ...(curr.actions || [])],
        }),
        {
          impressions: 0,
          clicks: 0,
          spend: 0,
          reach: 0,
          cpc: 0,
          cpm: 0,
          actions: [],
        } as InsightsAccumulator,
      ) || {
        impressions: 0,
        clicks: 0,
        spend: 0,
        reach: 0,
        cpc: 0,
        cpm: 0,
        actions: [],
      };

      // Anzahl Leads summieren
      const leads = insights.actions
      .filter((action: MetaAction) => action.action_type === 'lead')
      .reduce((sum: number, action: MetaAction) => {
        return sum + parseInt(action.value || '0');
      }, 0);


      return {
        leads,
        spend: insights.spend,
        clicks: insights.clicks,
        impressions: insights.impressions,
        reach: insights.reach,
        cpc: insights.cpc,
        cpm: insights.cpm,
      };
    } catch (error) {
      console.error('Error in fetchMetaMetrics:', error);
      throw error;
    }
  }
}
