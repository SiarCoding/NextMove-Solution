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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Search, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  companyId: number | null;
  companyName?: string;
  isApproved: boolean;
  createdAt: string;
  profileImage?: string;
}

export default function Customers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newCompanyName, setNewCompanyName] = useState("");
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCompany, setFilterCompany] = useState<string>("all");
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Fetch customers
  const { data: customers, isLoading: customersLoading } = useQuery<Customer[]>({
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

  // Delete customer
  const deleteCustomer = useMutation({
    mutationFn: async (customerId: number) => {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete customer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Erfolg",
        description: "Kunde wurde gelöscht",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Kunde konnte nicht gelöscht werden",
      });
    },
  });

  const handleDeleteCustomer = async (customer: Customer) => {
    setCustomerToDelete(customer);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteCustomer.mutate(customerToDelete.id);
      setCustomerToDelete(null);
    }
  };

  // Filter and search customers
  const filteredCustomers = customers?.filter((customer: Customer) => {
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
      <div className="p-6">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold mb-2">Kunden</h1>
            <p className="text-muted-foreground">Verwalten Sie Ihre Kunden und deren Unternehmen</p>
          </div>

          <div className="flex justify-between items-center">
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suche nach Kunden..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Delete Confirmation Dialog */}
          <Dialog open={!!customerToDelete} onOpenChange={() => setCustomerToDelete(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Kunde löschen</DialogTitle>
                <DialogDescription className="pt-4">
                  Möchten Sie den Kunden <span className="font-medium">{customerToDelete?.firstName} {customerToDelete?.lastName}</span> wirklich löschen?
                  <br />
                  <br />
                  Diese Aktion kann nicht rückgängig gemacht werden. Alle Daten des Kunden werden permanent gelöscht.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setCustomerToDelete(null)}
                >
                  Abbrechen
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  disabled={deleteCustomer.isPending}
                >
                  {deleteCustomer.isPending ? "Wird gelöscht..." : "Endgültig löschen"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Unternehmen</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers?.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={customer.profileImage ? `${customer.profileImage}?t=${Date.now()}` : ''} 
                            alt={`${customer.firstName} ${customer.lastName}`}
                            className="object-cover"
                            loading="eager"
                          />
                          <AvatarFallback className="bg-primary/10">
                            <User className="h-4 w-4 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          {customer.firstName} {customer.lastName}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>
                      {customer.companyName || "Kein Unternehmen"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          customer.isApproved
                            ? "bg-green-600 text-white"
                            : "bg-yellow-500/90 text-white"
                        }`}
                      >
                        {customer.isApproved ? "Freigegeben" : "Ausstehend"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-red-100 hover:text-red-500 text-red-400"
                          onClick={() => {
                            setCustomerToDelete(customer);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!customersLoading && (!filteredCustomers || filteredCustomers.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Keine Kunden gefunden
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
