import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, DollarSign, MousePointer, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";

// --------------------------------------
// Datentyp, den wir vom Endpoint erhalten
// --------------------------------------
interface MetaDayInsights {
  date: string;         // z.B. "2025-01-10"
  leads: number;
  adSpend: string;      // decimal as string
  clicks: number;
  impressions: number;
}

// Für den Chart
interface ChartData {
  period: string; // z. B. "10.01."
  value: number;
}

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

// --------------------------------------
// MetricCard – kann AreaChart oder PieChart sein
// --------------------------------------
interface MetricCardProps {
  title: string;
  value: string | number;
  secondaryValue: string | number; // z. B. "+42 diese Woche"
  icon: React.ReactNode;
  chartType: "area" | "pie";
  data: ChartData[];
  formatter?: (value: number) => string;
}

function MetricCard({
  title,
  value,
  secondaryValue,
  icon,
  chartType,
  data,
  formatter = formatNumber,
}: MetricCardProps) {
  // Rendert je nach "chartType" das Diagramm
  const renderChart = () => {
    if (chartType === "pie") {
      // Pie-Daten
      const totalSum = data.reduce((sum, d) => sum + d.value, 0);
      const pieData = data.map((d) => ({
        ...d,
        percentage: totalSum === 0 ? 0 : (d.value / totalSum) * 100,
      }));

      return (
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="period"
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={50}
              stroke="hsl(var(--background))"
              strokeWidth={2}
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(val: number, name: string, props: any) => {
                const pct = props.payload.percentage.toFixed(1);
                return [`${formatter(val)} (${pct}%)`, `${name}`];
              }}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
                color: "hsl(var(--foreground))",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    // default = "area" chart
    return (
      <ResponsiveContainer>
        <AreaChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="period"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <Tooltip
            formatter={(val: any) => formatter(val)}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
              color: "hsl(var(--foreground))",
            }}
          />
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0.2}
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
            fill="url(#colorValue)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {secondaryValue} in diesem Zeitraum
          </p>
        </div>
        <div className="p-2 bg-primary/10 rounded-xl">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="h-[120px] mt-4">{renderChart()}</div>
      </CardContent>
    </Card>
  );
}

// --------------------------------------
// Die Hauptkomponente
// --------------------------------------
type Timeframe = "daily" | "weekly" | "monthly" | "total";

export default function PerformanceMetrics() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>("weekly");
  const [insights, setInsights] = useState<MetaDayInsights[]>([]);

  // Jedes Mal, wenn timeframe sich ändert, laden wir neu:
  useEffect(() => {
    if (!user) return;
    fetch(`/api/meta/fetch-insights?timeframe=${timeframe}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data: MetaDayInsights[]) => {
        setInsights(data || []);
      })
      .catch((err) => console.error("Failed to fetch insights:", err));
  }, [user, timeframe]);

  // Summen
  const totalLeads = insights.reduce((sum, d) => sum + d.leads, 0);
  const totalSpend = insights.reduce((sum, d) => sum + parseFloat(d.adSpend), 0);
  const totalClicks = insights.reduce((sum, d) => sum + d.clicks, 0);
  const totalImpressions = insights.reduce((sum, d) => sum + d.impressions, 0);

  // Chart-Daten: 
  // => Wir wandeln date => "DD.MM." z. B.
  const leadsData: ChartData[] = insights.map((d) => ({
    period: new Date(d.date).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    }),
    value: d.leads,
  }));
  const spendData: ChartData[] = insights.map((d) => ({
    period: new Date(d.date).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    }),
    value: parseFloat(d.adSpend),
  }));
  const clicksData: ChartData[] = insights.map((d) => ({
    period: new Date(d.date).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    }),
    value: d.clicks,
  }));
  const impressionsData: ChartData[] = insights.map((d) => ({
    period: new Date(d.date).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    }),
    value: d.impressions,
  }));

  return (
    <div className="space-y-4">
      {/* Tabs zum Umschalten */}
      <Tabs defaultValue="weekly" onValueChange={(val) => setTimeframe(val as Timeframe)}>
        <TabsList>
          <TabsTrigger value="daily">Täglich</TabsTrigger>
          <TabsTrigger value="weekly">Wöchentlich</TabsTrigger>
          <TabsTrigger value="monthly">Monatlich</TabsTrigger>
          <TabsTrigger value="total">Gesamt</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Leads"
          value={formatNumber(totalLeads)}
          secondaryValue={formatNumber(totalLeads)}
          icon={<Users className="h-4 w-4" />}
          chartType="area"
          data={leadsData}
        />
        <MetricCard
          title="Ad Spend"
          value={formatCurrency(totalSpend)}
          secondaryValue={formatCurrency(totalSpend)}
          icon={<DollarSign className="h-4 w-4" />}
          chartType="area"
          data={spendData}
          formatter={formatCurrency}
        />
        <MetricCard
          title="Clicks"
          value={formatNumber(totalClicks)}
          secondaryValue={formatNumber(totalClicks)}
          icon={<MousePointer className="h-4 w-4" />}
          chartType="area"
          data={clicksData}
        />
        <MetricCard
          title="Impressions"
          value={formatNumber(totalImpressions)}
          secondaryValue={formatNumber(totalImpressions)}
          icon={<Eye className="h-4 w-4" />}
          chartType="pie"
          data={impressionsData}
        />
      </div>
    </div>
  );
}
