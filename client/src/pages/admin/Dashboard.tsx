import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "../../components/layout/AdminLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Users, UserCheck, Video, PhoneCall } from "lucide-react";

export default function AdminDashboard() {
  const [, navigate] = useLocation();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      return res.json();
    },
  });

  const { data: pendingCallbacks } = useQuery({
    queryKey: ["pending-callbacks"],
    queryFn: async () => {
      const res = await fetch("/api/callbacks/pending");
      return res.json();
    },
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: pendingUsers } = useQuery({
    queryKey: ["pending-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users/pending");
      if (!res.ok) throw new Error("Failed to fetch pending users");
      return res.json();
    }
  });

  const approveUser = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: "POST",
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to approve user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({
        title: "Erfolg",
        description: "Benutzer wurde freigegeben"
      });
    }
  });

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Übersicht aller wichtigen Kennzahlen
          </p>
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
                Letzte 24 Stunden
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
                {pendingCallbacks?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Unbearbeitete Anfragen
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Ausstehende Freigaben</h2>
          <div className="bg-card rounded-lg border shadow-sm">
            {pendingUsers?.map((user) => (
              <div key={user.id} className="p-4 border-b last:border-b-0 flex justify-between items-center">
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
            ))}
            {pendingUsers?.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground text-center">
                Keine ausstehenden Freigaben
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
