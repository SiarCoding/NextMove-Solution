// Facebook SDK Types
interface FacebookLoginResponse {
  authResponse?: {
    accessToken: string;
  };
  status?: string;
}

interface FacebookSDK {
  init(params: {
    appId: string;
    cookie?: boolean;
    xfbml?: boolean;
    version: string;
    clientToken?: string;
  }): void;
  
  login(
    callback: (response: FacebookLoginResponse) => void,
    params: { scope: string; return_scopes?: boolean; enable_profile_selector?: boolean }
  ): void;
}

declare global {
  interface Window {
    FB: FacebookSDK;
    fbAsyncInit: () => void;
  }
}

// Initialisiere das Facebook SDK für OAuth und Marketing
export function initFacebookSDK(): Promise<void> {
  return new Promise<void>((resolve) => {
    // Prüfe, ob das SDK bereits geladen ist
    if (window.FB) {
      window.FB.init({
        appId: import.meta.env.VITE_FACEBOOK_MARKETING_APP_ID,
        clientToken: import.meta.env.VITE_FACEBOOK_MARKETING_CLIENT_TOKEN,
        cookie: true,
        xfbml: true,
        version: 'v18.0'
      });
      resolve();
      return;
    }

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: import.meta.env.VITE_FACEBOOK_MARKETING_APP_ID,
        clientToken: import.meta.env.VITE_FACEBOOK_MARKETING_CLIENT_TOKEN,
        cookie: true,
        xfbml: true,
        version: 'v18.0'
      });
      resolve();
    };

    // Lade das SDK asynchron
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/de_DE/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  });
}

// Vereinfachter Login für Meta Business API
export async function connectToMetaAPI(): Promise<void> {
  try {
    console.log('Starting Meta API connection...');
    
    // Initialisiere das SDK, falls noch nicht geschehen
    await initFacebookSDK();
    console.log('Facebook SDK initialized');

    // Direkter Login mit minimalen Berechtigungen
    const accessToken = await new Promise<string>((resolve, reject) => {
      window.FB.login(
        (response: FacebookLoginResponse) => {
          if (response.authResponse?.accessToken) {
            resolve(response.authResponse.accessToken);
          } else {
            reject(new Error('Facebook login failed'));
          }
        },
        {
          scope: 'ads_read,business_management', // Minimale Berechtigungen für Business Integration
          return_scopes: true, // Zeigt an, welche Berechtigungen gewährt wurden
          enable_profile_selector: true, // Erlaubt Auswahl des Business-Accounts
        }
      );
    });

    console.log('Got access token:', accessToken.substring(0, 10) + '...');
    
    // Sende den Token an unseren Backend-Server
    console.log('Sending token to backend...');
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

    console.log('Meta connection successful!');
    // Aktualisiere die UI oder zeige eine Erfolgsmeldung
    window.location.reload();
  } catch (error) {
    console.error('Error connecting to Meta:', error);
    throw error;
  }
}
