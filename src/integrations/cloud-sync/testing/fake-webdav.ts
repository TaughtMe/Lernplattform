/**
 * Nachbau eines WebDAV-Servers als `fetch`-Funktion für Tests: MKCOL, PUT mit
 * If-Match/If-None-Match, GET, PROPFIND (ETag) und DELETE. Die Dateien liegen
 * im Arbeitsspeicher; `offline` lässt jede Anfrage scheitern.
 */
export type FakeWebDav = {
  fetcher: typeof fetch;
  files: Map<string, { body: string; etag: string }>;
  offline: boolean;
  requests: string[];
};

export function createFakeWebDav(): FakeWebDav {
  const files = new Map<string, { body: string; etag: string }>();
  let counter = 0;
  const server: FakeWebDav = {
    files,
    offline: false,
    requests: [],
    fetcher: (async (input: string | URL | Request, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const url = String(input);
      server.requests.push(`${method} ${new URL(url).pathname}`);
      if (server.offline) throw new TypeError("Failed to fetch");
      const headers = new Headers(init?.headers);
      const file = files.get(url);
      switch (method) {
        case "MKCOL":
          return new Response(null, { status: 405 });
        case "PROPFIND":
          return file
            ? new Response(
                `<d:multistatus xmlns:d="DAV:"><d:response><d:propstat><d:prop><d:getetag>&quot;${file.etag}&quot;</d:getetag></d:prop></d:propstat></d:response></d:multistatus>`,
                { status: 207 },
              )
            : new Response(null, { status: 404 });
        case "GET":
          return file
            ? new Response(file.body)
            : new Response(null, { status: 404 });
        case "PUT": {
          const ifMatch = headers.get("If-Match");
          if (ifMatch !== null && ifMatch !== `"${file?.etag}"`) {
            return new Response(null, { status: 412 });
          }
          if (headers.get("If-None-Match") === "*" && file) {
            return new Response(null, { status: 412 });
          }
          counter += 1;
          const etag = `v${counter}`;
          files.set(url, { body: String(init?.body), etag });
          return new Response(null, {
            status: file ? 204 : 201,
            headers: { ETag: `"${etag}"` },
          });
        }
        case "DELETE":
          if (!file) return new Response(null, { status: 404 });
          files.delete(url);
          return new Response(null, { status: 204 });
        default:
          return new Response(null, { status: 405 });
      }
    }) as typeof fetch,
  };
  return server;
}
