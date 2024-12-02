import { useAuth } from "../../lib/auth.tsx";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  ActivitySquare,
  FileVideo,
  Settings,
  LogOut,
  ChevronRight,
  Bell,
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { logout } = useAuth();
  const [location, navigate] = useLocation();

  const menuItems = [
    {
      icon: <LayoutDashboard className="h-4 w-4" />,
      label: "Dashboard",
      path: "/admin",
    },
    {
      icon: <Users className="h-4 w-4" />,
      label: "Kundenliste",
      path: "/admin/customers",
    },
    {
      icon: <ActivitySquare className="h-4 w-4" />,
      label: "Kundentracking",
      path: "/admin/tracking",
    },
    {
      icon: <FileVideo className="h-4 w-4" />,
      label: "Content",
      path: "/admin/content",
    },
    {
      icon: <Settings className="h-4 w-4" />,
      label: "Einstellungen",
      path: "/admin/settings",
    },
  ];

  const { data: settings, error } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/admin/settings", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch settings");
        const data = await res.json();
        console.log("Admin Layout - Settings fetched:", data);
        return data;
      } catch (error) {
        console.error("Error fetching settings:", error);
        throw error;
      }
    },
    gcTime: 0,
    staleTime: 0,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className="fixed top-0 left-0 h-screen w-64 border-r bg-card/50 backdrop-blur">
        <div className="flex flex-col h-full">
          {/* Logo & Company Info */}
          <div className="p-6 border-b">
            {settings ? (
              <div className="flex flex-col space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt="Company Logo"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error("Logo loading error:", e);
                        e.currentTarget.src = "/fallback-logo.svg";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                      <span className="text-2xl font-semibold text-white">
                        {settings.companyName?.[0]}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <h1 className="text-lg font-semibold text-white">{settings.companyName}</h1>
                  <p className="text-sm text-muted-foreground">Adminportal</p>
                </div>
              </div>
            ) : (
              <div className="animate-pulse space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-muted"></div>
                <div className="space-y-2">
                  <div className="h-5 w-32 mx-auto bg-muted rounded"></div>
                  <div className="h-4 w-24 mx-auto bg-muted rounded"></div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3">
            {menuItems.map((item) => (
              <Button
                key={item.path}
                variant={location === item.path ? "secondary" : "ghost"}
                className={`w-full justify-between ${
                  location === item.path && "bg-secondary/50"
                }`}
                onClick={() => navigate(item.path)}
              >
                <span className="flex items-center">
                  {item.icon}
                  {item.label}
                </span>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </Button>
            ))}
          </nav>

          {/* Logout Button */}
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              className="w-full justify-between text-red-500 hover:text-red-500 hover:bg-red-500/10"
              onClick={logout}
            >
              <span className="flex items-center">
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </span>
              <ChevronRight className="h-4 w-4 opacity-50" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pl-64">
        <div className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-4 md:px-6">
            <div className="ml-auto flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  2
                </span>
              </Button>
            </div>
          </div>
        </div>
        <main className="container mx-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
