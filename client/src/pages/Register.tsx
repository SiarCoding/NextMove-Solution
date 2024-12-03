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
import { Shield, Globe } from "lucide-react";

const registerSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
  confirmPassword: z.string().min(1, "Passwort bestätigen ist erforderlich"),
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  companyName: z.string().min(1, "Firmenname ist erforderlich"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwörter stimmen nicht überein",
  path: ["confirmPassword"],
});

export default function Register() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      companyName: "",
    },
  });

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          firstName: values.firstName,
          lastName: values.lastName,
          companyName: values.companyName,
        }),
      });

      if (!res.ok) throw new Error();

      toast({
        title: "Registrierung erfolgreich!",
        description: "Warten Sie die Freigabe vom Admin",
        className: "bg-primary text-primary-foreground",
      });
      navigate("/");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Registrierung fehlgeschlagen",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#1a1b1e] to-[#2d2e32]">
      {/* Left side */}
      <div className="flex-1 flex flex-col px-16 py-16">
        <div className="flex items-center space-x-4 mb-20">
          <div className="h-24 w-24 rounded-full overflow-hidden ring-2 ring-primary/20 bg-black">
            <img
              src="/logo.jpg"
              alt="NextMove Logo"
              className="h-full w-full object-contain p-1"
            />
          </div>
          <span className="text-white text-2xl font-bold tracking-tight">
            NextMove Solution
          </span>
        </div>

        <div className="mb-20">
          <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
            Willkommen zum Kundenportal
          </h1>
          <p className="text-lg text-muted-foreground">
            Erstellen Sie einen neuen Account
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

      {/* Right side - Registration Form */}
      <div className="flex-1 flex flex-col justify-center px-12">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-[#25262b] rounded-xl p-8 shadow-2xl border border-border">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vorname</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Max" 
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
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nachname</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Mustermann" 
                            className="bg-[#1a1b1e] border-border"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Firmenname</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Musterfirma GmbH" 
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
                          placeholder="Mindestens 8 Zeichen"
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
                          placeholder="Passwort wiederholen"
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
                  {isLoading ? "Registriere..." : "Registrieren"}
                </Button>

                <div className="text-center">
                  <Button
                    variant="link"
                    onClick={() => navigate("/")}
                    className="text-muted-foreground hover:text-primary"
                  >
                    Zurück zum Login
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
