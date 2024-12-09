import { useQuery } from "@tanstack/react-query";
import axios from 'axios';
import { useRoute, useLocation } from "wouter";
import AdminLayout from "../../components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  lastLogin: string;
  onboardingCompleted: boolean;
}

interface ChecklistData {
  id: number;
  userId: number;
  paymentOption: string;
  paymentMethod: string;
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
  targetGroupGender: string;
  targetGroupAge: string;
  targetGroupLocation: string;
  targetGroupInterests: string[];
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
    refetchInterval: 5000, // Alle 5 Sekunden aktualisieren
  });

  const { data: checklistData, isLoading: checklistLoading } = useQuery<ChecklistData>({
    queryKey: ['customerChecklist', customerId],
    queryFn: async () => {
      const response = await axios.get(`/api/admin/customer-checklist/${customerId}`);
      const data = response.data;
      
      // Parse JSON fields
      const parsedData = {
        ...data,
        webDesign: typeof data.webDesign === 'string' ? JSON.parse(data.webDesign) : data.webDesign,
        marketResearch: typeof data.marketResearch === 'string' ? JSON.parse(data.marketResearch) : data.marketResearch,
        legalInfo: typeof data.legalInfo === 'string' ? JSON.parse(data.legalInfo) : data.legalInfo,
      };

      // Ensure competitors is always an array
      const competitors = parsedData.marketResearch?.competitors;
      const competitorsArray = Array.isArray(competitors) 
        ? competitors 
        : typeof competitors === 'string' 
          ? competitors.split(',').map(s => s.trim()).filter(Boolean)
          : [];

      // Ensure correct field names and types
      return {
        ...parsedData,
        targetGroupGender: data.target_group_gender || data.targetGroupGender,
        targetGroupAge: data.target_group_age || data.targetGroupAge,
        targetGroupLocation: data.target_group_location || data.targetGroupLocation,
        targetGroupInterests: Array.isArray(data.target_group_interests) 
          ? data.target_group_interests 
          : Array.isArray(data.targetGroupInterests)
            ? data.targetGroupInterests
            : [],
        marketResearch: {
          ...parsedData.marketResearch,
          competitors: competitorsArray,
          uniqueSellingPoint: data.uniqueSellingPoint || parsedData.marketResearch?.uniqueSellingPoint || '',
          marketSize: data.marketSize || parsedData.marketResearch?.marketSize || '',
        }
      };
    },
    enabled: !!customerId,
    refetchInterval: 5000, // Alle 5 Sekunden aktualisieren
  });

  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ['progress', customerId],
    queryFn: async () => {
      const response = await axios.get(`/api/customer/progress/${customerId}`);
      return response.data;
    },
    enabled: !!customerId,
    refetchInterval: 5000, // Alle 5 Sekunden aktualisieren
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

        <div className="space-y-6">
          {/* Persönliche Informationen */}
          <Card className="bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Persönliche Informationen</CardTitle>
                  <CardDescription>
                    Kontaktdaten und Status des Kunden
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium w-1/4">Name</TableCell>
                    <TableCell>
                      {customer.firstName} {customer.lastName}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Email</TableCell>
                    <TableCell>{customer.email}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Aktuelle Phase</TableCell>
                    <TableCell>{progressData?.currentPhase || customer.currentPhase}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Fortschritt</TableCell>
                    <TableCell>{customer.progress}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Zuletzt aktiv</TableCell>
                    <TableCell>
                      {customer.lastLogin 
                        ? new Date(customer.lastLogin).toLocaleString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Noch nicht eingeloggt'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Checkliste */}
          <Card className="bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Checkliste</CardTitle>
                  <CardDescription>
                    Eingegebene Daten aus der Checkliste
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Zahlungsinformationen */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Zahlungsinformationen</h3>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Zahlungsmethode</TableCell>
                      <TableCell>{checklistData.paymentMethod}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Steuernummer</TableCell>
                      <TableCell>{checklistData.taxId}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Webseite */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Webseite</h3>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Domain</TableCell>
                      <TableCell>{checklistData.domain}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Logo</TableCell>
                      <TableCell>
                        {checklistData.webDesign?.logoUrl ? (
                          <div className="flex items-center space-x-2">
                            <img 
                              src={checklistData.webDesign.logoUrl} 
                              alt="Logo" 
                              className="w-10 h-10 object-contain"
                            />
                            <Button variant="outline" size="sm" onClick={handleLogoDownload}>
                              Download
                            </Button>
                          </div>
                        ) : (
                          "Kein Logo hochgeladen"
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Farbschema</TableCell>
                      <TableCell>{checklistData.webDesign?.colorScheme}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Template</TableCell>
                      <TableCell>{checklistData.webDesign?.templatePreference}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Unternehmensinformationen */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Unternehmensinformationen</h3>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Unternehmen</TableCell>
                      <TableCell>{checklistData.companyInfo}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Zielgruppe */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Zielgruppe</h3>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Geschlecht</TableCell>
                      <TableCell>
                        {checklistData.targetGroupGender ? {
                          'all': 'Alle',
                          'male': 'Männlich',
                          'female': 'Weiblich',
                          'diverse': 'Divers'
                        }[checklistData.targetGroupGender] || checklistData.targetGroupGender : 'Nicht angegeben'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Alter</TableCell>
                      <TableCell>
                        {checklistData.targetGroupAge || 'Nicht angegeben'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Standort</TableCell>
                      <TableCell>
                        {checklistData.targetGroupLocation || 'Nicht angegeben'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Interessen</TableCell>
                      <TableCell>
                        {checklistData.targetGroupInterests?.length > 0
                          ? checklistData.targetGroupInterests.join(', ')
                          : 'Nicht angegeben'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Marktforschung */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Marktforschung</h3>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Alleinstellungsmerkmal</TableCell>
                      <TableCell>
                        {checklistData.marketResearch?.uniqueSellingPoint || 'Nicht angegeben'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Marktgröße</TableCell>
                      <TableCell>
                        {checklistData.marketResearch?.marketSize || 'Nicht angegeben'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Wettbewerber</TableCell>
                      <TableCell>
                        {checklistData.marketResearch?.competitors?.length > 0
                          ? checklistData.marketResearch.competitors.join(', ')
                          : 'Nicht angegeben'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Rechtliche Informationen */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Rechtliche Informationen</h3>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Adresse</TableCell>
                      <TableCell>{checklistData.legalInfo?.address}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Impressum</TableCell>
                      <TableCell>{checklistData.legalInfo?.impressum}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Datenschutz</TableCell>
                      <TableCell>{checklistData.legalInfo?.privacy}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
