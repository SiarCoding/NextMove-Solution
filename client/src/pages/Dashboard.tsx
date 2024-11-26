import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import CustomerLayout from "../components/layout/CustomerLayout";
import PerformanceMetrics from "../components/dashboard/PerformanceMetrics";
import OnboardingProgress from "../components/dashboard/OnboardingProgress";
import { useAuth } from "../lib/auth";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: metrics } = useQuery({
    queryKey: ["metrics", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/metrics/${user?.id}`);
      return res.json();
    },
    enabled: !!user,
  });

  const { data: progress } = useQuery({
    queryKey: ["progress", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/progress/${user?.id}`);
      return res.json();
    },
    enabled: !!user,
  });

  const formattedMetrics = metrics?.map((m: any) => ({
    leads: m.leads,
    adSpend: m.adSpend,
    clicks: m.clicks,
    impressions: m.impressions,
    period: new Date(m.date).toLocaleDateString("de-DE", { weekday: "short" }),
  })) || [];

  return (
    <CustomerLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">
            Willkommen im Kundenportal, {user?.firstName}
          </h1>
          <p className="text-muted-foreground">
            Hier finden Sie Ihre wichtigsten Metriken und Fortschritte
          </p>
        </div>

        <PerformanceMetrics
          data={formattedMetrics}
          period="daily"
        />

        <OnboardingProgress progress={progress} />
      </div>
    </CustomerLayout>
  );
}
