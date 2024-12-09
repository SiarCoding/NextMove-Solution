import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(1, "Passwort wird benötigt"),
});

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      await login(values.email, values.password, "admin");
      
      // Warte kurz, bis die Session aktualisiert ist
      await new Promise(resolve => setTimeout(resolve, 100));
      navigate("/admin");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Ungültige Anmeldedaten",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-black">
      {/* Linke Seite - Bild */}
      <div className="hidden lg:block w-1/2 relative">
        <img
          src="/admin.jpg"
          alt="Admin Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Rechte Seite - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col px-8 lg:px-16 py-16">
        <div className="mb-12">
          <img
            src="/logo.jpg"
            alt="Logo"
            className="h-24 w-auto mb-8"
          />
          <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
            Admin Portal
          </h1>
          <p className="text-lg text-muted-foreground">
            Melden Sie sich als Administrator an
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-Mail</FormLabel>
                  <FormControl>
                    <Input placeholder="" {...field} />
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
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Anmeldung..." : "Anmelden"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
