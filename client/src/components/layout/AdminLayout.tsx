import { useAuth } from "../../lib/auth.tsx";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
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
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
      label: "Dashboard",
      path: "/admin",
    },
    {
      icon: <Users className="mr-2 h-4 w-4" />,
      label: "Benutzerfreigabe",
      path: "/admin/users",
    },
    {
      icon: <FileVideo className="mr-2 h-4 w-4" />,
      label: "Content",
      path: "/admin/content",
    },
    {
      icon: <Settings className="mr-2 h-4 w-4" />,
      label: "Einstellungen",
      path: "/admin/settings",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-card border-r">
          <div className="p-4">
            <h1 className="text-xl font-bold text-primary">Admin Portal</h1>
            <p className="text-sm text-muted-foreground">Verwaltung</p>
          </div>

          <nav className="space-y-1 p-2">
            {menuItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => navigate(item.path)}
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </nav>

          <div className="absolute bottom-4 left-4 right-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Abmelden
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
