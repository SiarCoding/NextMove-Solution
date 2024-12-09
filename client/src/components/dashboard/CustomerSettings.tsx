import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Upload, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ChecklistEditor } from "./ChecklistEditor";

const customerSettingsSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Aktuelles Passwort ist erforderlich"),
  newPassword: z.string().min(8, "Neues Passwort muss mindestens 8 Zeichen lang sein"),
  confirmPassword: z.string().min(1, "Passwort bestätigen ist erforderlich"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwörter stimmen nicht überein",
  path: ["confirmPassword"],
});

export function CustomerSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { user, refetchUser } = useAuth();

  // Sofortiges Update des Bildes in allen Komponenten
  const updateUserImageInCache = (imageUrl: string) => {
    queryClient.setQueryData(["user"], (oldData: any) => ({
      ...oldData,
      profileImage: imageUrl,
    }));
    queryClient.setQueryData(["session"], (oldData: any) => ({
      ...oldData,
      user: {
        ...(oldData?.user || {}),
        profileImage: imageUrl,
      },
    }));
  };

  const form = useForm<z.infer<typeof customerSettingsSchema>>({
    resolver: zodResolver(customerSettingsSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordChangeSchema>>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Mutation für das Aktualisieren der Benutzerinformationen
  const updateUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof customerSettingsSchema>) => {
      const res = await fetch("/api/customer/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Fehler beim Aktualisieren der Einstellungen");
      }
      return res.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
      toast({
        title: "Erfolg",
        description: "Ihre Einstellungen wurden aktualisiert",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message || "Fehler beim Aktualisieren der Einstellungen",
      });
    },
  });

  // Mutation für das Hochladen des Profilbilds
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("profileImage", file);

      const res = await fetch("/api/customer/profile-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Fehler beim Hochladen des Bildes");
      }
      return res.json();
    },
    onSuccess: async (data) => {
      // Sofortiges Update des Bildes im Cache
      updateUserImageInCache(data.imageUrl);
      
      // Dann Refetch für vollständige Synchronisation
      await refetchUser();
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
      
      toast({
        title: "Erfolg",
        description: "Profilbild wurde aktualisiert",
      });
      setProfileImage(null);
      setPreviewUrl("");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message || "Fehler beim Hochladen des Bildes",
      });
    },
  });

  const changePassword = useMutation({
    mutationFn: async (values: z.infer<typeof passwordChangeSchema>) => {
      const res = await fetch("/api/customer/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
        credentials: 'include'
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Passwort konnte nicht geändert werden");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Erfolg",
        description: "Passwort wurde erfolgreich geändert",
      });
      setIsChangingPassword(false);
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message,
      });
    },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (profileImage) {
      setUploading(true);
      try {
        await uploadImageMutation.mutateAsync(profileImage);
      } finally {
        setUploading(false);
      }
    }
  };

  const onSubmit = async (data: z.infer<typeof customerSettingsSchema>) => {
    await updateUserMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Persönliche Informationen</h2>
        <p className="text-sm text-muted-foreground">
          Verwalten Sie Ihre persönlichen Informationen und Einstellungen.
        </p>
      </div>
      
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Profilbild</CardTitle>
          <CardDescription>
            Laden Sie ein Profilbild hoch oder ändern Sie es
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative h-20 w-20">
              {previewUrl || user?.profileImage ? (
                <img
                  src={previewUrl || user?.profileImage || undefined}
                  alt="Profilbild"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10">
                  <User className="h-8 w-8 text-primary" />
                </div>
              )}
            </div>
            <div className="flex flex-col space-y-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full max-w-xs"
              />
              {profileImage && (
                <Button
                  onClick={handleImageUpload}
                  disabled={uploading}
                  className="w-full max-w-xs"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird hochgeladen...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Bild hochladen
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Persönliche Informationen</CardTitle>
          <CardDescription>
            Aktualisieren Sie Ihre persönlichen Daten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vorname</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!isEditing} />
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
                      <Input {...field} disabled={!isEditing} />
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
                      <Input {...field} type="email" disabled={!isEditing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      type="button"
                    >
                      Abbrechen
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateUserMutation.isPending}
                    >
                      {updateUserMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Wird gespeichert...
                        </>
                      ) : (
                        "Speichern"
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setIsEditing(true)}
                    type="button"
                  >
                    Bearbeiten
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <ChecklistEditor />

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Passwort ändern</CardTitle>
              <CardDescription>
                Ändern Sie Ihr Passwort für mehr Sicherheit
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setIsChangingPassword(!isChangingPassword);
                if (!isChangingPassword) {
                  passwordForm.reset();
                }
              }}
            >
              {isChangingPassword ? "Abbrechen" : "Passwort ändern"}
            </Button>
          </div>
        </CardHeader>
        {isChangingPassword && (
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <Input
                  type="password"
                  placeholder="Aktuelles Passwort"
                  {...passwordForm.register("currentPassword")}
                />
                <Input
                  type="password"
                  placeholder="Neues Passwort"
                  {...passwordForm.register("newPassword")}
                />
                <Input
                  type="password"
                  placeholder="Neues Passwort bestätigen"
                  {...passwordForm.register("confirmPassword")}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={passwordForm.handleSubmit((values) => changePassword.mutate(values))}
                  disabled={
                    !passwordForm.watch("currentPassword") || 
                    !passwordForm.watch("newPassword") || 
                    !passwordForm.watch("confirmPassword")
                  }
                >
                  {changePassword.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird geändert...
                    </>
                  ) : (
                    "Passwort ändern"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
