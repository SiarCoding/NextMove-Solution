import { useState, useEffect } from "react";
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
import { useAuth } from "../lib/auth.tsx";
import { Shield, Globe } from "lucide-react";
import { useLocation } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein"),
  password: z.string().min(1, "Bitte geben Sie Ihr Passwort ein"),
});

const resetSchema = z.object({
  email: z.string().min(1, "Bitte geben Sie Ihre E-Mail-Adresse ein"),
});

type ResetFormData = z.infer<typeof resetSchema>;

const ResetPasswordForm = ({ onCancel, setShowResetForm }: { 
  onCancel: () => void;
  setShowResetForm: (show: boolean) => void;
}) => {
  const { toast } = useToast();
  const form = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: ""
    }
  });

  const onSubmit = async (data: ResetFormData) => {
    try {
      const response = await fetch("/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Fehler",
          description: result.error || "Ein Fehler ist aufgetreten"
        });
        return;
      }

      toast({
        title: "E-Mail gesendet",
        description: result.message
      });
      setShowResetForm(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Ein Fehler ist aufgetreten"
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Passwort zurücksetzen</h2>
          <p className="text-sm text-muted-foreground">
            Geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen Link zum Zurücksetzen Ihres Passworts.
          </p>
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-Mail</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="name@firma.de"
                  className="bg-[#1a1b1e] border-border"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <>Wird gesendet...</>
            ) : (
              <>Link zum Zurücksetzen senden</>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onCancel}
          >
            Zurück zur Anmeldung
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    try {
      setIsLoading(true);
      const loginResponse = await login(values.email, values.password, "customer");
      
      if (loginResponse.user?.shouldRedirectToOnboarding || !loginResponse.user?.onboardingCompleted) {
        navigate("/onboarding");
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error?.message || "Anmeldung fehlgeschlagen"
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-screen bg-black">
      {/* Left side */}
      <div className="hidden lg:flex lg:flex-1 flex-col p-12">
        <div className="mb-auto">
          <img
            src="/logo.jpg"
            alt="Logo"
            className="h-24 w-auto mb-8"
          />
          <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
            Willkommen zum Kundenportal
          </h1>
          <p className="text-lg text-muted-foreground mb-12">
            Melden Sie sich an, um fortzufahren
          </p>

          <div className="space-y-4">
            <div className="flex items-center space-x-5 bg-[#25262b]/50 p-5 rounded-xl border border-border hover:bg-[#25262b]/70 transition-all duration-300">
              <div className="flex-shrink-0 p-3 bg-primary/10 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-medium text-foreground mb-1">
                  Sicherer Zugang
                </h3>
                <p className="text-sm text-muted-foreground">
                  Ihre Daten sind bei uns sicher
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-5 bg-[#25262b]/50 p-5 rounded-xl border border-border hover:bg-[#25262b]/70 transition-all duration-300">
              <div className="flex-shrink-0 p-3 bg-primary/10 rounded-lg">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-medium text-foreground mb-1">
                  24/7 Verfügbar
                </h3>
                <p className="text-sm text-muted-foreground">
                  Zugriff rund um die Uhr
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-12">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-[#25262b] rounded-xl p-8 shadow-2xl border border-border">
            {!showResetForm ? (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-Mail</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="name@firma.de" 
                            className="bg-[#1a1b1e] border-border" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Passwort</FormLabel>
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

                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm"
                      onClick={() => setShowResetForm(true)}
                    >
                      Passwort vergessen?
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Wird geladen..." : "Anmelden"}
                  </Button>

                  <div className="space-y-4 text-center">
                    <div>
                      <Button
                        variant="link"
                        onClick={() => navigate("/register")}
                        className="text-muted-foreground hover:text-primary"
                      >
                        Noch kein Konto? Jetzt registrieren
                      </Button>
                    </div>
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/admin/login")}
                        className="text-muted-foreground hover:text-primary text-sm"
                      >
                        Zum Adminportal
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            ) : (
              <ResetPasswordForm 
                onCancel={() => setShowResetForm(false)} 
                setShowResetForm={setShowResetForm}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
