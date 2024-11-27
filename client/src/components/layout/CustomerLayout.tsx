import { useAuth } from "../../lib/auth.tsx";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  PlayCircle,
  Headphones,
  Settings,
  Users,
  LogOut,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");

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

  const requestCallback = async () => {
    try {
      const res = await fetch("/api/callbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, phone }),
      });

      if (!res.ok) throw new Error();

      toast({
        title: "Erfolg",
        description: "Rückruf wurde angefordert",
      });
      setPhone("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Rückruf konnte nicht angefordert werden",
      });
    }
  };

  const { data: adminUser } = useQuery({
    queryKey: ["admin-user"],
    queryFn: async () => {
      const res = await fetch("/api/admin/profile", {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed to fetch admin profile");
      return res.json();
    },
    gcTime: 0,
    staleTime: 0
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-card border-r">
          <div className="p-4 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
              {adminUser?.profileImage ? (
                <img
                  src={adminUser.profileImage}
                  alt="Company Logo"
                  className="w-full h-full object-cover rounded-full"
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
              <h1 className="text-xl font-bold text-primary">
                {adminUser?.companyName || "Kundenportal"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {adminUser?.companyName}
              </p>
            </div>
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

          <div className="absolute bottom-4 left-4 right-4 space-y-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full">
                  Rückruf vereinbaren
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rückruf anfordern</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder="Ihre Telefonnummer"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    onClick={requestCallback}
                  >
                    Rückruf anfordern
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

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
