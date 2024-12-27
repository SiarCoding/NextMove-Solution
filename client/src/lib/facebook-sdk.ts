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
    params: { scope: string }
  ): void;
}

declare global {
  interface Window {
    FB: FacebookSDK;
    fbAsyncInit: () => void;
  }
}

// Initialisiere das Facebook SDK für OAuth
export function initFacebookSDK(): Promise<void> {
  return new Promise<void>((resolve) => {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: import.meta.env.VITE_FACEBOOK_APP_ID, // OAuth App ID (601...)
        clientToken: import.meta.env.VITE_FACEBOOK_CLIENT_TOKEN,
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

// Standard Facebook Login für Benutzerauthentifizierung
export function loginWithFacebook(): Promise<string> {
  return new Promise((resolve, reject) => {
    window.FB.login((response) => {
      if (response.authResponse?.accessToken) {
        resolve(response.authResponse.accessToken);
      } else {
        reject(new Error('Facebook Login fehlgeschlagen'));
      }
    }, {
      scope: 'public_profile,email'  // Nur grundlegende Berechtigungen
    });
  });
}

// Öffne Facebook Business Integration
export function openFacebookBusinessIntegration(businessId: string): void {
  const redirectUri = encodeURIComponent(`${window.location.origin}/auth/facebook/callback`);
  const appId = import.meta.env.VITE_FACEBOOK_MARKETING_APP_ID; // Marketing App ID (607...)
  const scope = encodeURIComponent('business_management,ads_management,ads_read,read_insights');
  
  const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&state=${businessId}`;
  window.open(url, '_blank', 'width=800,height=600');
}

// Initialisiere das Facebook SDK für Marketing API
export function initMarketingAPI(): Promise<void> {
  return new Promise<void>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/de_DE/sdk/marketing.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.FB.init({
        appId: import.meta.env.VITE_FACEBOOK_MARKETING_APP_ID, // Marketing App ID (607...)
        clientToken: import.meta.env.VITE_FACEBOOK_MARKETING_CLIENT_TOKEN,
        version: 'v18.0'
      });
      resolve();
    };
    document.head.appendChild(script);
  });
}
