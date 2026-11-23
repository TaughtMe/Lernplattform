/**
 * Laden der Sprachmodell-Dateien (Plan 3.3). Läuft im Worker und im
 * Hauptthread. Jede Datei wird gegen ihre SHA-256-Prüfsumme geprüft und im
 * eigenen Cache `sprachmodell-v1` abgelegt. Der Name beginnt bewusst nicht mit
 * `lernraum-`: Diese Caches löscht der Service Worker bei jedem Update.
 */
import {
  allAssets,
  MANIFEST_URL,
  type SpeechAsset,
  type SpeechManifest,
} from "./manifest";

export const SPEECH_CACHE = "sprachmodell-v1";
/** Schlechtes Schul-WLAN darf das Vorlesen nicht aufhalten (B-013). */
export const MANIFEST_TIMEOUT_MS = 3000;

export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function openCache(): Promise<Cache | null> {
  try {
    return typeof caches === "undefined"
      ? null
      : await caches.open(SPEECH_CACHE);
  } catch {
    // Kein Cache (z. B. privates Fenster): ohne Zwischenspeicher weiter.
    return null;
  }
}

/** Cache-Schlüssel mit Prüfsumme: Eine neue Fassung bekommt einen neuen Eintrag. */
export function cacheKey(asset: SpeechAsset, origin: string): string {
  return new URL(`${asset.path}?sha256=${asset.sha256}`, origin).href;
}

function origin(): string {
  return self.location.origin;
}

export class AssetIntegrityError extends Error {
  constructor(asset: SpeechAsset) {
    super(`Prüfsumme stimmt nicht: ${asset.path}`);
    this.name = "AssetIntegrityError";
  }
}

async function verified(asset: SpeechAsset, buffer: ArrayBuffer) {
  return (
    buffer.byteLength === asset.size &&
    (await sha256Hex(buffer)) === asset.sha256
  );
}

/** Liefert die Bytes einer Datei: aus dem Cache oder geprüft aus dem Netz. */
export async function loadAsset(asset: SpeechAsset): Promise<ArrayBuffer> {
  const cache = await openCache();
  const key = cacheKey(asset, origin());
  const cached = await cache?.match(key);
  if (cached) {
    const buffer = await cached.arrayBuffer();
    if (await verified(asset, buffer)) return buffer;
    await cache?.delete(key);
  }
  const response = await fetch(asset.path, { cache: "no-cache" });
  if (!response.ok) throw new Error(`Laden fehlgeschlagen: ${asset.path}`);
  const buffer = await response.arrayBuffer();
  if (!(await verified(asset, buffer))) throw new AssetIntegrityError(asset);
  try {
    await cache?.put(
      key,
      new Response(buffer.slice(0), {
        headers: { "content-type": "application/octet-stream" },
      }),
    );
  } catch {
    // Speicher voll: Die Datei funktioniert trotzdem, nur nicht offline.
  }
  return buffer;
}

/** Ist eine Datei schon geprüft im Cache (also offline verfügbar)? */
export async function isAssetCached(asset: SpeechAsset): Promise<boolean> {
  const cache = await openCache();
  return Boolean(await cache?.match(cacheKey(asset, origin())));
}

/**
 * Lädt das Manifest: erst aus dem Netz (höchstens `MANIFEST_TIMEOUT_MS`), sonst
 * aus dem Cache. `null`, wenn es keins gibt.
 */
export async function fetchManifestJson(
  timeoutMs = MANIFEST_TIMEOUT_MS,
): Promise<unknown> {
  const cache = await openCache();
  const key = new URL(MANIFEST_URL, origin()).href;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(MANIFEST_URL, {
      cache: "no-cache",
      signal: controller.signal,
    });
    if (response.ok) {
      const json: unknown = await response.clone().json();
      try {
        await cache?.put(key, response);
      } catch {
        // Ohne Cache geht es online weiter.
      }
      return json;
    }
    if (response.status === 404) return null;
  } catch {
    // Offline oder zu langsam: weiter mit dem Cache.
  } finally {
    clearTimeout(timer);
  }
  const cached = await cache?.match(key);
  return cached ? ((await cached.json()) as unknown) : null;
}

/** Entfernt Einträge, die das aktuelle Manifest nicht mehr nennt. */
export async function pruneSpeechCache(
  manifest: SpeechManifest,
): Promise<void> {
  const cache = await openCache();
  if (!cache) return;
  const keep = new Set([
    new URL(MANIFEST_URL, origin()).href,
    ...allAssets(manifest).map((asset) => cacheKey(asset, origin())),
  ]);
  for (const request of await cache.keys()) {
    if (!keep.has(request.url)) await cache.delete(request);
  }
}
