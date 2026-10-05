import { getAccessToken } from "./session";
import { createGoogleDriveTarget, createOneDriveTarget } from "./drives";
import type { CredentialStore } from "./credentials";
import {
  CloudSyncError,
  type CloudProviderId,
  type CloudSyncTarget,
} from "./types";
import { createWebDavTarget } from "./webdav";

/**
 * Speicherziel für eine Runde. OneDrive und Google Drive erneuern ihr
 * Zugriffstoken hier; ein abgelaufenes Token ohne stille Erneuerung wird zu
 * `reauth`, also „Anmeldung nötig“ im Cloud-Symbol.
 */
export async function createSyncTarget(
  provider: CloudProviderId,
  credentials: CredentialStore,
  key?: CryptoKey | null,
  fetcher?: typeof fetch,
): Promise<CloudSyncTarget> {
  if (provider === "webdav") {
    const connection = await credentials.loadWebDav(key);
    if (!connection) {
      throw new CloudSyncError(
        "not-configured",
        "Der WebDAV-Server ist noch nicht eingerichtet.",
      );
    }
    return createWebDavTarget(connection, fetcher);
  }
  let token: string;
  try {
    token = await getAccessToken(provider);
  } catch (error) {
    if (error instanceof CloudSyncError && error.code === "unauthorized") {
      throw new CloudSyncError("reauth", error.message, { cause: error });
    }
    throw error;
  }
  return provider === "onedrive"
    ? createOneDriveTarget(token, fetcher)
    : createGoogleDriveTarget(token, fetcher);
}
