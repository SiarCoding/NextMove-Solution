import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from 'axios';
import AdminLayout from "../../components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import OnboardingProgress, { defaultSteps } from "@/components/dashboard/OnboardingProgress";
import { Card } from "@/components/ui/card";

interface CustomerData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  completedPhases: string[];
  currentPhase: string;
  progress: number;
  lastActive: string;
  onboardingCompleted: boolean;
  checklistData?: {
    paymentOption: string;
    taxId: string;
    domain: string;
    targetAudience: string;
    companyInfo: string;
    webDesign: string;
    marketResearch: string;
    legalInfo: string;
  };
}

const mapPhaseToStep = (phase: string): number => {
  switch (phase) {
    case "onboarding":
      return 1;
    case "landingpage":
      return 2;
    case "ads":
      return 3;
    case "whatsapp":
      return 4;
    case "webinar":
      return 5;
    default:
      return 0;
  }
};

// Funktion zum Berechnen des Fortschritts basierend auf der Phase
const calculateProgress = (phase: string): number => {
  switch (phase.toLowerCase()) {
    case "onboarding":
    case "checkliste":
      return 20;
    case "landingpage":
    case "setup":
      return 40;
    case "ads":
    case "werbung":
      return 60;
    case "whatsapp":
      return 80;
    case "webinar":
      return 100;
    default:
      return 20; // Default zu 20%, da mindestens Onboarding
  }
};

function CustomerDetails({ customer }: { customer: CustomerData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-2">Zahlungsoption</h4>
          <p className="text-gray-700">{customer.checklistData?.paymentOption || "Nicht angegeben"}</p>
        </div>
        <div>
          <h4 className="font-medium mb-2">Steuernummer</h4>
          <p className="text-gray-700">{customer.checklistData?.taxId || "Nicht angegeben"}</p>
        </div>
        <div>
          <h4 className="font-medium mb-2">Domain</h4>
          <p className="text-gray-700">{customer.checklistData?.domain || "Nicht angegeben"}</p>
        </div>
        <div>
          <h4 className="font-medium mb-2">Zielgruppe</h4>
          <p className="text-gray-700">{customer.checklistData?.targetAudience || "Nicht angegeben"}</p>
        </div>
      </div>
      
      <div>
        <h4 className="font-medium mb-2">Unternehmensinformationen</h4>
        <p className="text-gray-700">{customer.checklistData?.companyInfo || "Nicht angegeben"}</p>
      </div>
      
      <div>
        <h4 className="font-medium mb-2">Webdesign-Präferenzen</h4>
        <p className="text-gray-700">{customer.checklistData?.webDesign || "Nicht angegeben"}</p>
      </div>
      
      <div>
        <h4 className="font-medium mb-2">Marktforschung</h4>
        <p className="text-gray-700">{customer.checklistData?.marketResearch || "Nicht angegeben"}</p>
      </div>
      
      <div>
        <h4 className="font-medium mb-2">Rechtliche Informationen</h4>
        <p className="text-gray-700">{customer.checklistData?.legalInfo || "Nicht angegeben"}</p>
      </div>
    </div>
  );
}

function CustomerCard({ customer }: { customer: CustomerData }) {
  // Fetch initial progress data
  const { data: progressData } = useQuery({
    queryKey: ["progress", customer.id],
    queryFn: async () => {
      const response = await axios.get(`/api/customer/progress/${customer.id}`);
      return response.data;
    },
    initialData: {
      currentPhase: customer.currentPhase,
      completedPhases: customer.completedPhases,
      progress: customer.progress
    },
    refetchInterval: 5000 // Alle 5 Sekunden aktualisieren
  });

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">
            {customer.firstName} {customer.lastName}
          </h3>
          <p className="text-sm text-muted-foreground">{customer.email}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Phase: {progressData?.currentPhase || customer.currentPhase}
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Details
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kundendetails</DialogTitle>
            </DialogHeader>
            <CustomerDetails customer={customer} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        <OnboardingProgress 
          isAdmin={true}
          userId={customer.id}
          initialProgress={{
            currentPhase: customer.currentPhase,
            completedPhases: customer.completedPhases
          }}
        />
      </div>
    </Card>
  );
}

export default function Tracking() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: customers, isLoading } = useQuery<CustomerData[]>({
    queryKey: ["customers-tracking"],
    queryFn: async () => {
      const res = await fetch("/api/admin/customers/tracking", {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
    refetchOnMount: true,
    staleTime: 0,
    gcTime: 0
  });

  const filteredCustomers = customers?.filter(customer => 
    `${customer.firstName} ${customer.lastName} ${customer.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Kundentracking</h1>
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
          <h1 className="text-2xl font-bold">Kundentracking</h1>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Kunden suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="grid gap-6">
          {filteredCustomers?.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
