import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import {
  createLearningBoxRepository,
  PersonalLearningDatabase,
} from "../../storage/personal-learning-events";
import { createGoogleDriveTarget, createOneDriveTarget } from "./drives";
import { buildAuthorizeUrl, createPkcePair, tokenRequest } from "./oauth";
import {
  pullStudentData,
  pullTeacherData,
  pushStudentData,
  pushTeacherData,
  SYNC_FILES,
} from "./sync";
import { CloudSyncError, type CloudSyncTarget } from "./types";
import { createWebDavTarget } from "./webdav";

function memoryTarget(): CloudSyncTarget & { files: Map<string, string> } {
  const files = new Map<string, string>();
  return {
    provider: "webdav",
    files,
    upload: async (name, text) => {
      files.set(name, text);
      return { etag: null };
    },
    download: async (name) => files.get(name) ?? null,
    stat: async (name) => (files.has(name) ? { etag: null } : null),
    read: async (name) =>
      files.has(name) ? { text: files.get(name) as string, etag: null } : null,
  };
}

describe("cloud sync", () => {
  it("writes and reads a WebDAV file with basic auth inside the Lernraum folder", async () => {
    const calls: Array<{ url: string; method: string; auth: string }> = [];
    const store = new Map<string, string>();
    const fetcher = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        const method = init?.method ?? "GET";
        const headers = new Headers(init?.headers);
        calls.push({
          url: String(url),
          method,
          auth: headers.get("Authorization") ?? "",
        });
        if (method === "MKCOL") return new Response(null, { status: 405 });
        if (method === "PUT") {
          store.set(String(url), String(init?.body));
          return new Response(null, { status: 201 });
        }
        const body = store.get(String(url));
        return body === undefined
          ? new Response(null, { status: 404 })
          : new Response(body);
      },
    ) as unknown as typeof fetch;
    const target = createWebDavTarget(
      { url: "https://cloud.example/dav/", username: "lea", password: "pä" },
      fetcher,
    );
    expect(await target.download("x.json")).toBeNull();
    await target.upload("x.json", '{"a":1}');
    expect(await target.download("x.json")).toBe('{"a":1}');
    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      "GET https://cloud.example/dav/Lernraum/x.json",
      "MKCOL https://cloud.example/dav/Lernraum",
      "PUT https://cloud.example/dav/Lernraum/x.json",
      "PROPFIND https://cloud.example/dav/Lernraum/x.json",
      "GET https://cloud.example/dav/Lernraum/x.json",
    ]);
    expect(calls[0]?.auth).toBe(
      `Basic ${btoa(String.fromCharCode(...new TextEncoder().encode("lea:pä")))}`,
    );
  });

  it("reports rejected credentials and unreachable servers in German", async () => {
    const denied = createWebDavTarget(
      { url: "https://cloud.example", username: "a", password: "b" },
      (async () =>
        new Response(null, { status: 401 })) as unknown as typeof fetch,
    );
    await expect(denied.download("x")).rejects.toMatchObject({
      code: "unauthorized",
    });
    const offline = createWebDavTarget(
      { url: "https://cloud.example", username: "a", password: "b" },
      (async () => {
        throw new TypeError("Failed to fetch");
      }) as unknown as typeof fetch,
    );
    await expect(offline.download("x")).rejects.toBeInstanceOf(CloudSyncError);
  });

  it("uses the app folders of OneDrive and Google Drive", async () => {
    const urls: string[] = [];
    const fetcher = (async (url: string | URL | Request) => {
      urls.push(String(url));
      if (String(url).includes("drive/v3/files?"))
        return Response.json({ files: [] });
      return new Response(null, { status: 404 });
    }) as unknown as typeof fetch;
    expect(
      await createOneDriveTarget("t", fetcher).download("a.json"),
    ).toBeNull();
    expect(
      await createGoogleDriveTarget("t", fetcher).download("a.json"),
    ).toBeNull();
    expect(urls[0]).toBe(
      "https://graph.microsoft.com/v1.0/me/drive/special/approot:/a.json:/content",
    );
    expect(urls[1]).toContain("spaces=appDataFolder");
  });

  it("builds PKCE sign-in requests limited to the app folder", async () => {
    const { verifier, challenge } = await createPkcePair();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const url = new URL(
      buildAuthorizeUrl({
        provider: "onedrive",
        clientId: "id",
        redirectUri: "https://lernraum.example/sync",
        challenge,
        state: "s",
      }),
    );
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("scope")).toContain(
      "Files.ReadWrite.AppFolder",
    );
    const token = tokenRequest({
      provider: "google-drive",
      clientId: "id",
      redirectUri: "https://lernraum.example/sync",
      code: "c",
      verifier,
    });
    expect(token.url).toBe("https://oauth2.googleapis.com/token");
    expect(String(token.init.body)).toContain(`code_verifier=${verifier}`);
  });

  it("merges a student's LernBox from another device", async () => {
    const cloud = memoryTarget();
    const first = new PersonalLearningDatabase(`sync-a-${crypto.randomUUID()}`);
    const second = new PersonalLearningDatabase(
      `sync-b-${crypto.randomUUID()}`,
    );
    const deck = await createLearningBoxRepository(first).createDeck({
      title: "Unit 1",
    });
    await createLearningBoxRepository(first).addCard({
      deckId: deck.id,
      question: "Haus",
      answer: "house",
    });
    await pushStudentData(cloud, first);
    expect(cloud.files.has(SYNC_FILES.student)).toBe(true);
    const result = await pullStudentData(cloud, second);
    expect(result?.added).toBeGreaterThan(0);
    expect(
      (await createLearningBoxRepository(second).listAllCards()).map(
        (card) => card.question,
      ),
    ).toEqual(["Haus"]);
    expect(await pullStudentData(memoryTarget(), second)).toBeNull();
  });

  it("round-trips teacher data through the workspace import", async () => {
    const cloud = memoryTarget();
    const imported: unknown[] = [];
    await pushTeacherData(cloud, {
      exportData: async () => ({ classes: [1] }),
      importData: async () => undefined,
    });
    expect(
      await pullTeacherData(cloud, {
        exportData: async () => ({}),
        importData: async (value) => void imported.push(value),
      }),
    ).toBe(true);
    expect(imported).toEqual([{ classes: [1] }]);
  });
});
