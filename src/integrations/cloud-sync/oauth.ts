/**
 * Anmeldung bei OneDrive und Google Drive im Browser (OAuth 2.0 mit PKCE,
 * ohne Client-Secret). Die Client-IDs kommen aus der Umgebung; solange sie
 * fehlen, gelten die Dienste als „noch nicht eingerichtet“.
 */
import type { CloudProviderId } from "./types";

export type OAuthProviderId = Exclude<CloudProviderId, "webdav">;

type OAuthEndpoints = {
  authorize: string;
  token: string;
  scope: string;
};

export const OAUTH_ENDPOINTS: Record<OAuthProviderId, OAuthEndpoints> = {
  onedrive: {
    authorize: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    // Nur der eigene App-Ordner, kein Zugriff auf andere Dateien.
    scope: "Files.ReadWrite.AppFolder offline_access",
  },
  "google-drive": {
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    // Versteckter App-Datenordner, kein Zugriff auf andere Dateien.
    scope: "https://www.googleapis.com/auth/drive.appdata",
  },
};

/** Client-IDs aus der Umgebung (öffentlich, kein Geheimnis). */
export function oauthClientId(provider: OAuthProviderId) {
  const value =
    provider === "onedrive"
      ? process.env["NEXT_PUBLIC_ONEDRIVE_CLIENT_ID"]
      : process.env["NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID"];
  return value?.trim() || null;
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Code-Verifier und -Challenge (S256) für PKCE. */
export async function createPkcePair() {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return { verifier, challenge: base64Url(new Uint8Array(digest)) };
}

/** Adresse der Anmeldeseite des Anbieters. */
export function buildAuthorizeUrl(input: {
  provider: OAuthProviderId;
  clientId: string;
  redirectUri: string;
  challenge: string;
  state: string;
}) {
  const endpoints = OAUTH_ENDPOINTS[input.provider];
  const url = new URL(endpoints.authorize);
  url.search = new URLSearchParams({
    client_id: input.clientId,
    response_type: "code",
    redirect_uri: input.redirectUri,
    scope: endpoints.scope,
    code_challenge: input.challenge,
    code_challenge_method: "S256",
    state: input.state,
    ...(input.provider === "google-drive"
      ? { access_type: "offline", prompt: "consent" }
      : {}),
  }).toString();
  return url.toString();
}

/** Anfrage, die den Rückgabe-Code gegen ein Zugriffstoken tauscht. */
export function tokenRequest(input: {
  provider: OAuthProviderId;
  clientId: string;
  redirectUri: string;
  code: string;
  verifier: string;
}) {
  return {
    url: OAUTH_ENDPOINTS[input.provider].token,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: input.clientId,
        grant_type: "authorization_code",
        code: input.code,
        redirect_uri: input.redirectUri,
        code_verifier: input.verifier,
      }).toString(),
    } satisfies RequestInit,
  };
}
