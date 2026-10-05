import {
  errorForStatus,
  networkError,
  type CloudSyncTarget,
  type RemoteFile,
  type UploadOptions,
} from "./types";

async function call(
  fetcher: typeof fetch,
  service: string,
  url: string,
  init: RequestInit,
) {
  try {
    return await fetcher(url, init);
  } catch (cause) {
    throw networkError(service, cause);
  }
}

/** OneDrive: Dateien im App-Ordner (Microsoft Graph). */
export function createOneDriveTarget(
  accessToken: string,
  fetcher: typeof fetch = (...args) => fetch(...args),
): CloudSyncTarget {
  const service = "OneDrive";
  const base = "https://graph.microsoft.com/v1.0/me/drive/special/approot:";
  const itemUrl = (name: string) => `${base}/${encodeURIComponent(name)}`;
  const fileUrl = (name: string) => `${itemUrl(name)}:/content`;
  const auth = { Authorization: `Bearer ${accessToken}` };

  async function stat(name: string) {
    const response = await call(
      fetcher,
      service,
      `${itemUrl(name)}?$select=eTag`,
      { headers: auth },
    );
    if (response.status === 404) return null;
    if (!response.ok) throw errorForStatus(response.status, service);
    const data = (await response.json()) as { eTag?: string };
    return { etag: data.eTag ?? null };
  }

  async function download(name: string) {
    const response = await call(fetcher, service, fileUrl(name), {
      headers: auth,
    });
    if (response.status === 404) return null;
    if (!response.ok) throw errorForStatus(response.status, service);
    return response.text();
  }

  return {
    provider: "onedrive",
    async upload(name, text, options: UploadOptions = {}) {
      const headers: Record<string, string> = {
        ...auth,
        "Content-Type": "application/json",
      };
      let url = fileUrl(name);
      if (typeof options.ifMatch === "string") {
        headers["If-Match"] = options.ifMatch;
      } else if (options.ifMatch === null) {
        url += "?@microsoft.graph.conflictBehavior=fail";
      }
      const response = await call(fetcher, service, url, {
        method: "PUT",
        headers,
        body: text,
      });
      if (!response.ok) throw errorForStatus(response.status, service);
      const data = (await response.json().catch(() => ({}))) as {
        eTag?: string;
      };
      return { etag: data.eTag ?? null };
    },
    download,
    stat,
    async remove(name) {
      const response = await call(fetcher, service, itemUrl(name), {
        method: "DELETE",
        headers: auth,
      });
      if (response.status === 404) return;
      if (!response.ok) throw errorForStatus(response.status, service);
    },
    async read(name): Promise<RemoteFile | null> {
      // Erst die Version, dann der Inhalt (siehe WebDAV).
      const before = await stat(name);
      if (!before) return null;
      const text = await download(name);
      return text === null ? null : { text, etag: before.etag };
    },
  };
}

/** Google Drive: Dateien im versteckten App-Datenordner. */
export function createGoogleDriveTarget(
  accessToken: string,
  fetcher: typeof fetch = (...args) => fetch(...args),
): CloudSyncTarget {
  const service = "Google Drive";
  const auth = { Authorization: `Bearer ${accessToken}` };

  async function find(name: string) {
    const query = new URLSearchParams({
      spaces: "appDataFolder",
      q: `name = '${name.replace(/'/g, "\\'")}' and trashed = false`,
      fields: "files(id,version)",
    });
    const response = await call(
      fetcher,
      service,
      `https://www.googleapis.com/drive/v3/files?${query}`,
      { headers: auth },
    );
    if (!response.ok) throw errorForStatus(response.status, service);
    const data = (await response.json()) as {
      files?: Array<{ id: string; version?: string }>;
    };
    const file = data.files?.[0];
    return file ? { id: file.id, version: file.version ?? null } : null;
  }

  async function content(id: string) {
    const response = await call(
      fetcher,
      service,
      `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
      { headers: auth },
    );
    if (!response.ok) throw errorForStatus(response.status, service);
    return response.text();
  }

  return {
    provider: "google-drive",
    async upload(name, text, options: UploadOptions = {}) {
      const existing = await find(name);
      // Google Drive kennt für Inhalte kein If-Match: Die Version wird vor dem
      // Schreiben verglichen. Ein enges Fenster bleibt; die nächste Runde
      // gleicht Unterschiede aus, weil lokale Änderungen erhalten bleiben.
      if (options.ifMatch !== undefined) {
        const expected = options.ifMatch;
        if ((existing?.version ?? null) !== expected) {
          throw errorForStatus(412, service);
        }
      }
      const boundary = `lernraum-${crypto.randomUUID()}`;
      const metadata = existing
        ? { name }
        : { name, parents: ["appDataFolder"] };
      const body = [
        `--${boundary}`,
        "Content-Type: application/json; charset=UTF-8",
        "",
        JSON.stringify(metadata),
        `--${boundary}`,
        "Content-Type: application/json",
        "",
        text,
        `--${boundary}--`,
      ].join("\r\n");
      const url = existing
        ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart&fields=id,version`
        : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,version";
      const response = await call(fetcher, service, url, {
        method: existing ? "PATCH" : "POST",
        headers: {
          ...auth,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      });
      if (!response.ok) throw errorForStatus(response.status, service);
      const data = (await response.json().catch(() => ({}))) as {
        version?: string;
      };
      return { etag: data.version ?? null };
    },
    async download(name) {
      const existing = await find(name);
      return existing ? content(existing.id) : null;
    },
    async stat(name) {
      const existing = await find(name);
      return existing ? { etag: existing.version } : null;
    },
    async remove(name) {
      const existing = await find(name);
      if (!existing) return;
      const response = await call(
        fetcher,
        service,
        `https://www.googleapis.com/drive/v3/files/${existing.id}`,
        { method: "DELETE", headers: auth },
      );
      if (response.status === 404) return;
      if (!response.ok) throw errorForStatus(response.status, service);
    },
    async read(name) {
      const existing = await find(name);
      if (!existing) return null;
      return { text: await content(existing.id), etag: existing.version };
    },
  };
}
