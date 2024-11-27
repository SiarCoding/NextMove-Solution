import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus } from "lucide-react";

export default function Customers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newCompanyName, setNewCompanyName] = useState("");
  const [isAddingCompany, setIsAddingCompany] = useState(false);

  // Fetch customers
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/customers", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  // Fetch companies
  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await fetch("/api/admin/companies", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch companies");
      return res.json();
    },
  });

  // Create new company
  const createCompany = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create company");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({
        title: "Erfolg",
        description: "Unternehmen wurde erstellt",
      });
      setNewCompanyName("");
      setIsAddingCompany(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Unternehmen konnte nicht erstellt werden",
      });
    },
  });

  // Update customer company
  const updateCustomerCompany = useMutation({
    mutationFn: async ({
      customerId,
      companyId,
    }: {
      customerId: number;
      companyId: number;
    }) => {
      const res = await fetch(`/api/admin/customers/${customerId}/company`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ companyId }),
      });
      if (!res.ok) throw new Error("Failed to update customer company");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Erfolg",
        description: "Kundenunternehmen wurde aktualisiert",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Kundenunternehmen konnte nicht aktualisiert werden",
      });
    },
  });

  if (customersLoading || companiesLoading) {
    return (
      <AdminLayout>
        <div>Lädt...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Kundenverwaltung</h1>
          <Dialog open={isAddingCompany} onOpenChange={setIsAddingCompany}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Unternehmen hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neues Unternehmen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Name</label>
                  <Input
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Unternehmensname"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createCompany.mutate(newCompanyName)}
                  disabled={!newCompanyName || createCompany.isPending}
                >
                  {createCompany.isPending
                    ? "Wird erstellt..."
                    : "Unternehmen erstellen"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Unternehmen</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registriert am</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers?.map((customer: any) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    {customer.firstName} {customer.lastName}
                  </TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>
                    <Select
                      value={customer.companyId?.toString()}
                      onValueChange={(value) =>
                        updateCustomerCompany.mutate({
                          customerId: customer.id,
                          companyId: parseInt(value),
                        })
                      }
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue>
                          {customer.companyName || "Kein Unternehmen"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {companies?.map((company: any) => (
                          <SelectItem
                            key={company.id}
                            value={company.id.toString()}
                          >
                            <div className="flex items-center">
                              <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                              {company.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        customer.isApproved
                          ? "bg-green-500/10 text-green-500"
                          : "bg-yellow-500/10 text-yellow-500"
                      }`}
                    >
                      {customer.isApproved ? "Freigegeben" : "Ausstehend"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(customer.createdAt).toLocaleDateString("de-DE")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
