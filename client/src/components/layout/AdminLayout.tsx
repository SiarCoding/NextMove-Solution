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
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { logout } = useAuth();
  const [, navigate] = useLocation();

  const menuItems = [
    {
      icon: <LayoutDashboard className="h-4 w-4" />,
      label: "Dashboard",
      path: "/admin"
    },
    {
      icon: <Users className="h-4 w-4" />,
      label: "Kundenliste",
      path: "/admin/customers"
    },
    {
      icon: <ActivitySquare className="h-4 w-4" />,
      label: "Kundentracking",
      path: "/admin/tracking"
    },
    {
      icon: <FileVideo className="h-4 w-4" />,
      label: "Content",
      path: "/admin/content"
    },
    {
      icon: <Settings className="h-4 w-4" />,
      label: "Einstellungen",
      path: "/admin/settings"
    }
  ];

  const { data: settings, error } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/admin/settings", {
          credentials: 'include'
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
    staleTime: 0
  });

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-[#1a1b1e] border-r border-border">
        {/* Logo & Titel */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
              {settings?.logoUrl ? (
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
                <Settings className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-primary">
                {settings?.companyName || "Admin Portal"}
              </h1>
              <p className="text-sm text-muted-foreground">Adminportal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              className="w-full justify-start hover:bg-primary/10 hover:text-primary transition-colors"
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              <span className="ml-2">{item.label}</span>
            </Button>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-4 left-4 right-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            <span className="ml-2">Abmelden</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
