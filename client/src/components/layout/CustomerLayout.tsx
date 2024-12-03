import { useAuth } from "../../lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  PlayCircle,
  Headphones,
  Settings,
  Users,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { Navbar } from "./Navbar";
import { cn } from "@/lib/utils";

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();

  const menuItems = [
    {
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
      label: "Dashboard",
      path: "/dashboard",
    },
    {
      icon: <PlayCircle className="mr-2 h-4 w-4" />,
      label: "Tutorials",
      path: "/tutorials",
    },
    {
      icon: <Headphones className="mr-2 h-4 w-4" />,
      label: "Support",
      path: "/support",
    },
    {
      icon: <Settings className="mr-2 h-4 w-4" />,
      label: "Einstellungen",
      path: "/settings",
    },
    {
      icon: <Users className="mr-2 h-4 w-4" />,
      label: "Partnerprogramm",
      path: "/partner",
    },
  ];

  const { data: adminUser } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/customer/admin-info", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch admin settings");
        const data = await res.json();
        console.log("Customer Layout - Admin settings fetched:", data);
        return data;
      } catch (error) {
        console.error("Error fetching admin settings:", error);
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
          <div className="p-6 border-b">
            {adminUser ? (
              <div className="flex flex-col space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                  {adminUser.logoUrl ? (
                    <img
                      src={adminUser.logoUrl}
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
                        {adminUser.companyName?.[0]}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <h1 className="text-lg font-semibold text-white">{adminUser.companyName}</h1>
                  <p className="text-sm text-muted-foreground">{adminUser.email}</p>
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

          <nav className="flex-1 space-y-1 p-3">
            {menuItems.map((item) => (
              <Button
                key={item.path}
                variant={location === item.path ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-between hover:text-white hover:bg-primary/10 transition-colors",
                  location === item.path && "bg-primary/20 text-white hover:bg-primary/20 hover:text-white"
                )}
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
              className="w-full justify-between text-primary hover:text-red-500 hover:bg-primary-500/10"
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
        <Navbar />
        <main className="container mx-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
