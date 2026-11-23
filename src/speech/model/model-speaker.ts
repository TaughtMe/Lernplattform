/**
 * Sprachmodell im Hauptthread (Plan 3.3/3.4): Manifest, Worker, Audio-Cache
 * und Wiedergabe. Die Erzeugung läuft im Worker.
 */
import { fetchManifestJson, pruneSpeechCache } from "./assets";
import {
  languageEntry,
  parseSpeechManifest,
  type SpeechManifest,
} from "./manifest";
import {
  isAudioPlaybackAvailable,
  playSamples,
  stopAudio,
  unlockAudio,
} from "./player";
import type { WorkerRequest, WorkerResponse } from "./protocol";

/** Erstes Laden (bis 40 MB) dauert; danach kommt es aus dem Cache. */
export const MODEL_PREPARE_TIMEOUT_MS = 30_000;
/** So viele erzeugte Texte bleiben im Speicher (Wiederholen ohne Rechnen). */
const AUDIO_CACHE_SIZE = 40;

type Pending = {
  resolve: (response: WorkerResponse) => void;
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
        const waiting = pending.get(event.data.id);
        pending.delete(event.data.id);
        waiting?.resolve(event.data);
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

function send(request: RequestBody): Promise<WorkerResponse> {
  const id = nextId++;
  return new Promise<WorkerResponse>((resolve) => {
    pending.set(id, { resolve });
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
export function preloadModel(lang: string): Promise<boolean> {
  return loadModelManifest().then((current) => {
    const entry = languageEntry(current, lang);
    if (!current || !entry) return false;
    const key = entry.espeak;
    let promise = loaded.get(key);
    if (!promise) {
      promise = send({ type: "load", manifest: current, lang }).then(
        (response) => response.type === "loaded",
      );
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
    options.voice,
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
