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
import { Building2, Plus, Search } from "lucide-react";

export default function Customers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newCompanyName, setNewCompanyName] = useState("");
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCompany, setFilterCompany] = useState<string>("all");

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

  // Filter and search customers
  const filteredCustomers = customers?.filter((customer: any) => {
    const matchesSearch = searchTerm
      ? `${customer.firstName} ${customer.lastName} ${customer.email}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      : true;

    const matchesCompany =
      filterCompany === "all" ||
      (filterCompany === "none" && !customer.companyId) ||
      customer.companyId?.toString() === filterCompany;

    return matchesSearch && matchesCompany;
  });

  if (customersLoading || companiesLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Kundenverwaltung</h1>
          </div>
          <div className="bg-card rounded-lg border shadow-sm p-8">
            <div className="flex items-center justify-center">
              <div className="space-y-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Lade Kundendaten...</p>
              </div>
            </div>
          </div>
        </div>
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

        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Kunden suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filterCompany}
              onValueChange={setFilterCompany}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Nach Unternehmen filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Unternehmen</SelectItem>
                <SelectItem value="none">Ohne Unternehmen</SelectItem>
                {companies?.map((company: any) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                {filteredCustomers?.map((customer: any) => (
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
                {filteredCustomers?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className="text-muted-foreground">
                        Keine Kunden gefunden
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
