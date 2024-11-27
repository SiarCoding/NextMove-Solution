import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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

interface ChecklistFormProps {
  onComplete: () => void;
}

export default function ChecklistForm({ onComplete }: ChecklistFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof checklistSchema>>({
    resolver: zodResolver(checklistSchema),
    defaultValues: {
      paymentOption: "",
      taxId: "",
      domain: "",
      targetAudience: "",
      companyInfo: "",
      webDesign: {
        colorScheme: "",
        logoUrl: "",
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

  async function onSubmit(values: z.infer<typeof checklistSchema>) {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/onboarding/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to save checklist");
      
      // Complete onboarding and force reload
      onComplete();
      window.location.href = "/dashboard";
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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

        <div className="flex justify-end pt-6">
          <Button
            type="submit"
            className="bg-[#ff5733] hover:bg-[#ff7a66] text-white shadow-lg transition-colors px-6"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Wird gespeichert..." : "Speichern & Fortfahren"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
