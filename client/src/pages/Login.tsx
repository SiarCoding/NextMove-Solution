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
import { useAuth } from "../lib/auth.tsx";
import { Shield, Globe } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(1, "Passwort ist erforderlich"),
});

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    try {
      setIsLoading(true);
      await login(values.email, values.password, "customer");
      
      // Check onboarding status after login
      const res = await fetch("/api/auth/session", {
        credentials: 'include'
      });
      const data = await res.json();
      
      if (data.user && !data.user.onboardingCompleted) {
        navigate("/onboarding");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Anmeldung fehlgeschlagen",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#1a1b1e] to-[#2d2e32]">
      {/* Left side */}
      <div className="flex-1 flex flex-col px-16 py-16">
        <div className="flex items-center space-x-3 mb-20">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <span className="text-primary text-2xl font-bold tracking-tight">
            NextMove Solution
          </span>
        </div>

        <div className="mb-20">
          <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
            Willkommen zum Kundenportal
          </h1>
          <p className="text-lg text-muted-foreground">
            Melden Sie sich an, um fortzufahren
          </p>
        </div>

        <div className="space-y-6">
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

      {/* Right side - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-12">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-[#25262b] rounded-xl p-8 shadow-2xl border border-border">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
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
                  control={form.control}
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

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Wird geladen..." : "Anmelden"}
                </Button>

                <div className="space-y-4 text-center">
                  <Button
                    variant="link"
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => navigate("/forgot-password")}
                  >
                    Passwort vergessen?
                  </Button>
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
          </div>
        </div>
      </div>
    </div>
  );
}
