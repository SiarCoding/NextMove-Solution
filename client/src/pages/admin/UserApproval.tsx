import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "../../components/layout/AdminLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, X } from "lucide-react";

export default function UserApproval() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingUsers, isLoading } = useQuery({
    queryKey: ["pending-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users/pending", {
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Failed to fetch pending users");
      }
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: "POST",
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Failed to approve user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-users"] });
      toast({
        title: "Erfolg",
        description: "Benutzer wurde freigegeben",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Benutzer konnte nicht freigegeben werden",
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/admin/users/${userId}/reject`, {
        method: "POST",
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Failed to reject user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-users"] });
      toast({
        title: "Erfolg",
        description: "Benutzer wurde abgelehnt",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Benutzer konnte nicht abgelehnt werden",
      });
    }
  });

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Benutzerfreigabe</h1>
          <p className="text-muted-foreground">
            Verwalten Sie neue Benutzeranfragen
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Firma</TableHead>
              <TableHead>Registrierungsdatum</TableHead>
              <TableHead>Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Lade...
                </TableCell>
              </TableRow>
            ) : pendingUsers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Keine ausstehenden Freigaben
                </TableCell>
              </TableRow>
            ) : (
              pendingUsers?.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell>
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.companyName}</TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString("de-DE")}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => approveMutation.mutate(user.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => rejectMutation.mutate(user.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
