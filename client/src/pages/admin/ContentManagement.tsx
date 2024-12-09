import { useState, useEffect } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, MoreHorizontal } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Video {
  id: number;
  title: string;
  description: string;
  isOnboarding?: boolean;
  videoUrl: string;
  thumbnailUrl?: string;
  createdAt: string;
  category?: string;
}

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
  const [videoCategory, setVideoCategory] = useState("Grundlagen");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (videoFile) {
      const newUrl = URL.createObjectURL(videoFile);
      setVideoPreviewUrl(newUrl);
      return () => URL.revokeObjectURL(newUrl);
    } else {
      setVideoPreviewUrl(null);
    }
  }, [videoFile]);

  useEffect(() => {
    if (thumbnailFile) {
      const newUrl = URL.createObjectURL(thumbnailFile);
      setThumbnailPreviewUrl(newUrl);
      return () => URL.revokeObjectURL(newUrl);
    } else {
      setThumbnailPreviewUrl(null);
    }
  }, [thumbnailFile]);

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoPreviewUrl(null);
  };

  const handleRemoveThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreviewUrl(null);
  };

  const uploadMutation = useMutation({
    mutationFn: async (values: {
      file: File;
      thumbnail?: File | null;
      title: string;
      description: string;
      isOnboarding: boolean;
      category: string;
    }) => {
      const formData = new FormData();
      formData.append('file', values.file);
      if (values.thumbnail) {
        formData.append('thumbnail', values.thumbnail);
      }
      formData.append('title', values.title);
      formData.append('description', values.description);
      formData.append('type', values.isOnboarding ? 'onboarding' : 'tutorial');
      formData.append('category', values.category);

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
    formData.append('category', 'Grundlagen');

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

    if (!thumbnailFile) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Bitte wählen Sie ein Thumbnail für das Video aus",
      });
      return;
    }

    uploadMutation.mutate({
      file: videoFile,
      thumbnail: thumbnailFile,
      title: title,
      description: description,
      isOnboarding: videoType === 'onboarding',
      category: videoType === 'tutorial' ? videoCategory : 'Onboarding'
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
      <div className="h-full p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Management</CardTitle>
              <CardDescription>
                Laden Sie hier neue Tutorials oder Onboarding-Materialien hoch
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full gap-8">
                <div>
                  <Label>Video Typ</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="tutorial"
                        name="videoType"
                        value="tutorial"
                        checked={videoType === 'tutorial'}
                        onChange={(e) => setVideoType(e.target.value as 'tutorial' | 'onboarding')}
                        style={{ accentColor: '#ff5733' }}
                        className="h-4 w-4 border-gray-300"
                      />
                      <label htmlFor="tutorial">Tutorial</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="onboarding"
                        name="videoType"
                        value="onboarding"
                        checked={videoType === 'onboarding'}
                        onChange={(e) => setVideoType(e.target.value as 'tutorial' | 'onboarding')}
                        style={{ accentColor: '#ff5733' }}
                        className="h-4 w-4 border-gray-300"
                      />
                      <label htmlFor="onboarding">Onboarding</label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="title">Titel</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Video Titel"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Beschreibung</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Video Beschreibung"
                  />
                </div>

                {videoType === 'tutorial' && (
                  <div>
                    <Label>Kategorie</Label>
                    <Select
                      value={videoCategory}
                      onValueChange={(value) => setVideoCategory(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wähle eine Kategorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Einführung">Einführung</SelectItem>
                        <SelectItem value="Grundlagen">Grundlagen</SelectItem>
                        <SelectItem value="Fortgeschritten">Fortgeschritten</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="mt-2">
                  <GoogleDrivePicker
                    onFileSelect={(file) => setSelectedFile(file)}
                    buttonLabel="Google Drive"
                  />
                </div>

                <div>
                  <Label>Thumbnail</Label>
                  <div className="mt-2">
                    {!thumbnailFile ? (
                      <div className="flex items-center justify-center w-full">
                        <label htmlFor="thumbnail-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-[#1a1b1e] hover:bg-[#25262b] border-border">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg className="w-8 h-8 mb-4 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                            </svg>
                            <p className="mb-2 text-sm text-gray-400">
                              <span className="font-semibold">Thumbnail hochladen</span>
                            </p>
                            <p className="text-xs text-gray-400">PNG, JPG oder andere Bildformate</p>
                          </div>
                          <Input
                            id="thumbnail-upload"
                            type="file"
                            onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                            accept="image/*"
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="flex items-start gap-4 p-4 rounded-lg bg-[#1a1b1e]">
                        {thumbnailPreviewUrl && (
                          <img
                            src={thumbnailPreviewUrl}
                            alt="Thumbnail Vorschau"
                            className="w-32 h-24 object-cover rounded"
                          />
                        )}
                        <div className="flex flex-col gap-1 flex-grow">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium">{thumbnailFile.name}</p>
                              <p className="text-xs text-gray-400">{(thumbnailFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                            <div className="relative">
                              <Button variant="outline" size="sm" className="h-8" onClick={() => document.getElementById('thumbnail-change')?.click()}>
                                Ändern
                              </Button>
                              <Input
                                id="thumbnail-change"
                                type="file"
                                onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                                accept="image/*"
                                className="hidden"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Video</Label>
                  <div className="mt-2">
                    {!videoFile && !selectedFile ? (
                      <div className="flex items-center justify-center w-full">
                        <label htmlFor="video-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-[#1a1b1e] hover:bg-[#25262b] border-border">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg className="w-8 h-8 mb-4 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                            </svg>
                            <p className="mb-2 text-sm text-gray-400">
                              <span className="font-semibold">Video hochladen</span>
                            </p>
                            <p className="text-xs text-gray-400">MP4, WebM oder andere Videoformate</p>
                          </div>
                          <Input
                            id="video-upload"
                            type="file"
                            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                            accept="video/*"
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedFile ? (
                          <div className="w-64 h-36 bg-black rounded-lg overflow-hidden">
                            <iframe
                              src={selectedFile.embedUrl}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ) : videoFile && (
                          <div className="w-64 h-36 bg-black rounded-lg overflow-hidden">
                            <video
                              src={URL.createObjectURL(videoFile)}
                              controls
                              className="w-full h-full object-contain"
                            >
                              Ihr Browser unterstützt das Video-Format nicht.
                            </video>
                          </div>
                        )}
                        <div className="flex items-start gap-4 p-4 rounded-lg bg-[#1a1b1e]">
                          <div className="flex flex-col gap-1 flex-grow">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium">{selectedFile ? selectedFile.name : videoFile?.name}</p>
                                {videoFile && (
                                  <p className="text-xs text-gray-400">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                )}
                              </div>
                              {!selectedFile && (
                                <div className="relative">
                                  <Button variant="outline" size="sm" className="h-8" onClick={() => document.getElementById('video-change')?.click()}>
                                    Ändern
                                  </Button>
                                  <Input
                                    id="video-change"
                                    type="file"
                                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                                    accept="video/*"
                                    className="hidden"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleVideoUpload}
                  disabled={uploadMutation.isPending}
                  className="w-full mt-4"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Video wird hochgeladen...
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
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Hochgeladene Videos</CardTitle>
                  <CardDescription>
                    Übersicht aller hochgeladenen Videos
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingVideos ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : videos && videos.length > 0 ? (
                <div className="grid gap-4">
                  {videos.map((video: Video) => (
                    <div key={video.id} className="flex items-start gap-4 p-4 rounded-lg bg-[#1a1b1e]">
                      <div className="w-32 h-24 relative group">
                        <video 
                          className="w-full h-full object-cover rounded" 
                          controls
                          muted
                          playsInline
                          poster={!video.isOnboarding ? video.thumbnailUrl || '/placeholder-thumbnail.png' : undefined}
                        >
                          <source src={video.videoUrl} type="video/mp4" />
                          Ihr Browser unterstützt das Video-Tag nicht.
                        </video>
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h4 className="font-medium">{video.title}</h4>
                            <p className="text-sm text-gray-400">{video.description}</p>
                            <div className="flex gap-2 text-xs text-gray-400">
                              <span>{video.isOnboarding ? 'Onboarding' : 'Tutorial'}</span>
                              {!video.isOnboarding && video.category && (
                                <>
                                  <span>•</span>
                                  <span>{video.category}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>{format(new Date(video.createdAt), 'PPp', { locale: de })}</span>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Menu öffnen</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => deleteVideoMutation.mutate(video.id)}
                                className="text-red-500 focus:text-red-500"
                              >
                                Löschen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Keine Videos vorhanden
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
