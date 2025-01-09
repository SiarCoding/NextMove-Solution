import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { Users, DollarSign, MousePointer, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { initFacebookSDK, connectToMetaAPI } from '@/lib/facebook-sdk';

interface AdAccount {
  account_id: string;
  name: string;
  // weitere Felder, falls nötig
}

// Typdefinitionen für Metriken
interface MetricDataPoint {
  leads: number;
  adSpend: string; // DB decimal als string
  clicks: number;
  impressions: number;
  period: string;
}

interface MetricsData {
  daily: MetricDataPoint[];
  weekly: MetricDataPoint[];
  monthly: MetricDataPoint[];
  total: MetricDataPoint[];
}

// Falls du in React State lieber die rohen DB-Einträge verwendest,
// könntest du stattdessen ein `Metrics[]` anlegen.
// Hier belassen wir es bei einer abstrakten "MetricsData"-Struktur.
type TimeframeType = 'daily' | 'weekly' | 'monthly' | 'total';

interface ChartDataPoint {
  period: string;
  value: number;
}

function formatNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--primary) / 0.8)',
  'hsl(var(--primary) / 0.6)',
  'hsl(var(--primary) / 0.4)',
  'hsl(var(--primary) / 0.3)',
  'hsl(var(--primary) / 0.2)',
  'hsl(var(--primary) / 0.1)',
];

interface MetricCardProps {
  title: string;
  value: string | number;
  weekTotal: string | number;
  icon: React.ReactNode;
  chartType: 'area' | 'pie';
  data: ChartDataPoint[];
  formatter?: (value: number) => string;
}

function MetricCard({
  title,
  value,
  weekTotal,
  icon,
  chartType,
  data,
  formatter = formatNumber,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">
          +{weekTotal} diese Woche
        </div>
        <div className="h-[80px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  isAnimationActive={false}
                />
              </AreaChart>
            ) : (
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="period"
                  cx="50%"
                  cy="50%"
                  outerRadius={30}
                  isAnimationActive={false}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Hier ein Beispiel mit leeren "Timeframe"-Daten.
// Du kannst es später anpassen, wenn du die echten DB-Werte
// in day/week/month aufteilst.
const EMPTY_DATA: MetricsData = {
  daily: Array(7).fill({ leads: 0, adSpend: '0', clicks: 0, impressions: 0, period: '' }),
  weekly: Array(4).fill({ leads: 0, adSpend: '0', clicks: 0, impressions: 0, period: '' }),
  monthly: Array(12).fill({ leads: 0, adSpend: '0', clicks: 0, impressions: 0, period: '' }),
  total: Array(4).fill({ leads: 0, adSpend: '0', clicks: 0, impressions: 0, period: '' }),
};

export default function PerformanceMetrics() {
  const { user } = useAuth(); // z.B. user.id = 101
  const [isConnecting, setIsConnecting] = useState(false);

  // Ad-Accounts in einem Select anzeigen
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>('');

  // Hier landen die aufbereiteten Metriken, die wir nach dem Fetch rendern.
  const [metricsData, setMetricsData] = useState<MetricsData>(EMPTY_DATA);

  // Ggf. Zeit-Range (daily/weekly/...)
  const [timeframe, setTimeframe] = useState<TimeframeType>('daily');

  // 1) Facebook-SDK beim Start laden
  useEffect(() => {
    initFacebookSDK().catch(console.error);
  }, []);

  // 2) Ad-Accounts vom Server laden, wenn metaConnected == true
  useEffect(() => {
    if (!user) return;
    // Hole die Liste der Ad-Accounts
    fetch('/api/meta/adaccounts', {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAdAccounts(data); // [ { account_id, name, ... }, ... ]
        }
      })
      .catch((err) => console.error('Failed to load adaccounts:', err));
  }, [user]);

  // 3) Metric-Daten vom Server laden
  const loadMetricsFromServer = () => {
    if (!user) return;
    fetch(`/api/metrics/${user.id}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((raw) => {
        // raw kann ein Array von DB-Einträgen sein (z.B. "latest 30 entries").
        // Du müsstest hier die Umwandlung in daily/weekly/monthly machen,
        // falls du das so willst. Zum Beispiel:
        const newData: MetricsData = convertDbMetricsToTimescale(raw);
        setMetricsData(newData);
      })
      .catch((err) => console.error('Failed to load metrics:', err));
  };

  // 4) Funktion: Facebook OAuth-Login
  const handleMetaConnect = async () => {
    try {
      setIsConnecting(true);
      await connectToMetaAPI();
      // Danach: UI reload -> user.metaConnected = true -> ...
    } catch (error) {
      console.error('Failed to connect Meta:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  // 5) Klick: Insights für das ausgewählte Konto laden
  const handleFetchInsights = () => {
    if (!selectedAdAccount) {
      alert('Bitte zuerst ein Werbekonto auswählen!');
      return;
    }
    fetch('/api/meta/fetch-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ adAccountId: `act_${selectedAdAccount}`.replace(/^act_/, 'act_') }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          console.error('Error fetching insights:', json.error);
        } else {
          // Nachdem die Daten gespeichert wurden, lade sie neu
          loadMetricsFromServer();
        }
      })
      .catch((err) => console.error('Failed to fetch insights:', err));
  };

  // Schlichtes Beispiel: "DB-Einträge => daily/weekly..."
  // Du müsstest hier echte Zeit-Buckets bilden,
  // wir machen nur "total" als Demo.
  function convertDbMetricsToTimescale(dbRows: any[]): MetricsData {
    if (!Array.isArray(dbRows) || dbRows.length === 0) {
      return EMPTY_DATA;
    }
    // Summiere mal alles in "total" als Demo
    let sumLeads = 0;
    let sumAdSpend = 0;
    let sumClicks = 0;
    let sumImpressions = 0;
    for (const row of dbRows) {
      sumLeads += row.leads ?? 0;
      sumAdSpend += parseFloat(row.adSpend || '0');
      sumClicks += row.clicks ?? 0;
      sumImpressions += row.impressions ?? 0;
    }
    // Nur "total" belegen, Rest leer
    const total = [
      {
        leads: sumLeads,
        adSpend: sumAdSpend.toString(),
        clicks: sumClicks,
        impressions: sumImpressions,
        period: 'Total',
      },
    ];
    return {
      daily: [],
      weekly: [],
      monthly: [],
      total,
    };
  }

  // Die "active" Zeitreihe
  const periodData = metricsData[timeframe] ?? [];
  // Summiere Metriken
  const currentMetrics = {
    leads: periodData.reduce((acc, p) => acc + p.leads, 0),
    adSpend: periodData.reduce((acc, p) => acc + parseFloat(p.adSpend), 0),
    clicks: periodData.reduce((acc, p) => acc + p.clicks, 0),
    impressions: periodData.reduce((acc, p) => acc + p.impressions, 0),
  };

  return (
    <div className="space-y-4">
      {/* 1) Button, um Meta-Login zu starten, falls nicht connected */}
      {!user?.metaConnected && (
        <Button onClick={handleMetaConnect} disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Connect Meta'}
        </Button>
      )}

      {/* 2) Dropdown mit Ad-Accounts */}
      <div>
        <label htmlFor="adAccountSelect">Wähle dein Werbekonto: </label>
        <select
          id="adAccountSelect"
          value={selectedAdAccount}
          onChange={(e) => setSelectedAdAccount(e.target.value)}
        >
          <option value="">-- bitte wählen --</option>
          {adAccounts.map((acc) => (
            <option key={acc.account_id} value={acc.account_id}>
              {acc.name} (ID: {acc.account_id})
            </option>
          ))}
        </select>
        <Button onClick={handleFetchInsights} className="ml-2">
          Insights laden
        </Button>
      </div>

      {/* 3) Tabs für daily / weekly / monthly / total */}
      <div className="flex justify-between items-center">
        <Tabs defaultValue="daily" className="w-[400px]">
          <TabsList>
            <TabsTrigger value="daily" onClick={() => setTimeframe('daily')}>
              Täglich
            </TabsTrigger>
            <TabsTrigger value="weekly" onClick={() => setTimeframe('weekly')}>
              Wöchentlich
            </TabsTrigger>
            <TabsTrigger value="monthly" onClick={() => setTimeframe('monthly')}>
              Monatlich
            </TabsTrigger>
            <TabsTrigger value="total" onClick={() => setTimeframe('total')}>
              Total
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 4) Anzeige der aktuellen Summen */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Leads"
          value={formatNumber(currentMetrics.leads)}
          weekTotal={formatNumber(currentMetrics.leads)}
          icon={<Users className="h-4 w-4" />}
          chartType="area"
          data={periodData.map((d): ChartDataPoint => ({
            period: d.period,
            value: d.leads,
          }))}
        />
        <MetricCard
          title="Ad Spend"
          value={formatCurrency(currentMetrics.adSpend)}
          weekTotal={formatCurrency(currentMetrics.adSpend)}
          icon={<DollarSign className="h-4 w-4" />}
          chartType="area"
          data={periodData.map((d): ChartDataPoint => ({
            period: d.period,
            value: parseFloat(d.adSpend),
          }))}
          formatter={formatCurrency}
        />
        <MetricCard
          title="Clicks"
          value={formatNumber(currentMetrics.clicks)}
          weekTotal={formatNumber(currentMetrics.clicks)}
          icon={<MousePointer className="h-4 w-4" />}
          chartType="area"
          data={periodData.map((d): ChartDataPoint => ({
            period: d.period,
            value: d.clicks,
          }))}
        />
        <MetricCard
          title="Impressions"
          value={formatNumber(currentMetrics.impressions)}
          weekTotal={formatNumber(currentMetrics.impressions)}
          icon={<Eye className="h-4 w-4" />}
          chartType="area"
          data={periodData.map((d): ChartDataPoint => ({
            period: d.period,
            value: d.impressions,
          }))}
        />
      </div>
    </div>
  );
}
