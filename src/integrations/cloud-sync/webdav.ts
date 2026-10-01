import { errorForStatus, networkError, type CloudSyncTarget } from "./types";

export type WebDavSettings = {
  /** Basisadresse, z. B. https://cloud.schule.de/remote.php/dav/files/name */
  url: string;
  username: string;
  password: string;
  /** Unterordner für die Lernraum-Dateien. */
  folder?: string;
};

const SERVICE = "Der WebDAV-Server";

function joinUrl(base: string, ...parts: string[]) {
  return [
    base.replace(/\/+$/, ""),
    ...parts.map((part) => encodeURIComponent(part)),
  ].join("/");
}

function basicAuth(username: string, password: string) {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `Basic ${btoa(binary)}`;
}

/** WebDAV (z. B. Nextcloud, ownCloud) mit Benutzername und App-Passwort. */
export function createWebDavTarget(
  settings: WebDavSettings,
  fetcher: typeof fetch = (...args) => fetch(...args),
): CloudSyncTarget {
  const folder = settings.folder ?? "Lernraum";
  const headers = {
    Authorization: basicAuth(settings.username, settings.password),
  };

  async function request(url: string, init: RequestInit) {
    try {
      return await fetcher(url, {
        ...init,
        headers: { ...headers, ...(init.headers ?? {}) },
      });
    } catch (cause) {
      throw networkError(SERVICE, cause);
    }
  }

  async function ensureFolder() {
    const response = await request(joinUrl(settings.url, folder), {
      method: "MKCOL",
    });
    // 201 angelegt, 405 existiert schon.
    if (response.status !== 201 && response.status !== 405 && !response.ok) {
      throw errorForStatus(response.status, SERVICE);
    }
  }

  return {
    provider: "webdav",
    async upload(name, text) {
      await ensureFolder();
      const response = await request(joinUrl(settings.url, folder, name), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      if (!response.ok) throw errorForStatus(response.status, SERVICE);
    },
    async download(name) {
      const response = await request(joinUrl(settings.url, folder, name), {
        method: "GET",
      });
      if (response.status === 404) return null;
      if (!response.ok) throw errorForStatus(response.status, SERVICE);
      return response.text();
    },
  };
}
