import { describe, expect, it, vi } from "vitest";
import { createGoogleDriveTarget, createOneDriveTarget } from "./drives";
import { createWebDavTarget, parseEtag } from "./webdav";

type Call = { method: string; url: string; headers: Headers; body?: string };

function recorder(respond: (call: Call) => Response | Promise<Response>): {
  fetcher: typeof fetch;
  calls: Call[];
} {
  const calls: Call[] = [];
  const fetcher = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      const call: Call = {
        method: init?.method ?? "GET",
        url: String(url),
        headers: new Headers(init?.headers),
        ...(typeof init?.body === "string" ? { body: init.body } : {}),
      };
      calls.push(call);
      return respond(call);
    },
  ) as unknown as typeof fetch;
  return { fetcher, calls };
}

const propfind = (etag: string) =>
  new Response(
    `<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"><d:response><d:propstat><d:prop><d:getetag>${etag}</d:getetag></d:prop></d:propstat></d:response></d:multistatus>`,
    { status: 207 },
  );

describe("parseEtag", () => {
  it("reads the etag with any prefix and decodes entities", () => {
    expect(parseEtag("<d:getetag>&quot;abc&quot;</d:getetag>")).toBe('"abc"');
    expect(parseEtag("<getetag>W/&quot;a&amp;b&quot;</getetag>")).toBe(
      'W/"a&b"',
    );
    expect(parseEtag("<d:getetag></d:getetag>")).toBeNull();
    expect(parseEtag("<d:other/>")).toBeNull();
  });
});

describe("WebDAV preconditions", () => {
  const settings = {
    url: "https://cloud.example/dav",
    username: "u",
    password: "p",
  };

  it("writes with If-Match and reports a lost race as precondition error", async () => {
    const { fetcher, calls } = recorder((call) => {
      if (call.method === "MKCOL") return new Response(null, { status: 405 });
      return new Response(null, { status: 412 });
    });
    const target = createWebDavTarget(settings, fetcher);
    await expect(
      target.upload("f.json", "{}", { ifMatch: '"v1"' }),
    ).rejects.toMatchObject({ code: "precondition" });
    expect(calls.at(-1)?.headers.get("If-Match")).toBe('"v1"');
  });

  it("creates only when the file does not exist yet", async () => {
    const { fetcher, calls } = recorder((call) => {
      if (call.method === "MKCOL") return new Response(null, { status: 201 });
      if (call.method === "PUT")
        return new Response(null, { status: 201, headers: { ETag: '"n1"' } });
      return new Response(null, { status: 500 });
    });
    const target = createWebDavTarget(settings, fetcher);
    expect(await target.upload("f.json", "{}", { ifMatch: null })).toEqual({
      etag: '"n1"',
    });
    expect(calls.at(-1)?.headers.get("If-None-Match")).toBe("*");
  });

  it("asks for the version after writing when the server hides the header", async () => {
    const { fetcher } = recorder((call) => {
      if (call.method === "MKCOL") return new Response(null, { status: 405 });
      if (call.method === "PUT") return new Response(null, { status: 204 });
      return propfind("&quot;n2&quot;");
    });
    const target = createWebDavTarget(settings, fetcher);
    expect(await target.upload("f.json", "{}")).toEqual({ etag: '"n2"' });
  });

  it("reads the version first, then the content", async () => {
    const { fetcher, calls } = recorder((call) =>
      call.method === "PROPFIND"
        ? propfind("&quot;v7&quot;")
        : new Response("{}"),
    );
    const target = createWebDavTarget(settings, fetcher);
    expect(await target.read("f.json")).toEqual({ text: "{}", etag: '"v7"' });
    expect(calls.map((c) => c.method)).toEqual(["PROPFIND", "GET"]);
    expect(calls[0]?.headers.get("Depth")).toBe("0");
  });

  it("returns null for missing files", async () => {
    const { fetcher } = recorder(() => new Response(null, { status: 404 }));
    const target = createWebDavTarget(settings, fetcher);
    expect(await target.stat("f.json")).toBeNull();
    expect(await target.read("f.json")).toBeNull();
  });

  it("returns null when the file vanishes between version and content", async () => {
    const { fetcher } = recorder((call) =>
      call.method === "PROPFIND"
        ? propfind("&quot;v7&quot;")
        : new Response(null, { status: 404 }),
    );
    expect(await createWebDavTarget(settings, fetcher).read("f")).toBeNull();
  });
});

describe("OneDrive preconditions", () => {
  it("sends If-Match, creates with conflictBehavior=fail and reads eTag", async () => {
    const { fetcher, calls } = recorder((call) => {
      if (call.method === "PUT" && call.headers.get("If-Match") === "old") {
        return new Response(null, { status: 412 });
      }
      if (call.method === "PUT") return Response.json({ eTag: "new" });
      if (call.url.includes(":/content")) return new Response("{}");
      return Response.json({ eTag: "e1" });
    });
    const target = createOneDriveTarget("t", fetcher);
    await expect(
      target.upload("f.json", "{}", { ifMatch: "old" }),
    ).rejects.toMatchObject({ code: "precondition" });
    expect(await target.upload("f.json", "{}", { ifMatch: null })).toEqual({
      etag: "new",
    });
    expect(calls.at(-1)?.url).toContain("conflictBehavior=fail");
    expect(await target.upload("f.json", "{}")).toEqual({ etag: "new" });
    expect(await target.stat("f.json")).toEqual({ etag: "e1" });
    expect(await target.read("f.json")).toEqual({ text: "{}", etag: "e1" });
  });

  it("reports a name clash on create as precondition error", async () => {
    const { fetcher } = recorder(() => new Response(null, { status: 409 }));
    await expect(
      createOneDriveTarget("t", fetcher).upload("f", "{}", { ifMatch: null }),
    ).rejects.toMatchObject({ code: "precondition" });
  });

  it("returns null for missing files", async () => {
    const { fetcher } = recorder(() => new Response(null, { status: 404 }));
    const target = createOneDriveTarget("t", fetcher);
    expect(await target.stat("f")).toBeNull();
    expect(await target.read("f")).toBeNull();
  });
});

describe("Google Drive version check", () => {
  function drive(version: string | null) {
    return recorder((call) => {
      if (call.url.includes("/upload/")) {
        return Response.json({ id: "id1", version: "9" });
      }
      if (call.url.includes("drive/v3/files?")) {
        return Response.json({
          files: version ? [{ id: "id1", version }] : [],
        });
      }
      if (call.url.includes("alt=media")) return new Response("{}");
      return Response.json({ id: "id1", version: "9" });
    });
  }

  it("compares the version before writing", async () => {
    const target = createGoogleDriveTarget("t", drive("5").fetcher);
    await expect(
      target.upload("f.json", "{}", { ifMatch: "4" }),
    ).rejects.toMatchObject({ code: "precondition" });
    await expect(
      target.upload("f.json", "{}", { ifMatch: null }),
    ).rejects.toMatchObject({ code: "precondition" });
    expect(await target.upload("f.json", "{}", { ifMatch: "5" })).toEqual({
      etag: "9",
    });
    expect(await target.upload("f.json", "{}")).toEqual({ etag: "9" });
  });

  it("creates the file when none exists and none was expected", async () => {
    const { fetcher, calls } = drive(null);
    const target = createGoogleDriveTarget("t", fetcher);
    expect(await target.upload("f.json", "{}", { ifMatch: null })).toEqual({
      etag: "9",
    });
    expect(calls.at(-1)?.method).toBe("POST");
  });

  it("reads and stats with the file version", async () => {
    const target = createGoogleDriveTarget("t", drive("5").fetcher);
    expect(await target.stat("f.json")).toEqual({ etag: "5" });
    expect(await target.read("f.json")).toEqual({ text: "{}", etag: "5" });
    const none = createGoogleDriveTarget("t", drive(null).fetcher);
    expect(await none.stat("f.json")).toBeNull();
    expect(await none.read("f.json")).toBeNull();
  });
});

describe("removing the file", () => {
  it("deletes on WebDAV and tolerates a missing file", async () => {
    const { fetcher, calls } = recorder((call) =>
      call.url.endsWith("weg.json")
        ? new Response(null, { status: 404 })
        : new Response(null, { status: 204 }),
    );
    const target = createWebDavTarget(
      { url: "https://cloud.example/dav", username: "u", password: "p" },
      fetcher,
    );
    await target.remove("f.json");
    await target.remove("weg.json");
    expect(calls.map((c) => c.method)).toEqual(["DELETE", "DELETE"]);
    const failing = createWebDavTarget(
      { url: "https://cloud.example/dav", username: "u", password: "p" },
      recorder(() => new Response(null, { status: 403 })).fetcher,
    );
    await expect(failing.remove("f.json")).rejects.toMatchObject({
      code: "unauthorized",
    });
  });

  it("deletes on OneDrive", async () => {
    const ok = recorder((call) =>
      call.url.includes("weg")
        ? new Response(null, { status: 404 })
        : new Response(null, { status: 204 }),
    );
    const target = createOneDriveTarget("t", ok.fetcher);
    await target.remove("f.json");
    await target.remove("weg.json");
    expect(ok.calls[0]?.method).toBe("DELETE");
    await expect(
      createOneDriveTarget(
        "t",
        recorder(() => new Response(null, { status: 500 })).fetcher,
      ).remove("f"),
    ).rejects.toMatchObject({ code: "server" });
  });

  it("deletes on Google Drive by id and skips missing files", async () => {
    const found = recorder((call) => {
      if (call.method === "DELETE") return new Response(null, { status: 204 });
      return Response.json({ files: [{ id: "id1", version: "3" }] });
    });
    await createGoogleDriveTarget("t", found.fetcher).remove("f.json");
    expect(found.calls.at(-1)).toMatchObject({ method: "DELETE" });
    expect(found.calls.at(-1)?.url).toContain("/files/id1");
    const none = recorder(() => Response.json({ files: [] }));
    await createGoogleDriveTarget("t", none.fetcher).remove("f.json");
    expect(none.calls).toHaveLength(1);
    const gone = recorder((call) =>
      call.method === "DELETE"
        ? new Response(null, { status: 404 })
        : Response.json({ files: [{ id: "id1" }] }),
    );
    await createGoogleDriveTarget("t", gone.fetcher).remove("f.json");
    const broken = recorder((call) =>
      call.method === "DELETE"
        ? new Response(null, { status: 500 })
        : Response.json({ files: [{ id: "id1" }] }),
    );
    await expect(
      createGoogleDriveTarget("t", broken.fetcher).remove("f.json"),
    ).rejects.toMatchObject({ code: "server" });
  });
});
