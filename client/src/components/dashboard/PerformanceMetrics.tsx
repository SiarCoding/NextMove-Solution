import React, { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Users, DollarSign, MousePointer, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { initFacebookSDK, connectToMetaAPI } from "@/lib/facebook-sdk";
import { MetaIcon } from "../icons/MetaIcon";

// Typdefinitionen
interface MetricDataPoint {
  leads: number;
  adSpend: number;
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

type TimeframeType = 'daily' | 'weekly' | 'monthly' | 'total';

interface ChartDataPoint {
  period: string;
  value: number;
}

const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
};

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

const MetricCard = ({ 
  title, 
  value, 
  weekTotal,
  icon, 
  chartType, 
  data,
  formatter = formatNumber 
}: MetricCardProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
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
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
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
};

// Leere Daten für den Initialzustand
const EMPTY_DATA: MetricsData = {
  daily: Array(7).fill({ leads: 0, adSpend: 0, clicks: 0, impressions: 0, period: "" }),
  weekly: Array(4).fill({ leads: 0, adSpend: 0, clicks: 0, impressions: 0, period: "" }),
  monthly: Array(12).fill({ leads: 0, adSpend: 0, clicks: 0, impressions: 0, period: "" }),
  total: Array(4).fill({ leads: 0, adSpend: 0, clicks: 0, impressions: 0, period: "" })
};

interface PerformanceMetricsProps {
  data?: MetricsData;
}

export default function PerformanceMetrics({ data = EMPTY_DATA }: PerformanceMetricsProps) {
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeType>('daily');

  useEffect(() => {
    initFacebookSDK().catch(console.error);
  }, []);

  const handleMetaConnect = async () => {
    try {
      setIsConnecting(true);
      await connectToMetaAPI();
      // Die UI wird automatisch durch den Page Reload in connectToMetaAPI aktualisiert
    } catch (error) {
      console.error('Failed to connect Meta:', error);
      // Hier können Sie einen Toast oder eine andere Fehlermeldung anzeigen
    } finally {
      setIsConnecting(false);
    }
  };

  const periodData = data[timeframe];
  
  const currentMetrics = {
    leads: periodData.reduce((sum: number, day: MetricDataPoint) => sum + day.leads, 0),
    adSpend: periodData.reduce((sum: number, day: MetricDataPoint) => sum + day.adSpend, 0),
    clicks: periodData.reduce((sum: number, day: MetricDataPoint) => sum + day.clicks, 0),
    impressions: periodData.reduce((sum: number, day: MetricDataPoint) => sum + day.impressions, 0)
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Tabs defaultValue="daily" className="w-[400px]">
          <TabsList>
            <TabsTrigger 
              value="daily" 
              onClick={() => setTimeframe('daily')}
            >
              Täglich
            </TabsTrigger>
            <TabsTrigger 
              value="weekly" 
              onClick={() => setTimeframe('weekly')}
            >
              Wöchentlich
            </TabsTrigger>
            <TabsTrigger 
              value="monthly" 
              onClick={() => setTimeframe('monthly')}
            >
              Monatlich
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Leads"
          value={formatNumber(currentMetrics.leads)}
          weekTotal={formatNumber(currentMetrics.leads)}
          icon={<Users className="h-4 w-4" />}
          chartType="area"
          data={periodData.map((d: MetricDataPoint): ChartDataPoint => ({ 
            period: d.period, 
            value: d.leads 
          }))}
        />
        <MetricCard
          title="Ad Spend"
          value={formatCurrency(currentMetrics.adSpend)}
          weekTotal={formatCurrency(currentMetrics.adSpend)}
          icon={<DollarSign className="h-4 w-4" />}
          chartType="area"
          data={periodData.map((d: MetricDataPoint): ChartDataPoint => ({ 
            period: d.period, 
            value: d.adSpend 
          }))}
          formatter={formatCurrency}
        />
        <MetricCard
          title="Clicks"
          value={formatNumber(currentMetrics.clicks)}
          weekTotal={formatNumber(currentMetrics.clicks)}
          icon={<MousePointer className="h-4 w-4" />}
          chartType="area"
          data={periodData.map((d: MetricDataPoint): ChartDataPoint => ({ 
            period: d.period, 
            value: d.clicks 
          }))}
        />
        <MetricCard
          title="Impressions"
          value={formatNumber(currentMetrics.impressions)}
          weekTotal={formatNumber(currentMetrics.impressions)}
          icon={<Eye className="h-4 w-4" />}
          chartType="area"
          data={periodData.map((d: MetricDataPoint): ChartDataPoint => ({ 
            period: d.period, 
            value: d.impressions 
          }))}
        />
      </div>
    </div>
  );
}
