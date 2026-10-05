/**
 * Google-Anmeldung im Browser über Google Identity Services (Token-Modell).
 * Es braucht nur die öffentliche Client-ID und die erlaubte JavaScript-Quelle,
 * kein Client-Secret. Zugriffstoken gelten eine Stunde; ein neues gibt es
 * über ein kurzes Popup, das ein Klick auslösen muss.
 */
import { OAUTH_ENDPOINTS } from "./oauth";
import { CloudSyncError } from "./types";

type TokenResponse = {
  access_token?: string;
  expires_in?: number | string;
  error?: string;
};

type TokenClient = {
  requestAccessToken(options?: { prompt?: string }): void;
};

type GoogleAccounts = {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: { type?: string }) => void;
      }): TokenClient;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

const SCRIPT_URL = "https://accounts.google.com/gsi/client";

let scriptPromise: Promise<GoogleAccounts> | null = null;

/** Skript von Google einmal laden. */
export function loadGoogleIdentity(): Promise<GoogleAccounts> {
  if (window.google?.accounts) return Promise.resolve(window.google);
  scriptPromise ??= new Promise<GoogleAccounts>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () =>
      window.google?.accounts
        ? resolve(window.google)
        : reject(new Error("missing"));
    script.onerror = () => reject(new Error("blocked"));
    document.head.appendChild(script);
  }).catch((cause: unknown) => {
    scriptPromise = null;
    throw new CloudSyncError(
      "network",
      "Google Drive ist nicht erreichbar. Bitte Verbindung prüfen und ggf. Werbe- oder Skriptblocker für diese Seite ausschalten.",
      { cause },
    );
  });
  return scriptPromise;
}

/** Zugriffstoken anfordern; `prompt: ""` fragt nur nach, wenn nötig. */
export async function requestGoogleToken(
  clientId: string,
  prompt: "" | "consent",
  load: () => Promise<GoogleAccounts> = loadGoogleIdentity,
) {
  const google = await load();
  return new Promise<{ accessToken: string; expiresIn: number }>(
    (resolve, reject) => {
      const denied = () =>
        reject(
          new CloudSyncError(
            "unauthorized",
            "Google Drive: Die Anmeldung wurde abgebrochen oder das Fenster blockiert. Bitte erneut verbinden.",
          ),
        );
      google.accounts.oauth2
        .initTokenClient({
          client_id: clientId,
          scope: OAUTH_ENDPOINTS["google-drive"].scope,
          callback: (response) => {
            if (!response.access_token || response.error) return denied();
            resolve({
              accessToken: response.access_token,
              expiresIn: Number(response.expires_in) || 3600,
            });
          },
          error_callback: denied,
        })
        .requestAccessToken({ prompt });
    },
  );
}
