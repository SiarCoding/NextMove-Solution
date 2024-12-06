import { useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { GoogleDrivePicker } from "@/components/google-drive/GoogleDrivePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function ContentManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<{
    id: string;
    name: string;
    mimeType: string;
    embedUrl?: string;
  } | null>(null);

  const [videoType, setVideoType] = useState<'onboarding' | 'tutorial'>('tutorial');
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (values: {
      file: File;
      thumbnail?: File | null;
      title: string;
      description: string;
      type: 'tutorial' | 'onboarding';
    }) => {
      const formData = new FormData();
      formData.append('file', values.file);
      if (values.thumbnail) {
        formData.append('thumbnail', values.thumbnail);
      }
      formData.append('title', values.title);
      formData.append('description', values.description);
      formData.append('type', values.type);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Upload fehlgeschlagen");
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Erfolg",
        description: "Video erfolgreich hochgeladen",
      });
      setVideoTitle("");
      setVideoDescription("");
      setVideoFile(null);
      setThumbnailFile(null);
      queryClient.invalidateQueries({ queryKey: ["tutorials"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message || "Fehler beim Hochladen",
      });
    },
  });

  const handleTutorialUpload = async () => {
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Bitte wählen Sie eine Datei aus",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile as unknown as Blob);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('type', 'tutorial');

    try {
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload fehlgeschlagen');
      }

      toast({
        title: "Erfolg",
        description: "Tutorial wurde erfolgreich hochgeladen",
      });

      setTitle("");
      setDescription("");
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["tutorials"] });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : 'Upload fehlgeschlagen',
        variant: "destructive",
      });
    }
  };

  const handleVideoUpload = async () => {
    if (!videoFile) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Bitte wählen Sie ein Video aus",
      });
      return;
    }

    if (videoType === 'tutorial' && !thumbnailFile) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Bitte wählen Sie ein Thumbnail für das Tutorial aus",
      });
      return;
    }

    uploadMutation.mutate({
      file: videoFile,
      thumbnail: thumbnailFile,
      title: videoTitle,
      description: videoDescription,
      type: videoType,
    });
  };

  const { data: videos, isLoading: isLoadingVideos } = useQuery({
    queryKey: ['admin-videos'],
    queryFn: async () => {
      const response = await fetch('/api/admin/videos');
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      return response.json();
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/videos/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Fehler beim Löschen des Videos');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Erfolg",
        description: "Video wurde erfolgreich gelöscht",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error.message || "Fehler beim Löschen des Videos",
      });
    },
  });

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Content Management</CardTitle>
            <CardDescription>
              Laden Sie hier neue Tutorials oder Onboarding-Materialien hoch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titel</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titel des Tutorials"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Beschreibung des Tutorials"
                />
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label>Google Drive Datei</Label>
                <GoogleDrivePicker
                  onFileSelect={setSelectedFile}
                  buttonLabel={selectedFile ? `Ausgewählte Datei: ${selectedFile.name}` : "Datei aus Google Drive auswählen"}
                />
              </div>

              {selectedFile && (
                <Button
                  onClick={handleTutorialUpload}
                  className="w-full"
                >
                  Tutorial hochladen
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Video hochladen</CardTitle>
            <CardDescription>
              Laden Sie ein Video von Ihrem Computer hoch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Video Typ</Label>
                <Select value={videoType} onValueChange={(value: 'tutorial' | 'onboarding') => setVideoType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen Sie den Video-Typ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutorial">Tutorial</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Video Titel</Label>
                <Input
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Video Titel eingeben"
                />
              </div>

              <div>
                <Label>Video Beschreibung</Label>
                <Textarea
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="Video Beschreibung eingeben"
                />
              </div>

              <div>
                <Label>Video Datei</Label>
                <Input
                  type="file"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  accept="video/*"
                />
              </div>

              {videoType === 'tutorial' && (
                <div>
                  <Label>Thumbnail (nur für Tutorials)</Label>
                  <Input
                    type="file"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                    accept="image/*"
                  />
                </div>
              )}

              <Button
                onClick={handleVideoUpload}
                disabled={uploadMutation.isPending}
                className="w-full"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird hochgeladen...
                  </>
                ) : (
                  'Video hochladen'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Video List */}
        <Card>
          <CardHeader>
            <CardTitle>Hochgeladene Videos</CardTitle>
            <CardDescription>
              Übersicht aller hochgeladenen Videos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingVideos ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : videos && videos.length > 0 ? (
              <div className="relative overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titel</TableHead>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Erstellt am</TableHead>
                      <TableHead className="w-[100px]">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {videos.map((video: any) => (
                      <TableRow key={video.id}>
                        <TableCell className="font-medium">{video.title}</TableCell>
                        <TableCell>{video.description}</TableCell>
                        <TableCell>
                          {video.isOnboarding ? 'Onboarding' : 'Tutorial'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(video.createdAt), 'PPp', { locale: de })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => {
                              if (window.confirm('Möchten Sie dieses Video wirklich löschen?')) {
                                deleteVideoMutation.mutate(video.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Keine Videos vorhanden
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
