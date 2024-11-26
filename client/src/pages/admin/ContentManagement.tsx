import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "../../components/layout/AdminLayout";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

const tutorialSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich"),
  description: z.string().min(1, "Beschreibung ist erforderlich"),
  videoUrl: z.string().url("Gültige Video-URL erforderlich"),
  category: z.string().min(1, "Kategorie ist erforderlich"),
  isOnboarding: z.boolean(),
  order: z.number().min(0),
});

export default function ContentManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof tutorialSchema>>({
    resolver: zodResolver(tutorialSchema),
    defaultValues: {
      title: "",
      description: "",
      videoUrl: "",
      category: "",
      isOnboarding: false,
      order: 0,
    },
  });

  const { data: tutorials } = useQuery({
    queryKey: ["tutorials"],
    queryFn: async () => {
      const res = await fetch("/api/tutorials");
      return res.json();
    },
  });

  const createTutorial = useMutation({
    mutationFn: async (values: z.infer<typeof tutorialSchema>) => {
      const res = await fetch("/api/tutorials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutorials"] });
      toast({
        title: "Erfolg",
        description: "Tutorial wurde erstellt",
      });
      form.reset();
    },
  });

  async function onSubmit(values: z.infer<typeof tutorialSchema>) {
    try {
      setIsLoading(true);
      await createTutorial.mutateAsync(values);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Tutorial konnte nicht erstellt werden",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Tutorial-Verwaltung</h1>
          <p className="text-muted-foreground">
            Erstellen und verwalten Sie Tutorials für Ihre Kunden
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold mb-4">Neues Tutorial</h2>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titel</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beschreibung</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="videoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video-URL</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategorie</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wählen Sie eine Kategorie" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="onboarding">Onboarding</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="sales">Vertrieb</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isOnboarding"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Teil des Onboarding-Prozesses</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Erstelle..." : "Tutorial erstellen"}
                </Button>
              </form>
            </Form>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Vorhandene Tutorials</h2>
            <div className="space-y-4">
              {tutorials?.map((tutorial: any) => (
                <div
                  key={tutorial.id}
                  className="p-4 border rounded-lg bg-card"
                >
                  <h3 className="font-medium">{tutorial.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {tutorial.description}
                  </p>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      {tutorial.category}
                    </span>
                    {tutorial.isOnboarding && (
                      <span className="text-xs bg-orange-500/10 text-orange-500 px-2 py-1 rounded">
                        Onboarding
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
