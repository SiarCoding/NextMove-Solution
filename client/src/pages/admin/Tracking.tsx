import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import axios from 'axios';
import AdminLayout from "../../components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import OnboardingProgress from "@/components/dashboard/OnboardingProgress";
import { Card } from "@/components/ui/card";
import { useLocation } from 'wouter';
import { useToast } from "@/hooks/use-toast";

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
  profileImage?: string;
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

type PhaseUpdateResponse = {
  success: boolean;
  message: string;
};

function CustomerCard({ customer }: { customer: CustomerData }) {
  const queryClient = useQueryClient();
  const { mutate: updatePhase, isPending: isUpdating } = useMutation<
    PhaseUpdateResponse,
    Error,
    string,
    unknown
  >({
    mutationFn: async (newPhase: string) => {
      const response = await axios.post(`/api/admin/user-phase/${customer.id}`, {
        phase: newPhase,
        completedPhases: getAllPreviousPhases(newPhase)
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['progress', customer.id] });
    }
  });

  const { toast } = useToast();
  const [, navigate] = useLocation();

  const getNextPhase = (currentPhase: string): string => {
    const phases = ["onboarding", "landingpage", "ads", "whatsapp", "webinar"];
    const currentIndex = phases.indexOf(currentPhase.toLowerCase());
    return currentIndex < phases.length - 1 ? phases[currentIndex + 1] : currentPhase;
  };

  const getPreviousPhase = (currentPhase: string): string => {
    const phases = ["onboarding", "landingpage", "ads", "whatsapp", "webinar"];
    const currentIndex = phases.indexOf(currentPhase.toLowerCase());
    return currentIndex > 0 ? phases[currentIndex - 1] : currentPhase;
  };

  const getAllPreviousPhases = (phase: string): string[] => {
    const phases = ["onboarding", "landingpage", "ads", "whatsapp", "webinar"];
    const currentPhaseNumber = phases.indexOf(phase.toLowerCase()) || 0;
    return phases.slice(0, currentPhaseNumber);
  };

  const handleNextPhase = () => {
    const nextPhase = getNextPhase(customer.currentPhase);
    if (nextPhase) {
      // Optimistisch aktualisieren
      queryClient.setQueryData(['customers'], (old: CustomerData[] | undefined) =>
        old?.map(c => c.id === customer.id ? {
          ...c,
          currentPhase: nextPhase,
          completedPhases: [...(c.completedPhases || []), c.currentPhase]
        } : c)
      );
      queryClient.setQueryData(['progress', customer.id], {
        currentPhase: nextPhase,
        completedPhases: [...(customer.completedPhases || []), customer.currentPhase]
      });
      updatePhase(nextPhase);
    }
  };

  const handlePreviousPhase = () => {
    const previousPhase = getPreviousPhase(customer.currentPhase);
    if (previousPhase) {
      // Optimistisch aktualisieren
      queryClient.setQueryData(['customers'], (old: CustomerData[] | undefined) =>
        old?.map(c => c.id === customer.id ? {
          ...c,
          currentPhase: previousPhase,
          completedPhases: (c.completedPhases || []).filter(p => p !== c.currentPhase)
        } : c)
      );
      queryClient.setQueryData(['progress', customer.id], {
        currentPhase: previousPhase,
        completedPhases: (customer.completedPhases || []).filter(p => p !== customer.currentPhase)
      });
      updatePhase(previousPhase);
    }
  };

  return (
    <Card className="hover:bg-accent/50 transition-colors cursor-pointer w-full">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage 
                src={customer.profileImage ? `${customer.profileImage}?t=${Date.now()}` : ''} 
                alt={`${customer.firstName} ${customer.lastName}`}
                className="object-cover"
                loading="eager"
              />
              <AvatarFallback className="bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{customer.firstName} {customer.lastName}</h3>
              <p className="text-sm text-muted-foreground">{customer.email}</p>
              <p className="text-sm text-muted-foreground mt-1">Phase: {customer.currentPhase}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/tracking/${customer.id}`)}>
            Details
          </Button>
        </div>

        <div className="space-y-4">
          <OnboardingProgress
            isAdmin={true}
            userId={customer.id}
            initialProgress={{
              currentPhase: customer.currentPhase,
              completedPhases: customer.completedPhases || []
            }}
          />
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={isUpdating || customer.currentPhase === "onboarding"}
              onClick={(e) => {
                e.stopPropagation();
                handlePreviousPhase();
              }}
              className="w-full"
            >
              Phase zurück
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              disabled={isUpdating || customer.currentPhase === "webinar"}
              onClick={(e) => {
                e.stopPropagation();
                handleNextPhase();
              }}
              className="w-full"
            >
              {customer.currentPhase === "webinar" 
                ? "Kunde hat alle Phasen abgeschlossen" 
                : "Nächste Phase"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Tracking() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: customers = [], isLoading } = useQuery<CustomerData[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/customers');
      return response.data;
    },
    refetchInterval: 0
  });

  const filteredCustomers = customers.filter((customer) => {
    const searchString = `${customer.firstName} ${customer.lastName} ${customer.email}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold mb-2">Kundentracking</h1>
            <p className="text-muted-foreground">Übersicht über den Fortschritt der Kunden</p>
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

          {isLoading ? (
            <div>Laden...</div>
          ) : (
            <div className="flex flex-col space-y-4">
              {filteredCustomers.map((customer) => (
                <CustomerCard key={customer.id} customer={customer} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
