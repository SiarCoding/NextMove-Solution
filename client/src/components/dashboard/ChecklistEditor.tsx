import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/ui/tag-input";
import { Upload } from "lucide-react";

const checklistSchema = z.object({
  paymentMethod: z.string(),
  taxId: z.string(),
  domain: z.string(),
  targetAudience: z.string(),
  companyInfo: z.string(),
  uniqueSellingPoint: z.string(),
  marketSize: z.string(),
  targetGroupGender: z.string(),
  targetGroupAge: z.string(),
  targetGroupLocation: z.string(),
  targetGroupInterests: z.array(z.string()).default([]),
  webDesign: z.object({
    logoUrl: z.string(),
    colorScheme: z.string(),
  }),
  marketResearch: z.object({
    competitors: z.string(),
  }),
  legalInfo: z.object({
    address: z.string(),
    impressum: z.string(),
    privacy: z.string(),
  }),
});

type ChecklistData = z.infer<typeof checklistSchema>;

export function ChecklistEditor() {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<ChecklistData>({
    resolver: zodResolver(checklistSchema),
    defaultValues: {
      paymentMethod: "",
      taxId: "",
      domain: "",
      targetAudience: "",
      companyInfo: "",
      uniqueSellingPoint: "",
      marketSize: "",
      targetGroupGender: "",
      targetGroupAge: "",
      targetGroupLocation: "",
      targetGroupInterests: [],
      webDesign: {
        logoUrl: "",
        colorScheme: "",
      },
      marketResearch: {
        competitors: "",
      },
      legalInfo: {
        address: "",
        impressum: "",
        privacy: "",
      },
    },
  });

  useEffect(() => {
    if (user?.id) {
      fetchChecklistData();
    }
  }, [user?.id]);

  const fetchChecklistData = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const response = await axios.get(`/api/customer-checklist/${user.id}`);
      const data = response.data;
      
      form.reset({
        ...data,
        webDesign: typeof data.webDesign === 'string' ? JSON.parse(data.webDesign) : data.webDesign,
        marketResearch: typeof data.marketResearch === 'string' ? JSON.parse(data.marketResearch) : data.marketResearch,
        legalInfo: typeof data.legalInfo === 'string' ? JSON.parse(data.legalInfo) : data.legalInfo,
        targetGroupInterests: Array.isArray(data.targetGroupInterests) ? data.targetGroupInterests : [],
      });
    } catch (error: any) {
      console.error("Error fetching checklist:", error);
      if (error.response?.status !== 404) {
        toast({
          title: "Fehler",
          description: "Checkliste konnte nicht geladen werden: " + (error.response?.data?.error || error.message),
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0]) return;

    const formData = new FormData();
    formData.append("logo", event.target.files[0]);

    try {
      setIsUploading(true);
      const response = await fetch("/api/customer/logo", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Logo-Upload fehlgeschlagen");
      }

      const { url } = await response.json();
      form.setValue("webDesign.logoUrl", url);
      
      toast({
        title: "Logo hochgeladen",
        description: "Ihr Logo wurde erfolgreich hochgeladen.",
      });
    } catch (error) {
      console.error("Logo upload error:", error);
      toast({
        title: "Fehler",
        description: "Logo konnte nicht hochgeladen werden",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: ChecklistData) => {
    try {
      await axios.put(`/api/customer/checklist`, data);
      toast({
        title: "Erfolg",
        description: "Checkliste wurde aktualisiert",
      });
      setIsEditing(false);
      fetchChecklistData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.response?.data?.error || "Fehler beim Aktualisieren der Checkliste",
      });
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Checkliste</CardTitle>
            <CardDescription>
              Ihre Projektinformationen und Einstellungen
            </CardDescription>
          </div>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "outline" : "default"}
          >
            {isEditing ? "Abbrechen" : "Bearbeiten"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Lädt...</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Zahlungsinformationen</h3>
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zahlungsmethode in Meta-Ads</FormLabel>
                      <Select
                        disabled={!isEditing}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wählen Sie eine Zahlungsmethode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="kreditkarte">Kreditkarte</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="invoice">Rechnung</SelectItem>
                          <SelectItem value="sepa">SEPA-Lastschrift</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Steuernummer</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-medium">Webseite</h3>
                <FormField
                  control={form.control}
                  name="domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domain</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="webDesign.logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo</FormLabel>
                      <div className="flex items-center space-x-4">
                        {field.value && (
                          <img
                            src={field.value}
                            alt="Logo"
                            className="h-20 w-20 object-contain"
                          />
                        )}
                        {isEditing && (
                          <div className="flex-1">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              disabled={isUploading}
                            />
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-medium">Unternehmensinformationen</h3>
                <FormField
                  control={form.control}
                  name="companyInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Firmeninformationen</FormLabel>
                      <FormControl>
                        <Textarea {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="uniqueSellingPoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alleinstellungsmerkmal</FormLabel>
                      <FormControl>
                        <Textarea {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="marketSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marktgröße</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-medium">Zielgruppe</h3>
                <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zielgruppe</FormLabel>
                      <FormControl>
                        <Textarea {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetGroupGender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Geschlecht</FormLabel>
                      <Select
                        disabled={!isEditing}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wählen Sie ein Geschlecht" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Alle</SelectItem>
                          <SelectItem value="male">Männlich</SelectItem>
                          <SelectItem value="female">Weiblich</SelectItem>
                          <SelectItem value="diverse">Divers</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetGroupAge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alter</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetGroupLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Standort</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetGroupInterests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interessen</FormLabel>
                      <FormControl>
                        <TagInput
                          placeholder="Fügen Sie Interessen hinzu"
                          tags={field.value}
                          onTagsChange={(newTags: string[]) => field.onChange(newTags)}
                          disabled={!isEditing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-medium">Marktforschung</h3>
                <FormField
                  control={form.control}
                  name="marketResearch.competitors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wettbewerber</FormLabel>
                      <FormControl>
                        <Textarea {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-medium">Rechtliche Informationen</h3>
                <FormField
                  control={form.control}
                  name="legalInfo.address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Textarea {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="legalInfo.impressum"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Impressum</FormLabel>
                      <FormControl>
                        <Textarea {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="legalInfo.privacy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Datenschutz</FormLabel>
                      <FormControl>
                        <Textarea {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {isEditing && (
                <div className="flex justify-end space-x-2">
                  <Button type="submit">Speichern</Button>
                </div>
              )}
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
