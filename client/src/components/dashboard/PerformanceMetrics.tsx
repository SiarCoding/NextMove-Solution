import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Users, DollarSign, MousePointer, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";

// DB-Metrics (bereits in DB gespeicherte Insights)
interface DBMetric {
  leads: number;
  adSpend: string; // decimal in DB => string
  clicks: number;
  impressions: number;
  date: string; // ISO Zeitstring, z. B. "2025-01-10T14:13:59.188Z"
}

// Zur Anzeige in den Charts
type ChartDataPoint = {
  // z. B. "Mo" oder "2025-01-05"
  period: string;
  value: number;
};

// Hilfsfunktionen
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

// Metrik-Karten-Props
interface MetricCardProps {
  title: string;
  // Die "Hauptzahl", z. B. "42"
  value: string | number;
  // Die "Zweitinfo", z. B. "+42 diese Woche"
  weekTotal: string | number;
  icon: React.ReactNode;
  data: ChartDataPoint[];
  // line chart statt area
  formatter?: (value: number) => string;
}

function MetricCard({
  title,
  value,
  weekTotal,
  icon,
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
          +{weekTotal} in diesem Zeitraum
        </div>
        <div className="h-[80px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--primary) / 0.2)" />
              <XAxis dataKey="period" hide />
              <YAxis hide />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Zeitintervalle
type Timeframe = "daily" | "weekly" | "monthly" | "total";

// Filter-Funktion: Greift auf DB-Metrics zu und wendet Zeitlimits an
function filterMetricsByTimeframe(
  metrics: DBMetric[],
  timeframe: Timeframe
): DBMetric[] {
  if (timeframe === "total") {
    return metrics; // Alle Einträge
  }

  const now = new Date();
  let daysBack = 7; // weekly = 7 Tage
  if (timeframe === "daily") daysBack = 1;
  else if (timeframe === "monthly") daysBack = 30;

  const cutoff = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return metrics.filter((m) => new Date(m.date) >= cutoff);
}

export default function PerformanceMetrics() {
  const { user } = useAuth();
  const [dbMetrics, setDbMetrics] = useState<DBMetric[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>("weekly");

  useEffect(() => {
    if (!user) return;
    // DB-Metrics laden
    fetch(`/api/metrics/${user.id}`, { credentials: "include" })
      .then((res) => res.json())
      .then((metrics: DBMetric[]) => {
        setDbMetrics(metrics);
      })
      .catch((err) => console.error("Failed to load metrics:", err));
  }, [user]);

  // Nur die Metriken im gewählten Zeitraum
  const filteredMetrics = filterMetricsByTimeframe(dbMetrics, timeframe);

  // CHART-Daten für Leads, AdSpend, Clicks, Impressions
  // => du kannst hier beliebig "summieren pro Tag" oder "einfach Metrik pro DB-Zeile" ...
  // derzeit: 1 DB-Eintrag = 1 Chart-Punkt
  const chartDataLeads: ChartDataPoint[] = filteredMetrics.map((m) => ({
    period: new Date(m.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
    value: m.leads,
  }));
  const chartDataSpend: ChartDataPoint[] = filteredMetrics.map((m) => ({
    period: new Date(m.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
    value: parseFloat(m.adSpend),
  }));
  const chartDataClicks: ChartDataPoint[] = filteredMetrics.map((m) => ({
    period: new Date(m.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
    value: m.clicks,
  }));
  const chartDataImpr: ChartDataPoint[] = filteredMetrics.map((m) => ({
    period: new Date(m.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
    value: m.impressions,
  }));

  // Summen im Zeitraum
  const totalLeads = filteredMetrics.reduce((acc, m) => acc + m.leads, 0);
  const totalSpend = filteredMetrics.reduce((acc, m) => acc + parseFloat(m.adSpend), 0);
  const totalClicks = filteredMetrics.reduce((acc, m) => acc + m.clicks, 0);
  const totalImpr = filteredMetrics.reduce((acc, m) => acc + m.impressions, 0);

  return (
    <div className="space-y-4">
      {/* Tabs (Daily / Weekly / Monthly / Total) */}
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
          data={chartDataLeads}
        />
        <MetricCard
          title="Ad Spend"
          value={formatCurrency(totalSpend)}
          weekTotal={formatCurrency(totalSpend)}
          icon={<DollarSign className="h-4 w-4" />}
          data={chartDataSpend}
          formatter={formatCurrency}
        />
        <MetricCard
          title="Clicks"
          value={formatNumber(totalClicks)}
          weekTotal={formatNumber(totalClicks)}
          icon={<MousePointer className="h-4 w-4" />}
          data={chartDataClicks}
        />
        <MetricCard
          title="Impressions"
          value={formatNumber(totalImpr)}
          weekTotal={formatNumber(totalImpr)}
          icon={<Eye className="h-4 w-4" />}
          data={chartDataImpr}
        />
      </div>
    </div>
  );
}
