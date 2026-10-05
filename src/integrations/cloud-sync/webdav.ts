import {
  errorForStatus,
  networkError,
  type CloudSyncTarget,
  type RemoteFile,
  type UploadOptions,
} from "./types";

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

  const fileUrl = (name: string) => joinUrl(settings.url, folder, name);

  /** Version über PROPFIND: Das ETag-Feld ist ohne CORS-Freigabe lesbar. */
  async function stat(name: string) {
    const response = await request(fileUrl(name), {
      method: "PROPFIND",
      headers: { Depth: "0", "Content-Type": "application/xml" },
      body: PROPFIND_BODY,
    });
    if (response.status === 404) return null;
    if (!response.ok) throw errorForStatus(response.status, SERVICE);
    return { etag: parseEtag(await response.text()) };
  }

  return {
    provider: "webdav",
    async upload(name, text, options: UploadOptions = {}) {
      await ensureFolder();
      const conditions: Record<string, string> = {};
      if (typeof options.ifMatch === "string") {
        conditions["If-Match"] = options.ifMatch;
      } else if (options.ifMatch === null) {
        conditions["If-None-Match"] = "*";
      }
      const response = await request(fileUrl(name), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...conditions },
        body: text,
      });
      if (!response.ok) throw errorForStatus(response.status, SERVICE);
      const header =
        response.headers.get("OC-ETag") ?? response.headers.get("ETag");
      return { etag: header ?? (await stat(name))?.etag ?? null };
    },
    async download(name) {
      const response = await request(fileUrl(name), { method: "GET" });
      if (response.status === 404) return null;
      if (!response.ok) throw errorForStatus(response.status, SERVICE);
      return response.text();
    },
    stat,
    async remove(name) {
      const response = await request(fileUrl(name), { method: "DELETE" });
      if (response.status === 404) return;
      if (!response.ok) throw errorForStatus(response.status, SERVICE);
    },
    async read(name): Promise<RemoteFile | null> {
      // Erst die Version, dann der Inhalt: Ändert sich die Datei dazwischen,
      // ist die Version älter als der Inhalt und ein späteres Schreiben mit
      // If-Match scheitert sicher, statt Fremdes zu überschreiben.
      const before = await stat(name);
      if (!before) return null;
      const text = await this.download(name);
      return text === null ? null : { text, etag: before.etag };
    },
  };
}

const PROPFIND_BODY =
  '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getetag/></d:prop></d:propfind>';

const XML_ENTITIES: Record<string, string> = {
  "&quot;": '"',
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&apos;": "'",
};

/** ETag aus einer PROPFIND-Antwort lesen (mit Anführungszeichen, wie gesendet). */
export function parseEtag(xml: string): string | null {
  const match = /<(?:[\w-]+:)?getetag[^>]*>([^<]*)</i.exec(xml);
  const raw = match?.[1]?.trim();
  if (!raw) return null;
  return raw.replace(
    /&(?:quot|amp|lt|gt|apos);/g,
    (entity) => XML_ENTITIES[entity] ?? entity,
  );
}
