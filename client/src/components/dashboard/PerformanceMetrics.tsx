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
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

// Kleiner Datentyp für die AdAccounts:
interface AdAccount {
  account_id: string;
  name: string;
  // ggf. mehr Felder, falls gebraucht
}

// Typen für die "metrischen" Daten
interface DBMetric {
  leads: number;
  adSpend: string; // decimal in DB => string
  clicks: number;
  impressions: number;
  date: string; // Zeitstring
}

type ChartDataPoint = {
  period: string;
  value: number;
};

// Example-Funktionen zum Formatieren
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

export default function PerformanceMetrics() {
  const { user } = useAuth();
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [dbMetrics, setDbMetrics] = useState<DBMetric[]>([]);

  // ----------------------------
  // 1) AdAccounts laden
  // ----------------------------
  useEffect(() => {
    if (!user) return;
    // /api/meta/adaccounts
    fetch("/api/meta/adaccounts", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        // Falls hier ein {error: "..."} kommt => abfangen
        if (Array.isArray(data)) {
          setAdAccounts(data);
        } else {
          console.warn("No ad accounts found or error:", data);
        }
      })
      .catch((err) => console.error("Failed to load adaccounts:", err));
  }, [user]);

  // ----------------------------
  // 2) DB-Metrics laden
  // ----------------------------
  function loadMetrics() {
    if (!user) return;
    fetch(`/api/metrics/${user.id}`, { credentials: "include" })
      .then((res) => res.json())
      .then((metrics: DBMetric[]) => {
        // Speichern im State
        setDbMetrics(metrics);
      })
      .catch((err) => console.error("Failed to load metrics:", err));
  }

  // Sofort beim Mount einmal laden
  useEffect(() => {
    loadMetrics();
  }, [user]);

  // ----------------------------
  // 3) Insights für gewähltes Konto holen
  // ----------------------------
  const handleFetchInsights = async () => {
    if (!selectedAccount) {
      alert("Bitte ein Werbekonto auswählen");
      return;
    }

    try {
      const res = await fetch("/api/meta/fetch-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ adAccountId: selectedAccount }), // e.g. "123456789"
      });

      const json = await res.json();
      if (!res.ok) {
        console.error("Error fetching insights:", json);
        alert(json.error || "Fehler beim Abrufen der Insights");
        return;
      }

      // Erfolg => metrics neu laden
      loadMetrics();
    } catch (error) {
      console.error("Failed to fetch insights:", error);
    }
  };

  // ----------------------------
  // 4) Chart-Daten vorbereiten
  // ----------------------------
  // (Beispiel: Zeige einfach alle Einträge als daily)
  const chartDataLeads: ChartDataPoint[] = dbMetrics.map((m) => ({
    period: new Date(m.date).toLocaleDateString("de-DE", { weekday: "short" }),
    value: m.leads,
  }));
  const chartDataSpend: ChartDataPoint[] = dbMetrics.map((m) => ({
    period: new Date(m.date).toLocaleDateString("de-DE", { weekday: "short" }),
    value: parseFloat(m.adSpend),
  }));
  const chartDataClicks: ChartDataPoint[] = dbMetrics.map((m) => ({
    period: new Date(m.date).toLocaleDateString("de-DE", { weekday: "short" }),
    value: m.clicks,
  }));
  const chartDataImpr: ChartDataPoint[] = dbMetrics.map((m) => ({
    period: new Date(m.date).toLocaleDateString("de-DE", { weekday: "short" }),
    value: m.impressions,
  }));

  // Summen (z.B. "Aktuelle Woche")
  const totalLeads = dbMetrics.reduce((acc, m) => acc + m.leads, 0);
  const totalSpend = dbMetrics.reduce(
    (acc, m) => acc + parseFloat(m.adSpend),
    0
  );
  const totalClicks = dbMetrics.reduce((acc, m) => acc + m.clicks, 0);
  const totalImpr = dbMetrics.reduce((acc, m) => acc + m.impressions, 0);

  return (
    <div className="space-y-4">
      {/* 1) Werbekonto-Auswahl */}
      <Card>
        <CardContent>
          <label htmlFor="adAccountSelect" className="font-semibold mr-2">
            Wähle ein Ad-Konto:
          </label>
          <select
            id="adAccountSelect"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="border p-1"
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
        </CardContent>
      </Card>

      {/* 2) Charts */}
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
