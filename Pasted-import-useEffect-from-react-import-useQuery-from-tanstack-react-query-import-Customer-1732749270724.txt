import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import CustomerLayout from "../components/layout/CustomerLayout";
import PerformanceMetrics from "../components/dashboard/PerformanceMetrics";
import OnboardingProgress from "../components/dashboard/OnboardingProgress";
import { useAuth } from "../lib/auth";
import OnboardingWizard from "../components/onboarding/OnboardingWizard";
import { Building2, Mail, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/customer/dashboard", {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return res.json();
    },
  });

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

  if (dashboardData?.showOnboarding) {
    return <OnboardingWizard />;
  }

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

        {dashboardData?.company && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Unternehmensinformationen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span>{dashboardData.company.name}</span>
                </div>
                {dashboardData.company.adminContact && (
                  <>
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{dashboardData.company.adminContact.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{dashboardData.company.adminContact.phone}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <PerformanceMetrics
          data={formattedMetrics}
          period="daily"
        />

        <OnboardingProgress progress={progress} />
      </div>
    </CustomerLayout>
  );
}
