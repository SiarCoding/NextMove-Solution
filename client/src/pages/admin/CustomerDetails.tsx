import { useQuery } from "@tanstack/react-query";
import axios from 'axios';
import { useRoute, useLocation } from "wouter";
import AdminLayout from "../../components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
}

interface ChecklistData {
  id: number;
  userId: number;
  paymentOption: string;
  taxId: string;
  domain: string;
  targetAudience: string;
  companyInfo: string;
  webDesign: {
    logoUrl: string;
    colorScheme: string;
    templatePreference: string;
  };
  marketResearch: {
    competitors: string[];
    uniqueSellingPoint: string;
    marketSize: string;
  };
  legalInfo: {
    address: string;
    impressum: string;
    privacy: string;
  };
  target_group_gender: string;
  target_group_age: string;
  target_group_location: string;
  target_group_interests: string[];
  createdAt: string;
  updatedAt: string;
}

export default function CustomerDetails() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/tracking/:id");
  const customerId = params?.id;

  const { data: customer, isLoading: customerLoading } = useQuery<CustomerData>({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const response = await axios.get(`/api/admin/customers/${customerId}`);
      return response.data;
    },
    enabled: !!customerId,
    retry: 1,
    staleTime: 5000
  });

  const { data: checklistData, isLoading: checklistLoading } = useQuery<ChecklistData>({
    queryKey: ['customerChecklist', customerId],
    queryFn: async () => {
      const response = await axios.get(`/api/admin/customer-checklist/${customerId}`);
      return response.data;
    },
    enabled: !!customerId,
    retry: 1,
    staleTime: 5000
  });

  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ['progress', customerId],
    queryFn: async () => {
      const response = await axios.get(`/api/customer/progress/${customerId}`);
      return response.data;
    },
    enabled: !!customerId,
    retry: 1,
    staleTime: 5000
  });

  const isLoading = customerLoading || checklistLoading || progressLoading;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/admin/tracking")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zurück</span>
            </Button>
          </div>
          <div>Lade Kundendaten...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!customer || !checklistData) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/admin/tracking")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zurück</span>
            </Button>
          </div>
          <div>Keine Kundendaten gefunden.</div>
        </div>
      </AdminLayout>
    );
  }

  const handleLogoDownload = async () => {
    if (checklistData?.webDesign?.logoUrl) {
      try {
        const response = await fetch(checklistData.webDesign.logoUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const extension = checklistData.webDesign.logoUrl.split('.').pop();
        link.download = `logo-${customerId}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading logo:', error);
      }
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/admin/tracking")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zurück</span>
            </Button>
            <h1 className="text-2xl font-bold">
              Kundendetails
            </h1>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Basis Informationen */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Kontaktinformationen</h2>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium w-1/4">Name</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {customer.firstName} {customer.lastName}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Email</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {customer.email}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Aktuelle Phase</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {progressData?.currentPhase || customer.currentPhase}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Fortschritt</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {progressData?.progress || customer.progress}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Geschäftsinformationen */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Geschäftsinformationen</h2>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium w-1/4">Zahlungsoption</TableCell>
                    <TableCell>{checklistData.paymentOption}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Steuernummer</TableCell>
                    <TableCell>{checklistData.taxId}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Domain</TableCell>
                    <TableCell>{checklistData.domain}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Unternehmensinformationen</TableCell>
                    <TableCell className="whitespace-pre-line">{checklistData.companyInfo}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Webdesign */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Webdesign Präferenzen</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Farbschema</TableCell>
                        <TableCell>{checklistData.webDesign.colorScheme}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Template</TableCell>
                        <TableCell>{checklistData.webDesign.templatePreference}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                {checklistData.webDesign.logoUrl && (
                  <div className="flex flex-col space-y-4">
                    <h3 className="font-medium">Logo</h3>
                    <div className="relative w-48 h-48 bg-black/5 rounded-lg overflow-hidden border">
                      <img 
                        src={`${window.location.origin}${checklistData.webDesign.logoUrl}`}
                        alt="Firmenlogo" 
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                    </div>
                    <Button 
                      onClick={handleLogoDownload}
                      variant="outline" 
                      className="w-fit"
                    >
                      Logo herunterladen
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rechtliche Informationen */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Rechtliche Informationen</h2>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium w-1/4">Adresse</TableCell>
                    <TableCell className="whitespace-pre-line">{checklistData.legalInfo.address}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Impressum</TableCell>
                    <TableCell className="whitespace-pre-line">{checklistData.legalInfo.impressum}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Datenschutz</TableCell>
                    <TableCell className="whitespace-pre-line">{checklistData.legalInfo.privacy}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Zielgruppe */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Zielgruppe</h2>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium w-1/4">Hauptzielgruppe</TableCell>
                    <TableCell>{checklistData.targetAudience}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Geschlecht</TableCell>
                    <TableCell>{checklistData.target_group_gender}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Alter</TableCell>
                    <TableCell>{checklistData.target_group_age}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Standort</TableCell>
                    <TableCell>{checklistData.target_group_location}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Interessen</TableCell>
                    <TableCell>
                      {Array.isArray(checklistData?.target_group_interests) 
                        ? checklistData.target_group_interests.join(", ")
                        : checklistData?.target_group_interests || "-"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Marktforschung */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Marktforschung</h2>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium w-1/4">Wettbewerber</TableCell>
                    <TableCell>
                      {Array.isArray(checklistData?.marketResearch?.competitors)
                        ? checklistData.marketResearch.competitors.join(", ")
                        : checklistData?.marketResearch?.competitors || "-"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Alleinstellungsmerkmal</TableCell>
                    <TableCell className="whitespace-pre-line">{checklistData.marketResearch.uniqueSellingPoint}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Marktgröße</TableCell>
                    <TableCell>{checklistData.marketResearch.marketSize}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
