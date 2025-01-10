import React, { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, DollarSign, MousePointer, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

// Typen für die DB-Metriken (bereits in DB gespeicherte Insights)
interface DBMetric {
  leads: number;
  adSpend: string; // decimal in DB => string
  clicks: number;
  impressions: number;
  date: string; // ISO Zeitstring, z.B. "2025-01-10T14:13:59.188Z"
}

type ChartDataPoint = {
  period: string;
  value: number;
};

// Hilfsfunktionen zum Formatieren
function formatNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.8)",
  "hsl(var(--primary) / 0.6)",
  "hsl(var(--primary) / 0.4)",
  "hsl(var(--primary) / 0.3)",
  "hsl(var(--primary) / 0.2)",
  "hsl(var(--primary) / 0.1)",
];

interface MetricCardProps {
  title: string;
  value: string | number;
  weekTotal: string | number;
  icon: React.ReactNode;
  chartType: "area" | "pie";
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
            {chartType === "area" ? (
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
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
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

// Wir wollen verschiedene Zeiträume: daily, weekly, monthly, total
type Timeframe = "daily" | "weekly" | "monthly" | "total";

// Hilfsfunktion: Filtere dbMetrics nach Zeitbereich
function filterMetricsByTimeframe(
  metrics: DBMetric[],
  timeframe: Timeframe
): DBMetric[] {
  if (timeframe === "total") {
    return metrics;
  }
  const now = new Date();
  let daysBack = 7; // default weekly
  if (timeframe === "daily") daysBack = 1;
  else if (timeframe === "monthly") daysBack = 30;

  // Schnittpunkt ab (z. B. jetzt - 7 Tage)
  const cutoff = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  return metrics.filter((m) => {
    const metricDate = new Date(m.date);
    return metricDate >= cutoff;
  });
}

export default function PerformanceMetrics() {
  const { user } = useAuth();
  const [dbMetrics, setDbMetrics] = useState<DBMetric[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>("weekly");

  // Metriken beim Mount laden
  useEffect(() => {
    if (!user) return;
    fetch(`/api/metrics/${user.id}`, { credentials: "include" })
      .then((res) => res.json())
      .then((metrics: DBMetric[]) => {
        setDbMetrics(metrics);
      })
      .catch((err) => console.error("Failed to load metrics:", err));
  }, [user]);

  // Zeitgefilterte Metriken:
  const filtered = filterMetricsByTimeframe(dbMetrics, timeframe);

  // Chart-Daten:
  const chartDataLeads: ChartDataPoint[] = filtered.map((m) => ({
    period: new Date(m.date).toLocaleDateString("de-DE", { weekday: "short" }),
    value: m.leads,
  }));
  const chartDataSpend: ChartDataPoint[] = filtered.map((m) => ({
    period: new Date(m.date).toLocaleDateString("de-DE", { weekday: "short" }),
    value: parseFloat(m.adSpend),
  }));
  const chartDataClicks: ChartDataPoint[] = filtered.map((m) => ({
    period: new Date(m.date).toLocaleDateString("de-DE", { weekday: "short" }),
    value: m.clicks,
  }));
  const chartDataImpr: ChartDataPoint[] = filtered.map((m) => ({
    period: new Date(m.date).toLocaleDateString("de-DE", { weekday: "short" }),
    value: m.impressions,
  }));

  // Summen
  const totalLeads = filtered.reduce((acc, m) => acc + m.leads, 0);
  const totalSpend = filtered.reduce((acc, m) => acc + parseFloat(m.adSpend), 0);
  const totalClicks = filtered.reduce((acc, m) => acc + m.clicks, 0);
  const totalImpr = filtered.reduce((acc, m) => acc + m.impressions, 0);

  return (
    <div className="space-y-4">
      {/* Tabs für Timeframe */}
      <Tabs
        defaultValue="weekly"
        onValueChange={(val) => setTimeframe(val as Timeframe)}
      >
        <TabsList>
          <TabsTrigger value="daily">Täglich</TabsTrigger>
          <TabsTrigger value="weekly">Wöchentlich</TabsTrigger>
          <TabsTrigger value="monthly">Monatlich</TabsTrigger>
          <TabsTrigger value="total">Gesamt</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Vier Karten nebeneinander */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Leads"
          value={formatNumber(totalLeads)}
          weekTotal={formatNumber(totalLeads)}
          icon={<Users className="h-4 w-4" />}
          chartType="area"
          data={chartDataLeads}
        />
        <MetricCard
          title="Ad Spend"
          value={formatCurrency(totalSpend)}
          weekTotal={formatCurrency(totalSpend)}
          icon={<DollarSign className="h-4 w-4" />}
          chartType="area"
          data={chartDataSpend}
          formatter={formatCurrency}
        />
        <MetricCard
          title="Clicks"
          value={formatNumber(totalClicks)}
          weekTotal={formatNumber(totalClicks)}
          icon={<MousePointer className="h-4 w-4" />}
          chartType="area"
          data={chartDataClicks}
        />
        <MetricCard
          title="Impressions"
          value={formatNumber(totalImpr)}
          weekTotal={formatNumber(totalImpr)}
          icon={<Eye className="h-4 w-4" />}
          chartType="area"
          data={chartDataImpr}
        />
      </div>
    </div>
  );
}
