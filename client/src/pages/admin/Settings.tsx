import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "../../components/layout/AdminLayout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Upload } from "lucide-react";

const companySettingsSchema = z.object({
  companyName: z.string().min(1, "Firmenname ist erforderlich"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  phone: z.string().min(1, "Telefonnummer ist erforderlich"),
  address: z.string().min(1, "Adresse ist erforderlich"),
});

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      console.log("Settings fetched:", data);
      return data;
    },
    gcTime: 0,
    staleTime: 0
  });

  const form = useForm<z.infer<typeof companySettingsSchema>>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      companyName: "",
      email: "admin@nextmove.de",
      phone: "",
      address: "",
    },
  });

  // Update form when data is loaded
  useEffect(() => {
    if (settingsData) {
      form.reset({
        companyName: settingsData.companyName || "",
        email: settingsData.email || "",
        phone: settingsData.phone || "",
        address: settingsData.address || "",
      });
      setPreviewUrl(settingsData.logoUrl || "");
    }
  }, [settingsData, form]);

  const updateSettings = useMutation({
    mutationFn: async (values: z.infer<typeof companySettingsSchema>) => {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        credentials: 'include'
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast({
        title: "Erfolg",
        description: "Einstellungen wurden aktualisiert",
      });
      setIsEditing(false);
    },
  });

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", logoFile);

      const res = await fetch("/api/admin/logo", {
        method: "POST",
        body: formData,
        credentials: 'include'
      });

      if (!res.ok) throw new Error();

      toast({
        title: "Erfolg",
        description: "Logo wurde hochgeladen",
      });
      
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      setLogoFile(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Logo konnte nicht hochgeladen werden",
      });
    } finally {
      setUploading(false);
    }
  };

  async function onSubmit(values: z.infer<typeof companySettingsSchema>) {
    setLoading(true);
    try {
      await updateSettings.mutateAsync(values);
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div>Lädt...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-[#25262b] rounded-xl shadow-lg p-8">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-2xl font-bold text-foreground">
                Profileinstellungen
              </h1>
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-primary hover:bg-primary/90"
                >
                  Bearbeiten
                </Button>
              )}
            </div>

            {/* Logo Upload */}
            <div className="mb-8 flex items-center space-x-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                  {(previewUrl || settingsData?.logoUrl) ? (
                    <img
                      src={previewUrl || settingsData?.logoUrl}
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>
                {isEditing && (
                  <label
                    htmlFor="logo-upload"
                    className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-primary-foreground" />
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground">Logo</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG oder GIF, maximal 10MB
                </p>
                {logoFile && (
                  <Button
                    onClick={handleLogoUpload}
                    disabled={uploading}
                    size="sm"
                    className="mt-2"
                  >
                    {uploading ? "Wird hochgeladen..." : "Hochladen"}
                  </Button>
                )}
              </div>
            </div>

            {isEditing ? (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">
                      Firmenname
                    </label>
                    <Input
                      {...form.register("companyName")}
                      className="bg-[#1a1b1e] border-border"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">
                      E-Mail
                    </label>
                    <Input
                      {...form.register("email")}
                      className="bg-[#1a1b1e] border-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">
                      Telefon
                    </label>
                    <Input
                      {...form.register("phone")}
                      className="bg-[#1a1b1e] border-border"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">
                      Adresse
                    </label>
                    <Input
                      {...form.register("address")}
                      className="bg-[#1a1b1e] border-border"
                    />
                  </div>
                </div>

                <div className="pt-6 flex space-x-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    {loading ? "Wird gespeichert..." : "Änderungen speichern"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsEditing(false)}
                    className="flex-1"
                  >
                    Abbrechen
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">
                      Firmenname
                    </label>
                    <p className="text-foreground">{form.getValues("companyName")}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">
                      E-Mail
                    </label>
                    <p className="text-foreground">{form.getValues("email")}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">
                      Telefon
                    </label>
                    <p className="text-foreground">{form.getValues("phone")}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">
                      Adresse
                    </label>
                    <p className="text-foreground">{form.getValues("address")}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
