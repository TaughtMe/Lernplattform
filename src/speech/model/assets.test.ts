import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AssetIntegrityError,
  cacheKey,
  fetchManifestJson,
  loadAsset,
  pruneSpeechCache,
  sha256Hex,
  SPEECH_CACHE,
} from "./assets";
import { parseSpeechManifest } from "./manifest";
import { testManifest } from "./testing/manifest";

/** Einfacher Cache-Speicher wie die Cache API, nach URL. */
function fakeCaches() {
  const stores = new Map<string, Map<string, Response>>();
  const open = vi.fn(async (name: string) => {
    const store = stores.get(name) ?? new Map<string, Response>();
    stores.set(name, store);
    return {
      match: async (key: string) => store.get(key)?.clone(),
      put: async (key: string, response: Response) => {
        store.set(key, response);
      },
      delete: async (key: string | Request) =>
        store.delete(typeof key === "string" ? key : key.url),
      keys: async () => [...store.keys()].map((url) => new Request(url)),
    };
  });
  return { stores, open };
}

const bytes = new TextEncoder().encode("hallo").buffer;
let asset: { path: string; sha256: string; size: number };
let cacheStore: ReturnType<typeof fakeCaches>;

beforeEach(async () => {
  asset = { path: "/speech/test.bin", sha256: await sha256Hex(bytes), size: 5 };
  cacheStore = fakeCaches();
  vi.stubGlobal("caches", { open: cacheStore.open });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadAsset", () => {
  it("lädt, prüft die Prüfsumme und legt die Datei im eigenen Cache ab", async () => {
    const fetchMock = vi.fn(async () => new Response(bytes.slice(0)));
    vi.stubGlobal("fetch", fetchMock);
    const loaded = await loadAsset(asset);
    expect(new TextDecoder().decode(loaded)).toBe("hallo");
    expect(cacheStore.open).toHaveBeenCalledWith(SPEECH_CACHE);
    expect(SPEECH_CACHE.startsWith("lernraum-")).toBe(false);
    // Zweites Laden kommt aus dem Cache, ohne Netz.
    await loadAsset(asset);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("verwirft Dateien mit falscher Prüfsumme", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("falsch")),
    );
    await expect(loadAsset({ ...asset, size: 6 })).rejects.toBeInstanceOf(
      AssetIntegrityError,
    );
    expect(cacheStore.stores.get(SPEECH_CACHE)?.size ?? 0).toBe(0);
  });

  it("lädt neu, wenn der Cache-Eintrag beschädigt ist", async () => {
    const cache = await caches.open(SPEECH_CACHE);
    await cache.put(
      cacheKey(asset, self.location.origin),
      new Response("kaputt"),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(bytes.slice(0))),
    );
    expect(new TextDecoder().decode(await loadAsset(asset))).toBe("hallo");
  });
});

describe("fetchManifestJson", () => {
  it("nimmt bei Netzfehler das Manifest aus dem Cache", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ version: 1 })),
    );
    expect(await fetchManifestJson()).toEqual({ version: 1 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("offline"))),
    );
    expect(await fetchManifestJson()).toEqual({ version: 1 });
  });

  it("wartet bei schlechtem Netz höchstens das Zeitlimit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Abbruch", "AbortError")),
            );
          }),
      ),
    );
    expect(await fetchManifestJson(20)).toBeNull();
  });

  it("meldet ein fehlendes Manifest als null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 404 })),
    );
    expect(await fetchManifestJson()).toBeNull();
  });
});

describe("pruneSpeechCache", () => {
  it("entfernt Einträge, die das Manifest nicht mehr nennt", async () => {
    const manifest = parseSpeechManifest(testManifest);
    if (!manifest) throw new Error("Manifest ungültig");
    const cache = await caches.open(SPEECH_CACHE);
    const kept = cacheKey(manifest.ort.wasm, self.location.origin);
    await cache.put(kept, new Response("a"));
    await cache.put(
      new URL("/speech/alt.onnx?sha256=x", self.location.origin).href,
      new Response("b"),
    );
    await pruneSpeechCache(manifest);
    expect([...(cacheStore.stores.get(SPEECH_CACHE)?.keys() ?? [])]).toEqual([
      kept,
    ]);
  });
});
