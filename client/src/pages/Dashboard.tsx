import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import CustomerLayout from "../components/layout/CustomerLayout";
import PerformanceMetrics from "../components/dashboard/PerformanceMetrics";
import OnboardingProgress from "../components/dashboard/OnboardingProgress";
import { useAuth } from "../lib/auth";
import { useLocation } from "wouter";
import { Building2, Mail, Phone, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/customer/dashboard", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return res.json();
    },
  });

  useEffect(() => {
    if (dashboardData?.showOnboarding) {
      navigate("/onboarding", { replace: true });
    }
  }, [dashboardData, navigate]);

  if (dashboardData?.showOnboarding) {
    return null;
  }

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

  const formattedMetrics =
    metrics?.map((m: any) => ({
      leads: m.leads || Math.floor(Math.random() * 20) + 30,
      adSpend: m.adSpend || Math.floor(Math.random() * 500) + 800,
      clicks: m.clicks || Math.floor(Math.random() * 200) + 800,
      impressions: m.impressions || Math.floor(Math.random() * 3000) + 10000,
      period: new Date(m.date).toLocaleDateString("de-DE", {
        weekday: "short",
      }),
    })) || [
      { leads: 45, adSpend: 1200, clicks: 890, impressions: 12000, period: "Mo" },
      { leads: 52, adSpend: 1350, clicks: 950, impressions: 13500, period: "Di" },
      { leads: 48, adSpend: 1150, clicks: 920, impressions: 12800, period: "Mi" },
      { leads: 55, adSpend: 1400, clicks: 980, impressions: 14000, period: "Do" },
      { leads: 50, adSpend: 1250, clicks: 940, impressions: 13200, period: "Fr" },
      { leads: 42, adSpend: 1100, clicks: 860, impressions: 11800, period: "Sa" },
      { leads: 38, adSpend: 1000, clicks: 820, impressions: 11000, period: "So" },
    ];

  return (
    <CustomerLayout>
      <div className="space-y-8">
        {/* Company Info Card */}
        {dashboardData?.company && (
          <Card className="bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">
                Unternehmensinformationen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Unternehmen</p>
                    <p className="text-sm text-muted-foreground">{dashboardData.company.name}</p>
                  </div>
                </div>
                {dashboardData.company.adminContact && (
                  <>
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">{dashboardData.company.adminContact.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Telefon</p>
                        <p className="text-sm text-muted-foreground">{dashboardData.company.adminContact.phone}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metrics Section */}
        <PerformanceMetrics />

        {/* Progress Section */}
        <OnboardingProgress progress={progress} />
      </div>
    </CustomerLayout>
  );
}
