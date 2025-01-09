import { type Express, type Request, type Response, type RequestHandler } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "db";
import { users, metrics, notifications } from "../../db/schema";
import { type User, type Metrics, type NewNotification } from "../../db/schema";

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

interface MetricsData {
  id: number;
  userId: number;
  leads: number | null;
  adSpend: number | null;
  clicks: number | null;
  impressions: number | null;
  date: Date;
}

export default function setupMetaRoutes(app: Express) {
  // Route zum Verbinden des Meta-Kontos
  app.post('/api/meta/connect', (async (req: Request & { user?: User }, res: Response) => {
    try {
      console.log('Received Meta connect request');
      
      const { accessToken } = req.body;
      if (!accessToken) {
        console.error('No access token provided');
        return res.status(400).json({ error: 'Access token is required' });
      }

      console.log('Access token received:', accessToken.substring(0, 10) + '...');

      // Hole den aktuellen Benutzer aus der Session
      const userId = req.user?.id;
      if (!userId) {
        console.error('No user found in session');
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Speichere den Access Token in der Datenbank
      await db.update(users)
        .set({ 
          metaAccessToken: accessToken,
          metaConnected: true
        })
        .where(eq(users.id, userId));

      console.log('Meta connection successful for user:', userId);

      // Fetch initial metrics from Meta API
      const metaData = await fetchMetaMetrics(accessToken);
      
      // Store metrics in database
      await db.insert(metrics).values({
        userId,
        leads: Math.floor(metaData.leads),
        adSpend: metaData.spend.toString(), // Konvertiere zu String für decimal Typ
        clicks: Math.floor(metaData.clicks),
        impressions: Math.floor(metaData.impressions),
        date: new Date()
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error in /api/meta/connect:', error);
      res.status(500).json({ error: 'Failed to connect Meta account' });
    }
  }) as RequestHandler);

  // Route zum Abrufen der Meta-Metriken
  app.get('/api/metrics/:userId', (async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Hole die letzten 30 Tage Metriken
      const metricsData = await db.query.metrics.findMany({
        where: eq(metrics.userId, userId),
        orderBy: desc(metrics.date),
        limit: 30
      });

      if (!metricsData || metricsData.length === 0) {
        return res.json([]);
      }

      // Vergleiche mit vorherigen Metriken für neue Leads
      const previousMetrics = await db.query.metrics.findFirst({
        where: and(
          eq(metrics.userId, userId),
          sql`date < ${metricsData[0].date}`
        ),
        orderBy: desc(metrics.date)
      });

      const currentLeads = metricsData[0]?.leads ?? 0;
      const previousLeads = previousMetrics?.leads ?? 0;

      if (currentLeads > previousLeads) {
        // Neue Leads gefunden
        const newLeads = currentLeads - previousLeads;
        
        // Erstelle Benachrichtigung
        const newNotification: NewNotification = {
          userId,
          type: 'lead',
          message: `${newLeads} neue${newLeads === 1 ? 'r' : ''} Lead${newLeads === 1 ? '' : 's'} über Meta Ads`,
          read: false,
          createdAt: new Date()
        };
        
        await db.insert(notifications).values(newNotification);
      }

      // Sortiere die Daten nach Datum (älteste zuerst)
      const sortedMetrics = [...metricsData].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      res.json(sortedMetrics);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  }) as RequestHandler);

  // Route zum Abrufen der Benachrichtigungen
  app.get('/api/notifications', (async (req: Request & { user?: User }, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userNotifications = await db.query.notifications.findMany({
        where: eq(notifications.userId, userId),
        orderBy: desc(notifications.createdAt),
        limit: 50
      });

      res.json(userNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }) as RequestHandler);

  // Route zum Markieren einer Benachrichtigung als gelesen
  app.post('/api/notifications/:id/read', (async (req: Request & { user?: User }, res: Response) => {
    try {
      const userId = req.user?.id;
      const notificationId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      await db.update(notifications)
        .set({ read: true })
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ));

      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  }) as RequestHandler);

  // Facebook Data Deletion Endpoint
  app.post('/api/data-deletion', (async (req: Request, res: Response) => {
    try {
      const { signed_request } = req.body;
      
      if (!signed_request) {
        return res.status(400).json({
          message: "Signed request is required",
          url: "https://app.nextmove-consulting.de/data-deletion",
          confirmation_code: "not_available"
        });
      }

      // TODO: Verify signed_request and extract user_id
      // For now, we'll just acknowledge the request
      
      console.log('Received data deletion request');

      // Respond to Facebook with confirmation
      res.json({
        url: "https://app.nextmove-consulting.de/data-deletion",
        confirmation_code: Date.now().toString(),
        status: "success"
      });
      
    } catch (error) {
      console.error('Error processing deletion request:', error);
      res.status(500).json({
        message: "Internal server error",
        url: "https://app.nextmove-consulting.de/data-deletion"
      });
    }
  }) as RequestHandler);

  // Helper function to fetch Meta metrics
  async function fetchMetaMetrics(userAccessToken: string): Promise<MetaMetrics> {
    try {
      // Hole zuerst die Ad Accounts des Users
      const accountResponse = await fetch(
        'https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id,account_status,business,currency',
        {
          headers: {
            'Authorization': `Bearer ${userAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!accountResponse.ok) {
        const error = await accountResponse.json();
        console.error("Meta API Error:", error);
        throw new Error(`Failed to fetch ad accounts: ${error.error?.message || 'Unknown error'}`);
      }

      const accounts = await accountResponse.json();
      console.log('Ad Accounts Response:', accounts); // Debug log

      if (!accounts.data || accounts.data.length === 0) {
        throw new Error("No ad accounts found");
      }

      // Nutze act_ Prefix für Ad Account ID
      const adAccountId = accounts.data[0].id.startsWith('act_') 
        ? accounts.data[0].id 
        : `act_${accounts.data[0].id}`;

      console.log('Using Ad Account ID:', adAccountId); // Debug log

      // Hole dann die Insights für das Werbekonto
      const insightsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${adAccountId}/insights?` +
        `fields=impressions,clicks,spend,actions,action_values,reach,cpc,cpm&` +
        `date_preset=last_30d&` + // Letzte 30 Tage
        `time_increment=1&` + // Tägliche Daten
        `level=account`,
        {
          headers: {
            'Authorization': `Bearer ${userAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!insightsResponse.ok) {
        const error = await insightsResponse.json();
        console.error("Meta Insights API Error:", error);
        throw new Error(`Failed to fetch insights: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await insightsResponse.json();
      console.log('Insights Response:', data); // Debug log

      // Summiere alle Werte
      const insights = data.data.reduce((acc: InsightsAccumulator, curr: MetaInsightsResponse) => ({
        impressions: (acc.impressions || 0) + parseInt(curr.impressions || '0'),
        clicks: (acc.clicks || 0) + parseInt(curr.clicks || '0'),
        spend: (acc.spend || 0) + parseFloat(curr.spend || '0'),
        reach: (acc.reach || 0) + parseInt(curr.reach || '0'),
        cpc: parseFloat(curr.cpc || '0'),
        cpm: parseFloat(curr.cpm || '0'),
        actions: [...(acc.actions || []), ...(curr.actions || [])]
      }), {
        impressions: 0,
        clicks: 0,
        spend: 0,
        reach: 0,
        cpc: 0,
        cpm: 0,
        actions: []
      });

      // Summiere alle Leads
      const allActions = insights.actions || [];
      const leads = allActions
        .filter((action: MetaAction) => action.action_type === 'lead')
        .reduce((sum: number, action: MetaAction) => sum + parseInt(action.value || '0'), 0);

      return {
        leads,
        spend: insights.spend || 0,
        clicks: insights.clicks || 0,
        impressions: insights.impressions || 0,
        reach: insights.reach || 0,
        cpc: insights.cpc || 0,
        cpm: insights.cpm || 0
      };
    } catch (error) {
      console.error("Error in fetchMetaMetrics:", error);
      throw error;
    }
  }
}
