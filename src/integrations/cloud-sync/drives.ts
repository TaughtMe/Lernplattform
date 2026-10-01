import { errorForStatus, networkError, type CloudSyncTarget } from "./types";

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
  const fileUrl = (name: string) =>
    `https://graph.microsoft.com/v1.0/me/drive/special/approot:/${encodeURIComponent(name)}:/content`;
  const auth = { Authorization: `Bearer ${accessToken}` };
  return {
    provider: "onedrive",
    async upload(name, text) {
      const response = await call(fetcher, service, fileUrl(name), {
        method: "PUT",
        headers: { ...auth, "Content-Type": "application/json" },
        body: text,
      });
      if (!response.ok) throw errorForStatus(response.status, service);
    },
    async download(name) {
      const response = await call(fetcher, service, fileUrl(name), {
        headers: auth,
      });
      if (response.status === 404) return null;
      if (!response.ok) throw errorForStatus(response.status, service);
      return response.text();
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

  async function findId(name: string) {
    const query = new URLSearchParams({
      spaces: "appDataFolder",
      q: `name = '${name.replace(/'/g, "\\'")}' and trashed = false`,
      fields: "files(id)",
    });
    const response = await call(
      fetcher,
      service,
      `https://www.googleapis.com/drive/v3/files?${query}`,
      { headers: auth },
    );
    if (!response.ok) throw errorForStatus(response.status, service);
    const data = (await response.json()) as { files?: Array<{ id: string }> };
    return data.files?.[0]?.id ?? null;
  }

  return {
    provider: "google-drive",
    async upload(name, text) {
      const id = await findId(name);
      const boundary = `lernraum-${crypto.randomUUID()}`;
      const metadata = id ? { name } : { name, parents: ["appDataFolder"] };
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
      const url = id
        ? `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=multipart`
        : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
      const response = await call(fetcher, service, url, {
        method: id ? "PATCH" : "POST",
        headers: {
          ...auth,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      });
      if (!response.ok) throw errorForStatus(response.status, service);
    },
    async download(name) {
      const id = await findId(name);
      if (!id) return null;
      const response = await call(
        fetcher,
        service,
        `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
        { headers: auth },
      );
      if (!response.ok) throw errorForStatus(response.status, service);
      return response.text();
    },
  };
}
