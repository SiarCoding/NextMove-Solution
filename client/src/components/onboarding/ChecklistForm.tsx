import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/ui/tag-input";
import { useState } from "react";
import { useLocation } from "wouter";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";

const checklistSchema = z.object({
  paymentOption: z.string().optional(),
  paymentMethod: z.string().optional(),
  taxId: z.string().optional(),
  domain: z.string().optional(),
  targetAudience: z.string().optional(),
  companyInfo: z.string().optional(),
  uniqueSellingPoint: z.string().optional(),
  marketSize: z.string().optional(),
  targetGroupGender: z.string().optional(),
  targetGroupAge: z.string().optional(),
  targetGroupLocation: z.string().optional(),
  targetGroupInterests: z.array(z.string()).default([]),
  webDesign: z.object({
    logoUrl: z.string().optional(),
    colorScheme: z.string().optional(),
  }),
  marketResearch: z.object({
    competitors: z.string().optional(),
  }),
  legalInfo: z.object({
    address: z.string().optional(),
    impressum: z.string().optional(),
    privacy: z.string().optional(),
  }),
});

type ChecklistFormData = z.infer<typeof checklistSchema>;

interface ChecklistFormProps {
  onComplete?: () => void;
}

const ChecklistForm = ({ onComplete }: ChecklistFormProps) => {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof checklistSchema>>({
    resolver: zodResolver(checklistSchema),
    defaultValues: {
      paymentOption: "",
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

  const onSubmit = async (values: z.infer<typeof checklistSchema>) => {
    setIsSubmitting(true);
    setError("");

    try {
      // Strukturiere die Daten korrekt für die API
      const formattedData = {
        paymentOption: values.paymentOption,
        paymentMethod: values.paymentMethod,
        taxId: values.taxId,
        domain: values.domain,
        targetAudience: values.targetAudience,
        companyInfo: values.companyInfo,
        targetGroupGender: values.targetGroupGender,
        targetGroupAge: values.targetGroupAge,
        targetGroupLocation: values.targetGroupLocation,
        targetGroupInterests: values.targetGroupInterests,
        uniqueSellingPoint: values.uniqueSellingPoint,
        marketSize: values.marketSize,
        webDesign: values.webDesign,
        marketResearch: values.marketResearch,
        legalInfo: values.legalInfo,
      };

      const response = await fetch("/api/customer/checklist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit checklist");
      }

      toast({
        title: "Erfolgreich gespeichert!",
        description: "Ihre Daten wurden erfolgreich gespeichert.",
      });

      // Call the onComplete callback if provided
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
      toast({
        title: "Fehler",
        description: "Beim Speichern ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0]) return;

    const formData = new FormData();
    formData.append("logo", event.target.files[0]);

    try {
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
        variant: "default",
      });
    } catch (error) {
      console.error("Logo upload error:", error);
      toast({
        title: "Fehler",
        description: "Logo konnte nicht hochgeladen werden",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-6">
          <FormField
            control={form.control}
            name="paymentOption"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#8F8F90] font-medium">Hast du bereits eine Zahlungsmethode bei Meta hinterlegt?</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className="bg-[#1E1E20] border-[#2E2E32] text-white focus-visible:ring-[#ff5733]">
                      <SelectValue placeholder="Bitte auswählen" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1E20] border-[#2E2E32]">
                      <SelectItem value="ja">Ja</SelectItem>
                      <SelectItem value="nein">Nein</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("paymentOption") === "nein" && (
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#8F8F90] font-medium">Gewünschte Zahlungsmethode</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="bg-[#1E1E20] border-[#2E2E32] text-white focus-visible:ring-[#ff5733]">
                        <SelectValue placeholder="Bitte auswählen" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1E1E20] border-[#2E2E32]">
                        <SelectItem value="kreditkarte">Kreditkarte</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="taxId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#8F8F90] font-medium">Steuernummer</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ihre Steuernummer"
                    {...field}
                    className="bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="domain"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#8F8F90] font-medium">Domain</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ihre Domain"
                    {...field}
                    className="bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white">Zielgruppe</h3>
          
          <FormField
            control={form.control}
            name="targetAudience"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#8F8F90] font-medium">Zielgruppe</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ihre Zielgruppe"
                    {...field}
                    className="bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyInfo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#8F8F90] font-medium">Unternehmensinformationen</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ihre Unternehmensinformationen"
                    {...field}
                    className="bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733] min-h-[150px]"
                  />
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
                <FormLabel className="text-[#8F8F90] font-medium">Alleinstellungsmerkmal</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Was macht Ihr Unternehmen einzigartig?"
                    {...field}
                    className="bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733] min-h-[150px]"
                  />
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
                <FormLabel className="text-[#8F8F90] font-medium">Marktgröße</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Wie groß ist Ihr Zielmarkt?"
                    {...field}
                    className="bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733] min-h-[150px]"
                  />
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
                <FormLabel className="text-[#8F8F90] font-medium">Geschlecht</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="bg-[#1E1E20] border-[#2E2E32] text-white focus-visible:ring-[#ff5733]">
                      <SelectValue placeholder="Wählen Sie das Geschlecht" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1E20] border-[#2E2E32]">
                      <SelectItem value="all">Alle</SelectItem>
                      <SelectItem value="male">Männlich</SelectItem>
                      <SelectItem value="female">Weiblich</SelectItem>
                      <SelectItem value="diverse">Divers</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="targetGroupAge"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#8F8F90] font-medium">Altersgruppe</FormLabel>
                <FormControl>
                  <Input
                    placeholder="z.B. 18-35"
                    {...field}
                    className="bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733]"
                  />
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
                <FormLabel className="text-[#8F8F90] font-medium">Region</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className="bg-[#1E1E20] border-[#2E2E32] text-white focus-visible:ring-[#ff5733]">
                      <SelectValue placeholder="Bitte Region auswählen" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1E20] border-[#2E2E32]">
                      <SelectItem value="deutschland">Deutschland</SelectItem>
                      <SelectItem value="oesterreich">Österreich</SelectItem>
                      <SelectItem value="schweiz">Schweiz</SelectItem>
                    </SelectContent>
                  </Select>
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
                <FormLabel className="text-[#8F8F90] font-medium">Interessen</FormLabel>
                <FormControl>
                  <TagInput
                    placeholder="Fügen Sie Interessen hinzu und drücken Sie Enter"
                    tags={field.value}
                    className="bg-[#1E1E20] border-[#2E2E32] text-white"
                    onTagsChange={(newTags) => field.onChange(newTags)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white">Webdesign</h3>
          
          <FormField
            control={form.control}
            name="webDesign.colorScheme"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#8F8F90] font-medium">Farbschema</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ihr gewünschtes Farbschema"
                    {...field}
                    className="bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733]"
                  />
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
                <FormLabel className="text-[#8F8F90] font-medium">Logo</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733]"
                    />
                    {field.value && (
                      <div className="mt-2">
                        <img src={field.value} alt="Logo" className="max-w-[200px] h-auto" />
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white">Marktforschung</h3>
          
          <FormField
            control={form.control}
            name="marketResearch.competitors"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#8F8F90] font-medium">Wettbewerber</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Beschreiben Sie Ihre Wettbewerber"
                    {...field}
                    className="bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733] min-h-[120px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white">Rechtliche Informationen</h3>
          
          <FormField
            control={form.control}
            name="legalInfo.address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#8F8F90] font-medium">Adresse</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ihre vollständige Geschäftsadresse"
                    {...field}
                    className="bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733] min-h-[120px]"
                  />
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
                <FormLabel className="text-[#8F8F90] font-medium">Impressum</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ihr Impressum"
                    {...field}
                    className="bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733] min-h-[120px]"
                  />
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
                <FormLabel className="text-[#8F8F90] font-medium">Datenschutz</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ihre Datenschutzerklärung"
                    {...field}
                    className="bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733] min-h-[120px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col items-end gap-4 mt-6">
          <Button 
            type="submit" 
            className="w-full bg-[#ff5733] hover:bg-[#ff7a66] text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Wird gespeichert..." : "Speichern und fortfahren"}
          </Button>
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
        </div>
      </form>
    </Form>
  );
};

export default ChecklistForm;
