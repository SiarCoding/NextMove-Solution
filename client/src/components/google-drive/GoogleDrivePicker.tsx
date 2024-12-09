import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGoogleAuth } from '@/lib/googleDriveAuth';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GoogleDrivePickerProps {
  onFileSelect: (file: {
    id: string;
    name: string;
    mimeType: string;
    embedUrl?: string;
  }) => void;
  buttonLabel?: string;
}

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

export function GoogleDrivePicker({ onFileSelect, buttonLabel = "Datei aus Google Drive auswählen" }: GoogleDrivePickerProps) {
  const { isConnected, token, signIn, isInitialized } = useGoogleAuth();
  const [isPickerLoading, setIsPickerLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isConnected && token) {
      loadPicker();
    }
  }, [isConnected, token]);

  const loadPicker = async () => {
    try {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          window.gapi.load('picker', { callback: resolve });
        };
        script.onerror = reject;
        document.body.appendChild(script);
      });
    } catch (error) {
      console.error('Error loading picker:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fehler beim Laden des Google Drive Pickers",
      });
    }
  };

  const openPicker = async () => {
    if (!isConnected || !token) {
      await signIn();
      return;
    }

    setIsPickerLoading(true);

    try {
      const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(token)
        .setCallback((data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const doc = data.docs[0];
            onFileSelect({
              id: doc.id,
              name: doc.name,
              mimeType: doc.mimeType,
              embedUrl: doc.embedUrl,
            });
          }
        })
        .build();
      picker.setVisible(true);
    } catch (error) {
      console.error('Error opening picker:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fehler beim Öffnen des Google Drive Pickers",
      });
    } finally {
      setIsPickerLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <Button disabled className="bg-primary hover:bg-primary/90 text-primary-foreground w-fit">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Google API wird initialisiert...
      </Button>
    );
  }

  return (
    <Button 
      onClick={openPicker}
      disabled={isPickerLoading}
      className="bg-primary hover:bg-primary/90 text-primary-foreground inline-flex items-center gap-2 w-fit"
    >
      {isPickerLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <img src="https://www.google.com/favicon.ico" alt="Google Drive" className="h-4 w-4" />
      )}
      {buttonLabel}
    </Button>
  );
}