import { useState } from "react";
import { useLocation } from "wouter";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Globe } from "lucide-react";

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, "Das Passwort muss mindestens 8 Zeichen lang sein")
    .regex(/[A-Z]/, "Das Passwort muss mindestens einen Großbuchstaben enthalten")
    .regex(/[a-z]/, "Das Passwort muss mindestens einen Kleinbuchstaben enthalten")
    .regex(/[0-9]/, "Das Passwort muss mindestens eine Zahl enthalten"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Die Passwörter stimmen nicht überein",
  path: ["confirmPassword"],
});

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const token = window.location.pathname.split("/").pop();

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
    try {
      setIsLoading(true);

      // Verify token first
      const verifyResponse = await fetch("/api/password-reset/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json();
        throw new Error(error.error || "Token ist ungültig");
      }

      // Reset password
      const resetResponse = await fetch("/api/password-reset/reset", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: values.password,
        }),
      });

      if (!resetResponse.ok) {
        const error = await resetResponse.json();
        throw new Error(error.error || "Passwort konnte nicht zurückgesetzt werden");
      }

      toast({
        title: "Erfolg",
        description: "Ihr Passwort wurde erfolgreich zurückgesetzt. Sie können sich jetzt anmelden.",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message || "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-screen bg-black">
      <div className="flex-1 flex flex-col justify-center px-12">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-[#25262b] rounded-xl p-8 shadow-2xl border border-border">
            <div className="text-center mb-8">
              <Globe className="mx-auto h-12 w-12 text-primary" />
              <h2 className="mt-6 text-3xl font-bold text-white">
                Neues Passwort festlegen
              </h2>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Neues Passwort</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          className="bg-[#1a1b1e] border-border"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passwort bestätigen</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          className="bg-[#1a1b1e] border-border"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Wird gespeichert..." : "Passwort speichern"}
                </Button>

                <div className="text-center">
                  <Button
                    variant="link"
                    onClick={() => navigate("/login")}
                    className="text-muted-foreground hover:text-primary"
                  >
                    Zurück zur Anmeldung
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
