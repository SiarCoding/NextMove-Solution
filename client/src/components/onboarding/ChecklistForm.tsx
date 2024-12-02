import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

const checklistSchema = z.object({
  paymentOption: z.string().min(1, "Zahlungsoption ist erforderlich"),
  taxId: z.string().min(1, "Steuer-ID ist erforderlich"),
  domain: z.string().min(1, "Domain ist erforderlich"),
  targetAudience: z.string().min(1, "Zielgruppendefinition ist erforderlich"),
  companyInfo: z.string().min(1, "Firmeninformation ist erforderlich"),
  webDesign: z.object({
    colorScheme: z.string().min(1, "Farbschema ist erforderlich"),
    logoUrl: z.string().optional(),
  }),
  marketResearch: z.object({
    competitors: z.string().min(1, "Marktforschung ist erforderlich"),
  }),
  legalInfo: z.object({
    address: z.string().min(1, "Anschrift ist erforderlich"),
    impressum: z.string().min(1, "Impressum ist erforderlich"),
    privacy: z.string().min(1, "Datenschutz ist erforderlich"),
  }),
});

export type ChecklistFormProps = {
  onComplete: () => void;
};

export default function ChecklistForm({ onComplete }: ChecklistFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof checklistSchema>>({
    resolver: zodResolver(checklistSchema),
    defaultValues: {
      paymentOption: "Kreditkarte",
      taxId: "DE123456789",
      domain: "example.com",
      targetAudience: "B2B",
      companyInfo: "Test Company",
      webDesign: {
        colorScheme: "#FF5733",
        logoUrl: "",
      },
      marketResearch: {
        competitors: "Competitor A, Competitor B",
      },
      legalInfo: {
        address: "Test Street 1",
        impressum: "Test Impressum",
        privacy: "Test Privacy",
      },
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (!user) {
        throw new Error("Nicht authentifiziert");
      }

      setError(null);
      setIsSubmitting(true);
      
      console.log("Submitting form with values:", values);
      
      const res = await fetch("/api/onboarding/checklist", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(values),
      });

      console.log("Server response status:", res.status);

      const data = await res.json();
      console.log("Server response data:", data);

      if (!res.ok) {
        throw new Error(data.error || "Fehler beim Speichern der Checkliste");
      }

      if (data.success) {
        // Invalidate queries to refresh data
        await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        
        // Call onComplete and navigate
        onComplete();
        navigate("/dashboard", { replace: true });
      } else {
        throw new Error("Unerwarteter Serverfehler");
      }
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      setError(error instanceof Error ? error.message : "Ein unerwarteter Fehler ist aufgetreten");
      
      // If not authenticated, redirect to login
      if (error instanceof Error && error.message === "Nicht authentifiziert") {
        navigate("/", { replace: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Payment Information Column */}
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">
              Zahlungsinformationen
            </h3>
            <FormField
              control={form.control}
              name="paymentOption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#8F8F90] font-medium">
                    Zahlungsoption
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Kreditkarte oder PayPal"
                      {...field}
                      className="h-11 bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733] rounded-lg"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="taxId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#8F8F90] font-medium">
                    Steuer-ID
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="USt-ID/Steuer-ID"
                      {...field}
                      className="h-11 bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733] rounded-lg"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Online-Präsenz</h3>
            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#8F8F90] font-medium">
                    Domain
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="www.example.de"
                      {...field}
                      className="h-11 bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733] rounded-lg"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="webDesign.colorScheme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#8F8F90] font-medium">
                    Farbschema
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="z.B. #FF5733, Blau"
                      {...field}
                      className="h-11 bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733] rounded-lg"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">
              Unternehmensinformationen
            </h3>
            <FormField
              control={form.control}
              name="companyInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#8F8F90] font-medium">
                    Firmeninformation
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Beschreiben Sie Ihr Unternehmen"
                      {...field}
                      className="bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733] min-h-[120px] rounded-lg resize-none"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetAudience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#8F8F90] font-medium">
                    Zielgruppe
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Beschreiben Sie Ihre Zielgruppe (Alter, Interessen, etc.)"
                      {...field}
                      className="bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733] min-h-[120px] rounded-lg resize-none"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="pt-6 border-t border-[#2E2E32]">
            <h3 className="text-lg font-semibold text-white mb-6">
              Weitere Informationen
            </h3>
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="marketResearch.competitors"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#8F8F90] font-medium">
                      Mitbewerber
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Liste der Mitbewerber-Websites"
                        {...field}
                        className="bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733] min-h-[120px] rounded-lg resize-none"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="legalInfo.address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#8F8F90] font-medium">
                      Anschrift
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Vollständige Geschäftsadresse"
                        {...field}
                        className="bg-[#1E1E20] border-[#2E2E32] text-white placeholder:text-[#8F8F90] focus-visible:ring-[#ff5733] min-h-[120px] rounded-lg resize-none"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-4 mt-6">
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          <Button
            type="submit"
            className="bg-[#ff5733] hover:bg-[#ff7a66] text-white shadow-lg transition-colors px-6 w-full md:w-auto"
            disabled={isSubmitting}
            onClick={() => console.log("Button clicked")}
          >
            {isSubmitting ? "Wird gespeichert..." : "Speichern & Fortfahren"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
