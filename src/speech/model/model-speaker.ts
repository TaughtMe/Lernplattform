/**
 * Sprachmodell im Hauptthread (Plan 3.3/3.4): Manifest, Worker, Audio-Cache
 * und Wiedergabe. Die Erzeugung läuft im Worker.
 */
import {
  fetchManifestJson,
  isAssetCached,
  pruneSpeechCache,
  removeAssets,
} from "./assets";
import {
  assetsFor,
  baseLanguage,
  languageAssets,
  languageEntry,
  parseSpeechManifest,
  resolveVoice,
  type SpeechLanguage,
  type SpeechManifest,
} from "./manifest";
import {
  isAudioPlaybackAvailable,
  playSamples,
  stopAudio,
  unlockAudio,
} from "./player";
import type { WorkerRequest, WorkerResponse } from "./protocol";
import { preferredVoice } from "./voice-preferences";

/** Erstes Laden (bis 40 MB) dauert; danach kommt es aus dem Cache. */
export const MODEL_PREPARE_TIMEOUT_MS = 30_000;
/** So viele erzeugte Texte bleiben im Speicher (Wiederholen ohne Rechnen). */
const AUDIO_CACHE_SIZE = 40;

type Pending = {
  resolve: (response: WorkerResponse) => void;
  onProgress?: ((loaded: number, total: number) => void) | undefined;
};

let manifest: Promise<SpeechManifest | null> | undefined;
let knownManifest: SpeechManifest | null | undefined;
let worker: Worker | undefined;
let nextId = 1;
let generation = 0;
const pending = new Map<number, Pending>();
const loaded = new Map<string, Promise<boolean>>();
const audioCache = new Map<
  string,
  { samples: Float32Array; sampleRate: number }
>();

/** Nur für Tests. */
export function resetModelSpeaker() {
  manifest = undefined;
  knownManifest = undefined;
  worker?.terminate();
  worker = undefined;
  pending.clear();
  loaded.clear();
  audioCache.clear();
  generation += 1;
}

function supported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof WebAssembly !== "undefined" &&
    typeof crypto !== "undefined" &&
    Boolean(crypto.subtle) &&
    isAudioPlaybackAvailable()
  );
}

/** Lädt das Manifest einmal; ohne Unterstützung oder Manifest `null`. */
export function loadModelManifest(): Promise<SpeechManifest | null> {
  if (!supported()) return Promise.resolve(null);
  manifest ??= fetchManifestJson()
    .then((json) => {
      const parsed = parseSpeechManifest(json);
      knownManifest = parsed;
      if (parsed) void pruneSpeechCache(parsed).catch(() => {});
      return parsed;
    })
    .catch(() => {
      knownManifest = null;
      return null;
    });
  return manifest;
}

/** Synchron: Ist nach `loadModelManifest` ein Modell für diese Sprache bekannt? */
export function isModelAvailable(lang: string): boolean {
  return languageEntry(knownManifest ?? null, lang) !== null;
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./kitten.worker.ts", import.meta.url), {
      type: "module",
      name: "lernraum-sprachmodell",
    });
    worker.addEventListener(
      "message",
      (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        const waiting = pending.get(message.id);
        if (message.type === "progress") {
          waiting?.onProgress?.(message.loaded, message.total);
          return;
        }
        pending.delete(message.id);
        waiting?.resolve(message);
      },
    );
    worker.addEventListener("error", () => {
      // Ein abgestürzter Worker beendet alle offenen Aufträge mit Fehler.
      for (const [id, waiting] of pending) {
        waiting.resolve({ type: "error", id, message: "Worker abgestürzt" });
      }
      pending.clear();
      loaded.clear();
      worker?.terminate();
      worker = undefined;
    });
  }
  return worker;
}

type RequestBody =
  | Omit<Extract<WorkerRequest, { type: "load" }>, "id">
  | Omit<Extract<WorkerRequest, { type: "synthesize" }>, "id">;

function send(
  request: RequestBody,
  onProgress?: (loaded: number, total: number) => void,
): Promise<WorkerResponse> {
  const id = nextId++;
  return new Promise<WorkerResponse>((resolve) => {
    pending.set(id, { resolve, onProgress });
    getWorker().postMessage({ ...request, id } as WorkerRequest);
  });
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    void promise.then((value) => {
      clearTimeout(timer);
      resolve(value);
    });
  });
}

/**
 * Lädt Modell und Stimmen für eine Sprache (im Hintergrund, ohne Geste).
 * `true`, wenn das Modell danach bereit ist.
 */
export function preloadModel(
  lang: string,
  onProgress?: (fraction: number) => void,
): Promise<boolean> {
  return loadModelManifest().then((current) => {
    const entry = languageEntry(current, lang);
    if (!current || !entry) return false;
    const key = entry.espeak;
    let promise = loaded.get(key);
    if (!promise) {
      promise = send({ type: "load", manifest: current, lang }, (done, total) =>
        onProgress?.(total > 0 ? Math.min(1, done / total) : 1),
      ).then((response) => response.type === "loaded");
      loaded.set(key, promise);
      void promise.then((ok) => {
        if (!ok) loaded.delete(key);
      });
    }
    return promise;
  });
}

/**
 * Für Stufe 6 und das erste Vorlesen: gibt den Ton frei (synchron, in der
 * Geste) und wartet höchstens `timeoutMs` auf das Modell.
 */
export function prepareModel(
  lang: string,
  timeoutMs = MODEL_PREPARE_TIMEOUT_MS,
): Promise<boolean> {
  unlockAudio();
  return withTimeout(preloadModel(lang), timeoutMs, false);
}

function audioKey(
  text: string,
  lang: string,
  speed: number,
  voice?: string | undefined,
) {
  return JSON.stringify([lang, voice ?? "", speed, text]);
}

async function synthesize(
  text: string,
  lang: string,
  speed: number,
  voice?: string | undefined,
): Promise<{ samples: Float32Array; sampleRate: number } | null> {
  const key = audioKey(text, lang, speed, voice);
  const hit = audioCache.get(key);
  if (hit) {
    // Zuletzt benutzt nach hinten.
    audioCache.delete(key);
    audioCache.set(key, hit);
    return hit;
  }
  const current = await loadModelManifest();
  if (!current || !languageEntry(current, lang)) return null;
  const response = await send({
    type: "synthesize",
    manifest: current,
    lang,
    text,
    voice,
    speed,
  });
  if (response.type !== "audio") return null;
  const result = { samples: response.samples, sampleRate: response.sampleRate };
  audioCache.set(key, result);
  while (audioCache.size > AUDIO_CACHE_SIZE) {
    const oldest = audioCache.keys().next().value;
    if (oldest === undefined) break;
    audioCache.delete(oldest);
  }
  return result;
}

/** Erzeugt Audio vorab (z. B. die Wörter einer Runde), ohne abzuspielen. */
export async function pregenerate(texts: string[], lang: string, speed = 1) {
  for (const text of texts) {
    if (text.trim()) await synthesize(text, lang, speed);
  }
}

/**
 * Liest mit dem Modell vor. `false`, wenn das Modell nicht sprechen konnte
 * (dann übernimmt der Aufrufer mit der Gerätestimme).
 */
export async function speakWithModel(
  text: string,
  lang: string,
  options: { speed?: number; voice?: string } = {},
): Promise<boolean> {
  const mine = ++generation;
  stopAudio();
  const audio = await synthesize(
    text,
    lang,
    options.speed ?? 1,
    options.voice ?? preferredVoice(baseLanguage(lang)) ?? undefined,
  ).catch(() => null);
  if (!audio) return false;
  // Inzwischen wurde etwas Neues angefordert oder gestoppt.
  if (mine !== generation) return true;
  await playSamples(audio.samples, audio.sampleRate);
  return true;
}

/** Beendet die Wiedergabe; laufende Erzeugungen werden nicht mehr abgespielt. */
export function stopModel() {
  generation += 1;
  stopAudio();
}

export type LanguageStatus = "installed" | "missing" | "unavailable";

/** Sprachen mit Modell, z. B. für die Einstellungen. */
export async function modelLanguages(): Promise<
  { code: string; entry: SpeechLanguage }[]
> {
  const current = await loadModelManifest();
  return Object.entries(current?.languages ?? {}).map(([code, entry]) => ({
    code,
    entry,
  }));
}

/** Ist eine Sprache vollständig auf dem Gerät (also auch offline nutzbar)? */
export async function languageStatus(lang: string): Promise<LanguageStatus> {
  const current = await loadModelManifest();
  const entry = languageEntry(current, lang);
  if (!current || !entry) return "unavailable";
  for (const asset of assetsFor(current, entry)) {
    if (!(await isAssetCached(asset))) return "missing";
  }
  return "installed";
}

/**
 * Installiert eine Sprache (lädt und prüft alle Dateien in den eigenen Cache).
 * `onProgress` meldet den Anteil von 0 bis 1.
 */
export function installLanguage(
  lang: string,
  onProgress?: (fraction: number) => void,
): Promise<boolean> {
  return preloadModel(lang, onProgress);
}

/** Entfernt Modell und Stimmen einer Sprache vom Gerät. */
export async function removeLanguage(lang: string): Promise<void> {
  const current = await loadModelManifest();
  const entry = languageEntry(current, lang);
  if (!entry) return;
  loaded.delete(entry.espeak);
  audioCache.clear();
  await removeAssets(languageAssets(entry));
}

/** Kurze Hörprobe einer Stimme in ihrer Sprache. */
export async function speakSample(
  lang: string,
  voice: string,
): Promise<boolean> {
  unlockAudio();
  const current = await loadModelManifest();
  const entry = languageEntry(current, lang);
  if (!entry) return false;
  const chosen = resolveVoice(entry, voice);
  const text =
    baseLanguage(lang) === "de"
      ? `Hallo, ich bin ${chosen.label}. So klinge ich beim Vorlesen.`
      : `Hello, I am ${chosen.label}. This is how I sound when I read aloud.`;
  return speakWithModel(text, lang, { voice: chosen.id });
}

/** Bytes, die für eine Sprache noch geladen werden müssen. */
export async function missingBytes(lang: string): Promise<number> {
  const current = await loadModelManifest();
  const entry = languageEntry(current, lang);
  if (!current || !entry) return 0;
  let bytes = 0;
  for (const asset of assetsFor(current, entry)) {
    if (!(await isAssetCached(asset))) bytes += asset.size;
  }
  return bytes;
}
