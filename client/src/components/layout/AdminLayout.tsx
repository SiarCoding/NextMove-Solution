import { useAuth } from "../../lib/auth.tsx";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ActivitySquare,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  Phone,
  Users,
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { logout } = useAuth();
  const [location, setLocation] = useLocation();

  const menuItems = [
    {
      label: "Dashboard",
      path: "/admin",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      label: "Kunden",
      path: "/admin/customers",
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: "Kundentracking",
      path: "/admin/tracking",
      icon: <ActivitySquare className="h-4 w-4" />,
    },
    {
      label: "CMS für Kunden",
      path: "/admin/content",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      label: "Rückrufe",
      path: "/admin/callbacks",
      icon: <Phone className="h-4 w-4" />,
    },
    {
      label: "Einstellungen",
      path: "/admin/settings",
      icon: <Settings className="h-4 w-4" />,
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
    <div className="flex bg-background">
      {/* Sidebar - Fixed */}
      <aside className="w-64 border-r bg-card fixed top-0 left-0 h-screen">
        <div className="flex flex-col h-full">
          {/* Logo & Company Info */}
          <div className="p-6 border-b">
            {settings ? (
              <div className="flex flex-col space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
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
                <div className="text-center space-y-1">
                  <h1 className="text-base font-semibold text-white">{settings.companyName}</h1>
                  <p className="text-sm text-muted-foreground">Adminportal</p>
                </div>
              </div>
            ) : (
              <div className="animate-pulse space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted"></div>
                <div className="space-y-2">
                  <div className="h-5 w-32 mx-auto bg-muted rounded"></div>
                  <div className="h-4 w-24 mx-auto bg-muted rounded"></div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {menuItems.map((item) => (
                <Button
                  key={item.path}
                  variant={location === item.path ? "secondary" : "ghost"}
                  className={`w-full justify-start px-4 py-3 ${
                    location === item.path ? "bg-secondary/50" : ""
                  }`}
                  onClick={() => setLocation(item.path)}
                >
                  <div className="flex items-center w-full">
                    <div className="flex items-center flex-1">
                      <span className="flex items-center justify-center w-6">
                        {item.icon}
                      </span>
                      <span className="ml-3 text-sm">{item.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </div>
                </Button>
              ))}
            </div>
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start px-4 py-3 text-red-500 hover:text-red-500 hover:bg-red-500/10"
              onClick={logout}
            >
              <div className="flex items-center w-full">
                <div className="flex items-center flex-1">
                  <span className="flex items-center justify-center w-6">
                    <LogOut className="h-4 w-4" />
                  </span>
                  <span className="ml-3 text-sm">Abmelden</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </div>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content - Scrollable with offset for fixed sidebar */}
      <main className="flex-1 ml-64 min-h-screen w-full">
        {children}
      </main>
    </div>
  );
}
