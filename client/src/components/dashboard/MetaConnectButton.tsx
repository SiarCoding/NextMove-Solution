import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { initFacebookSDK } from "@/lib/facebook-sdk";

const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;

if (!FACEBOOK_APP_ID) {
  console.error('Facebook App ID ist nicht in den Umgebungsvariablen definiert');
}

export function MetaConnectButton() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    initFacebookSDK().catch(console.error);
  }, []);

  const connectMutation = useMutation({
    mutationFn: async (accessToken: string) => {
      const response = await fetch('/api/meta/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to connect Meta account');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const handleMetaLogin = () => {
    if (!window.FB) {
      console.error('Facebook SDK nicht geladen');
      return;
    }

    window.FB.login((response) => {
      if (response.authResponse?.accessToken) {
        connectMutation.mutate(response.authResponse.accessToken);
      }
    }, { scope: 'ads_read,ads_management' });
  };

  if (user?.metaConnected) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center space-y-4">
        <h2 className="text-2xl font-bold">Verbinde dein Meta Ads Konto</h2>
        <p className="text-gray-600">
          Verbinde dein Meta Ads Konto, um deine Performance-Metriken in Echtzeit zu sehen.
        </p>
        <Button 
          onClick={handleMetaLogin}
          className="w-full"
          size="lg"
        >
          Mit Meta Ads verbinden
        </Button>
      </div>
    </div>
  );
}
