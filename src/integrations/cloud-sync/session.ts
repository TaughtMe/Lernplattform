/**
 * Anmeldung und Token-Verwaltung für OneDrive und Google Drive im Browser.
 * Verbinden leitet zum Anbieter und über die Rückleitungsseite zurück;
 * danach holt `getAccessToken` bei Bedarf still ein neues Zugriffstoken.
 */
import { requestGoogleToken } from "./google-identity";
import {
  buildAuthorizeUrl,
  createPkcePair,
  tokenRequest,
  type OAuthProviderId,
} from "./oauth";
import { CloudSyncError, networkError } from "./types";

/** Pfad der Rückleitungsseite; bei den Anbietern als Redirect-URI eintragen. */
export const OAUTH_RETURN_PATH = "/sync/rueckkehr";

const PENDING_KEY = "lernraum:cloud-sync:pending";
const TOKENS_KEY = "lernraum:cloud-sync:tokens";
/** Zugriffstoken kurz vor Ablauf erneuern. */
const EXPIRY_MARGIN_MS = 60_000;

type Pending = {
  provider: OAuthProviderId;
  clientId: string;
  verifier: string;
  state: string;
  returnTo: string;
};

type StoredToken = {
  /** Client-ID, mit der verbunden wurde; für das Erneuern ohne Umgebung. */
  clientId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
};

type TokenStore = Partial<Record<OAuthProviderId, StoredToken>>;

type Env = {
  storage: Storage;
  pendingStorage: Storage;
  fetcher: typeof fetch;
  now: () => number;
};

function browserEnv(): Env {
  return {
    storage: window.localStorage,
    pendingStorage: window.sessionStorage,
    fetcher: (...args) => fetch(...args),
    now: () => Date.now(),
  };
}

export function redirectUri(origin = window.location.origin) {
  return `${origin}${OAUTH_RETURN_PATH}`;
}

function readTokens(storage: Storage): TokenStore {
  try {
    const raw = storage.getItem(TOKENS_KEY);
    return raw ? (JSON.parse(raw) as TokenStore) : {};
  } catch {
    return {};
  }
}

function writeTokens(storage: Storage, tokens: TokenStore) {
  storage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export function isConnected(
  provider: OAuthProviderId,
  storage: Storage = window.localStorage,
) {
  return readTokens(storage)[provider] !== undefined;
}

export function disconnect(
  provider: OAuthProviderId,
  storage: Storage = window.localStorage,
) {
  const tokens = readTokens(storage);
  delete tokens[provider];
  writeTokens(storage, tokens);
}

/** Zur Anmeldeseite des Anbieters wechseln. */
export async function startConnect(
  provider: OAuthProviderId,
  clientId: string | null,
  returnTo: string,
  navigate: (url: string) => void = (url) => window.location.assign(url),
  env: Pick<Env, "pendingStorage"> = browserEnv(),
  origin?: string,
) {
  if (!clientId) {
    throw new CloudSyncError(
      "not-configured",
      "Dieses Konto ist noch nicht eingerichtet.",
    );
  }
  const { verifier, challenge } = await createPkcePair();
  const state = crypto.randomUUID();
  const pending: Pending = { provider, clientId, verifier, state, returnTo };
  env.pendingStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  navigate(
    buildAuthorizeUrl({
      provider,
      clientId,
      redirectUri: redirectUri(origin),
      challenge,
      state,
    }),
  );
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
};

async function requestToken(
  provider: OAuthProviderId,
  fetcher: typeof fetch,
  url: string,
  init: RequestInit,
): Promise<TokenResponse> {
  const service = provider === "onedrive" ? "OneDrive" : "Google Drive";
  let response: Response;
  try {
    response = await fetcher(url, init);
  } catch (cause) {
    throw networkError(service, cause);
  }
  const data = (await response.json().catch(() => ({}))) as TokenResponse;
  if (!response.ok || !data.access_token) {
    throw new CloudSyncError(
      "unauthorized",
      `${service}: Die Anmeldung ist fehlgeschlagen oder abgelaufen. Bitte neu verbinden.`,
    );
  }
  return data;
}

function toStored(
  data: TokenResponse,
  clientId: string,
  previous: StoredToken | undefined,
  now: number,
): StoredToken {
  return {
    clientId,
    accessToken: data.access_token ?? "",
    refreshToken: data.refresh_token ?? previous?.refreshToken ?? null,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };
}

/** Rückleitung abschließen: Code gegen Token tauschen und speichern. */
export async function completeConnect(
  search: string,
  env: Env = browserEnv(),
  origin?: string,
): Promise<{ provider: OAuthProviderId; returnTo: string }> {
  const params = new URLSearchParams(search);
  const raw = env.pendingStorage.getItem(PENDING_KEY);
  env.pendingStorage.removeItem(PENDING_KEY);
  const pending = raw ? (JSON.parse(raw) as Pending) : null;
  if (params.get("error")) {
    throw new CloudSyncError(
      "unauthorized",
      "Die Anmeldung wurde abgebrochen oder abgelehnt.",
    );
  }
  const code = params.get("code");
  if (!pending || !code || params.get("state") !== pending.state) {
    throw new CloudSyncError(
      "unauthorized",
      "Die Anmeldung konnte nicht zugeordnet werden. Bitte erneut verbinden.",
    );
  }
  const request = tokenRequest({
    provider: pending.provider,
    clientId: pending.clientId,
    redirectUri: redirectUri(origin),
    code,
    verifier: pending.verifier,
  });
  const data = await requestToken(
    pending.provider,
    env.fetcher,
    request.url,
    request.init,
  );
  writeTokens(env.storage, {
    ...readTokens(env.storage),
    [pending.provider]: toStored(data, pending.clientId, undefined, env.now()),
  });
  return { provider: pending.provider, returnTo: pending.returnTo };
}

type GoogleEnv = Pick<Env, "storage" | "now"> & {
  request?: typeof requestGoogleToken;
};

/** Google: Popup öffnen (nur aus einem Klick heraus) und Token speichern. */
export async function connectGoogle(
  clientId: string | null,
  env: GoogleEnv = browserEnv(),
  prompt: "" | "consent" = "consent",
) {
  if (!clientId) {
    throw new CloudSyncError(
      "not-configured",
      "Dieses Konto ist noch nicht eingerichtet.",
    );
  }
  const { accessToken, expiresIn } = await (env.request ?? requestGoogleToken)(
    clientId,
    prompt,
  );
  writeTokens(env.storage, {
    ...readTokens(env.storage),
    "google-drive": {
      clientId,
      accessToken,
      refreshToken: null,
      expiresAt: env.now() + expiresIn * 1000,
    },
  });
  return accessToken;
}

/** Gültiges Zugriffstoken; erneuert still, sonst Aufforderung zum Neuverbinden. */
export async function getAccessToken(
  provider: OAuthProviderId,
  env: Pick<Env, "storage" | "fetcher" | "now"> & {
    request?: typeof requestGoogleToken;
  } = browserEnv(),
) {
  const tokens = readTokens(env.storage);
  const stored = tokens[provider];
  if (provider === "google-drive") {
    if (!stored) {
      throw new CloudSyncError(
        "unauthorized",
        "Bitte zuerst mit dem Konto verbinden.",
      );
    }
    if (stored.expiresAt - EXPIRY_MARGIN_MS > env.now()) {
      return stored.accessToken;
    }
    // Ohne Refresh-Token: neues Token über Popup, nur nachfragen wenn nötig.
    return connectGoogle(stored.clientId, env, "");
  }
  if (!stored) {
    throw new CloudSyncError(
      "unauthorized",
      "Bitte zuerst mit dem Konto verbinden.",
    );
  }
  if (stored.expiresAt - EXPIRY_MARGIN_MS > env.now()) {
    return stored.accessToken;
  }
  const clientId = stored.clientId;
  if (!stored.refreshToken || !clientId) {
    disconnect(provider, env.storage);
    throw new CloudSyncError(
      "unauthorized",
      "Die Anmeldung ist abgelaufen. Bitte neu verbinden.",
    );
  }
  let data: TokenResponse;
  try {
    data = await requestToken(provider, env.fetcher, tokenUrl(provider), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: stored.refreshToken,
      }).toString(),
    });
  } catch (error) {
    if (error instanceof CloudSyncError && error.code === "unauthorized") {
      disconnect(provider, env.storage);
    }
    throw error;
  }
  const next = toStored(data, clientId, stored, env.now());
  writeTokens(env.storage, { ...readTokens(env.storage), [provider]: next });
  return next.accessToken;
}

function tokenUrl(provider: OAuthProviderId) {
  return tokenRequest({
    provider,
    clientId: "",
    redirectUri: "",
    code: "",
    verifier: "",
  }).url;
}
