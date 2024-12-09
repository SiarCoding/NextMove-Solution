import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "../../components/layout/AdminLayout";
import { RequireAdmin } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Users, UserCheck, Video, PhoneCall, Building2, Mail, Calendar } from "lucide-react";

// Define the PendingUser type
interface PendingUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  companyId: number | null;
  createdAt: Date;
  companyName?: string;
}

function AdminDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) {
        throw new Error("Failed to fetch stats");
      }
      return res.json();
    },
  });

  const { data: pendingCallbacks, isLoading: callbacksLoading } = useQuery({
    queryKey: ["pending-callbacks"],
    queryFn: async () => {
      const res = await fetch("/api/callbacks/pending");
      if (!res.ok) {
        throw new Error("Failed to fetch callbacks");
      }
      return res.json();
    },
  });

  const queryClient = useQueryClient();

  const { data: pendingUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["pending-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users/pending");
      if (!res.ok) {
        throw new Error("Failed to fetch pending users");
      }
      return res.json() as Promise<PendingUser[]>;
    }
  });

  const approveUser = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: "PATCH",
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Failed to approve user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({
        title: "Erfolg",
        description: "Benutzer wurde freigegeben"
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Benutzer konnte nicht freigegeben werden"
      });
    }
  });

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Übersicht aller wichtigen Informationen</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Ausstehende Freigaben
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pendingApprovals || 0}</div>
                <Button
                  variant="link"
                  className="p-0"
                  onClick={() => navigate("/admin/users")}
                >
                  Freigaben verwalten
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Aktive Kunden
                </CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.activeUsers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Aktiv in den letzten 24h
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Tutorials
                </CardTitle>
                <Video className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalTutorials || 0}</div>
                <Button
                  variant="link"
                  className="p-0"
                  onClick={() => navigate("/admin/content")}
                >
                  Content verwalten
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Offene Rückrufe
                </CardTitle>
                <PhoneCall className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.pendingCallbacks || 0}
                </div>
                <Button
                  variant="link"
                  className="p-0"
                  onClick={() => navigate("/admin/callbacks")}
                >
                  Rückrufe verwalten
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Ausstehende Freigaben</h2>
            <div className="bg-card rounded-lg border shadow-sm">
              {pendingUsers?.map((user: PendingUser) => (
                <div key={user.id} className="p-4 border-b last:border-b-0">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Button 
                      onClick={() => approveUser.mutate(user.id)}
                      disabled={approveUser.isPending}
                    >
                      Freigeben
                    </Button>
                  </div>
                  {user.companyId && (
                    <div className="mt-2 grid gap-4 md:grid-cols-3 bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Unternehmen</p>
                          <p className="text-sm text-muted-foreground">{user.companyName}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Geschäftlich</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Registriert</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {pendingUsers?.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Keine ausstehenden Freigaben
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// Wrap the dashboard with RequireAdmin
export default function ProtectedAdminDashboard() {
  return (
    <RequireAdmin>
      <AdminDashboard />
    </RequireAdmin>
  );
}
