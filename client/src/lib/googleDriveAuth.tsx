import React, { createContext, useState, useContext, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface GoogleAuthContextType {
  isConnected: boolean;
  token: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
  isInitialized: boolean;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | null>(null);

export function GoogleAuthProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  const handleAuthSuccess = async (response: any) => {
    const accessToken = response.access_token;
    setToken(accessToken);
    setIsConnected(true);
    
    // Speichern Sie die Tokens auf dem Server
    try {
      const res = await fetch('/api/admin/google-drive/save-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: accessToken,
          refreshToken: response.refresh_token,
          expiryDate: new Date(Date.now() + response.expires_in * 1000).toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save tokens');
      }

      toast({
        title: "Erfolg",
        description: "Erfolgreich mit Google Drive verbunden",
      });
    } catch (error) {
      console.error('Error saving tokens:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fehler beim Speichern der Google Drive Verbindung",
      });
    }
  };

  const signIn = async () => {
    if (!isInitialized) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Google API wird noch initialisiert, bitte warten Sie einen Moment",
      });
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initCodeClient({
        client_id: 'YOUR_CLIENT_ID', // Ersetzen Sie dies durch Ihre tatsächliche Client ID
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
        ux_mode: 'popup',
        callback: async (response: any) => {
          if (response.code) {
            // Tauschen Sie den Code gegen Tokens aus
            const tokenResponse = await fetch('/api/admin/google-drive/exchange-code', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ code: response.code }),
            });

            if (tokenResponse.ok) {
              const tokens = await tokenResponse.json();
              handleAuthSuccess(tokens);
            } else {
              throw new Error('Failed to exchange code for tokens');
            }
          }
        },
      });

      client.requestCode();
    } catch (error) {
      console.error('Error signing in:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fehler bei der Google Anmeldung",
      });
    }
  };

  const signOut = async () => {
    try {
      await fetch('/api/admin/google-drive/disconnect', { method: 'POST' });
      setToken(null);
      setIsConnected(false);
      
      toast({
        title: "Erfolg",
        description: "Erfolgreich abgemeldet",
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fehler beim Abmelden",
      });
    }
  };

  useEffect(() => {
    const loadGoogleAPI = async () => {
      try {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = reject;
          document.body.appendChild(script);
        });

        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing Google API:', error);
        toast({
          variant: "destructive",
          title: "Fehler",
          description: "Fehler beim Initialisieren der Google API",
        });
      }
    };

    loadGoogleAPI();

    return () => {
      const scripts = document.querySelectorAll('script[src*="google"]');
      scripts.forEach(script => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
    };
  }, []);

  useEffect(() => {
    const checkConnectionStatus = async () => {
      try {
        const response = await fetch('/api/admin/google-drive/status');
        if (response.ok) {
          const data = await response.json();
          setIsConnected(data.isConnected);
          setToken(data.accessToken);
        }
      } catch (error) {
        console.error('Error checking connection status:', error);
      }
    };

    checkConnectionStatus();
  }, []);

  return (
    <GoogleAuthContext.Provider value={{ isConnected, token, signIn, signOut, isInitialized }}>
      {children}
    </GoogleAuthContext.Provider>
  );
}

export function useGoogleAuth() {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error('useGoogleAuth must be used within a GoogleAuthProvider');
  }
  return context;
}