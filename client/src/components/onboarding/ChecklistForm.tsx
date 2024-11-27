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
    logoUrl: z.string().optional()
  }),
  marketResearch: z.object({
    competitors: z.string().min(1, "Marktforschung ist erforderlich")
  }),
  legalInfo: z.object({
    address: z.string().min(1, "Anschrift ist erforderlich"),
    impressum: z.string().min(1, "Impressum ist erforderlich"),
    privacy: z.string().min(1, "Datenschutz ist erforderlich")
  })
});

export default function ChecklistForm({ onComplete }) {
  const form = useForm({
    resolver: zodResolver(checklistSchema),
    defaultValues: {
      paymentOption: "",
      taxId: "",
      domain: "",
      targetAudience: "",
      companyInfo: "",
      webDesign: {
        colorScheme: "",
        logoUrl: ""
      },
      marketResearch: {
        competitors: ""
      },
      legalInfo: {
        address: "",
        impressum: "",
        privacy: ""
      }
    }
  });

  async function onSubmit(values) {
    try {
      const res = await fetch("/api/onboarding/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        credentials: 'include'
      });

      if (!res.ok) throw new Error();
      onComplete();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="paymentOption"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zahlungsoption</FormLabel>
                <FormControl>
                  <Input placeholder="Kreditkarte oder PayPal" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="taxId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Steuer-ID</FormLabel>
                <FormControl>
                  <Input placeholder="USt-ID/Steuer-ID" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="domain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Domain</FormLabel>
                <FormControl>
                  <Input placeholder="www.example.de" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="targetAudience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zielgruppe</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Beschreiben Sie Ihre Zielgruppe (Alter, Interessen, etc.)" 
                    {...field} 
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyInfo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Firmeninformation</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Beschreiben Sie Ihr Unternehmen" 
                    {...field} 
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
                <FormLabel>Farbschema</FormLabel>
                <FormControl>
                  <Input placeholder="z.B. #FF5733, Blau" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="marketResearch.competitors"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mitbewerber</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Liste der Mitbewerber-Websites" 
                    {...field} 
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
                <FormLabel>Anschrift</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Vollständige Geschäftsadresse" 
                    {...field} 
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit">Speichern & Fortfahren</Button>
      </form>
    </Form>
  );
}
