import React, { useState, useEffect } from 'react';
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
  Cell
} from 'recharts';
import { Users, DollarSign, MousePointer, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { initFacebookSDK, loginWithFacebook } from "@/lib/facebook-sdk";

// ... (rest of the code remains the same)

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
  data: any[];
  formatter?: (value: number) => string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  weekTotal,
  icon, 
  chartType, 
  data,
  formatter = formatNumber 
}) => {
  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 5, left: 5, bottom: 5 }
    };

    const commonAxisProps = {
      stroke: "hsl(var(--muted-foreground))",
      fontSize: 12,
      tickLine: false,
      axisLine: false
    };

    const tooltipStyle = {
      contentStyle: {
        backgroundColor: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "var(--radius)",
        color: "hsl(var(--foreground))"
      }
    };

    if (chartType === 'pie') {
      const pieData = data.map(d => ({
        name: d.period,
        value: d.value,
        percentage: ((d.value / data.reduce((acc: number, curr: any) => acc + curr.value, 0)) * 100).toFixed(1)
      }));

      return (
        <ResponsiveContainer {...commonProps}>
          <PieChart>
            <Pie
              data={pieData}
              innerRadius={35}
              outerRadius={50}
              paddingAngle={2}
              dataKey="value"
              stroke="hsl(var(--background))"
              strokeWidth={2}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              {...tooltipStyle}
              formatter={(value: any, name: any, props: any) => [
                `${formatter(value)} (${props.payload.percentage}%)`,
                name
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer {...commonProps}>
        <AreaChart data={data}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--border))" 
            vertical={false} 
          />
          <XAxis 
            dataKey="period" 
            {...commonAxisProps}
          />
          <YAxis 
            {...commonAxisProps}
            width={30}
          />
          <Tooltip {...tooltipStyle} formatter={formatter} />
          <defs>
            <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="hsl(var(--primary))"
            fill="url(#colorPrimary)"
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
          <p className="text-xs text-muted-foreground">Diese Woche: {weekTotal}</p>
        </div>
        <div className="p-2 bg-primary/10 rounded-xl">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">Heute</div>
        </div>
        <div className="h-[120px] mt-4">
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
};

interface PerformanceMetricsProps {
  data?: typeof TEST_DATA;
}

// Leere Daten für den Initialzustand
const EMPTY_DATA = {
  daily: Array(7).fill({ leads: 0, adSpend: 0, clicks: 0, impressions: 0, period: "" }),
  weekly: Array(4).fill({ leads: 0, adSpend: 0, clicks: 0, impressions: 0, period: "" }),
  monthly: Array(12).fill({ leads: 0, adSpend: 0, clicks: 0, impressions: 0, period: "" }),
  total: Array(1).fill({ leads: 0, adSpend: 0, clicks: 0, impressions: 0, period: "Gesamt" })
};

// Testdaten für verschiedene Zeiträume
const TEST_DATA = {
  daily: [
    { leads: 24, adSpend: 800, clicks: 520, impressions: 8000, period: "Mo" },
    { leads: 35, adSpend: 900, clicks: 620, impressions: 9500, period: "Di" },
    { leads: 30, adSpend: 850, clicks: 590, impressions: 9000, period: "Mi" },
    { leads: 40, adSpend: 1100, clicks: 780, impressions: 11500, period: "Do" },
    { leads: 45, adSpend: 1200, clicks: 850, impressions: 12000, period: "Fr" },
    { leads: 32, adSpend: 950, clicks: 680, impressions: 10000, period: "Sa" },
    { leads: 38, adSpend: 1000, clicks: 820, impressions: 11000, period: "So" },
  ],
  weekly: [
    { leads: 244, adSpend: 6800, clicks: 4880, impressions: 71000, period: "KW1" },
    { leads: 255, adSpend: 7000, clicks: 5020, impressions: 73500, period: "KW2" },
    { leads: 230, adSpend: 6500, clicks: 4590, impressions: 69000, period: "KW3" },
    { leads: 280, adSpend: 7500, clicks: 5580, impressions: 81500, period: "KW4" },
  ],
  monthly: [
    { leads: 980, adSpend: 27000, clicks: 19520, impressions: 284000, period: "Jan" },
    { leads: 1020, adSpend: 28000, clicks: 20080, impressions: 294000, period: "Feb" },
    { leads: 920, adSpend: 26000, clicks: 18360, impressions: 276000, period: "Mär" },
    { leads: 1120, adSpend: 30000, clicks: 22320, impressions: 326000, period: "Apr" },
  ],
  total: [
    { leads: 4040, adSpend: 111000, clicks: 80280, impressions: 1180000, period: "Q1" },
    { leads: 4080, adSpend: 112000, clicks: 80320, impressions: 1176000, period: "Q2" },
    { leads: 3680, adSpend: 104000, clicks: 73440, impressions: 1104000, period: "Q3" },
    { leads: 4480, adSpend: 120000, clicks: 89280, impressions: 1304000, period: "Q4" },
  ]
};

export default function PerformanceMetrics({ data = EMPTY_DATA }: PerformanceMetricsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isConnectingMeta, setIsConnectingMeta] = useState(false);
  const [metaConnected, setMetaConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Prüfe ob Meta bereits verbunden ist
    const checkMetaConnection = async () => {
      try {
        const response = await fetch('/api/meta/status');
        const { connected } = await response.json();
        setMetaConnected(connected);
      } catch (error) {
        console.error('Error checking Meta connection:', error);
      }
    };

    checkMetaConnection();
  }, []);

  const handleMetaConnect = async () => {
    try {
      setIsConnectingMeta(true);
      await initFacebookSDK();
      const accessToken = await loginWithFacebook();
      
      const response = await fetch('/api/meta/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken })
      });

      if (!response.ok) {
        throw new Error('Failed to connect Meta account');
      }

      setMetaConnected(true);
      // Hier könnten wir die Daten neu laden
    } catch (error) {
      console.error('Error connecting Meta account:', error);
    } finally {
      setIsConnectingMeta(false);
    }
  };

  const periodData = data[selectedPeriod] || EMPTY_DATA[selectedPeriod];
  
  const currentMetrics = {
    leads: periodData.reduce((sum, day) => sum + day.leads, 0),
    adSpend: periodData.reduce((sum, day) => sum + day.adSpend, 0),
    clicks: periodData.reduce((sum, day) => sum + day.clicks, 0),
    impressions: periodData.reduce((sum, day) => sum + day.impressions, 0)
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Tabs defaultValue="daily" className="w-[400px]">
          <TabsList>
            <TabsTrigger 
              value="daily" 
              onClick={() => setSelectedPeriod('daily')}
            >
              Täglich
            </TabsTrigger>
            <TabsTrigger 
              value="weekly" 
              onClick={() => setSelectedPeriod('weekly')}
            >
              Wöchentlich
            </TabsTrigger>
            <TabsTrigger 
              value="monthly" 
              onClick={() => setSelectedPeriod('monthly')}
            >
              Monatlich
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {!metaConnected && (
          <Button 
            onClick={handleMetaConnect} 
            disabled={isConnectingMeta}
          >
            {isConnectingMeta ? 'Verbinde...' : 'Mit Meta Ads verbinden'}
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Leads"
          value={currentMetrics.leads}
          weekTotal={currentMetrics.leads}
          icon={<Users className="h-4 w-4" />}
          chartType="area"
          data={periodData.map(d => ({ period: d.period, value: d.leads }))}
        />
        <MetricCard
          title="Werbeausgaben"
          value={formatCurrency(currentMetrics.adSpend)}
          weekTotal={formatCurrency(currentMetrics.adSpend)}
          icon={<DollarSign className="h-4 w-4" />}
          chartType="area"
          data={periodData.map(d => ({ period: d.period, value: d.adSpend }))}
          formatter={formatCurrency}
        />
        <MetricCard
          title="Klicks"
          value={currentMetrics.clicks}
          weekTotal={currentMetrics.clicks}
          icon={<MousePointer className="h-4 w-4" />}
          chartType="area"
          data={periodData.map(d => ({ period: d.period, value: d.clicks }))}
        />
        <MetricCard
          title="Impressionen"
          value={currentMetrics.impressions}
          weekTotal={currentMetrics.impressions}
          icon={<Eye className="h-4 w-4" />}
          chartType="pie"
          data={periodData.map(d => ({ period: d.period, value: d.impressions }))}
        />
      </div>
    </div>
  );
}
