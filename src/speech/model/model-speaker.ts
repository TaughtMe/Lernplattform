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
  // Offene Aufträge beenden, damit die Warteschlange nicht hängen bleibt.
  for (const [id, waiting] of pending) {
    waiting.resolve({ type: "error", id, message: "zurückgesetzt" });
  }
  pending.clear();
  loaded.clear();
  audioCache.clear();
  installed.clear();
  for (const job of queue.splice(0)) job.resolve(null);
  inFlight.clear();
  pumping = false;
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

/** Die Stimme, die für eine Sprache spricht: Wunsch, sonst gewählte, sonst Vorgabe. */
function voiceFor(lang: string, voice?: string | undefined): string {
  const entry = languageEntry(knownManifest ?? null, lang);
  const wanted = voice ?? preferredVoice(baseLanguage(lang));
  return entry ? resolveVoice(entry, wanted).id : (wanted ?? "");
}

/** Schlüssel für den Audio-Speicher: Grundsprache, Stimme, Tempo, Text. */
export function audioKey(
  text: string,
  lang: string,
  speed: number,
  voice: string,
) {
  return JSON.stringify([baseLanguage(lang), voice, speed, text]);
}

type Audio = { samples: Float32Array; sampleRate: number };
type Job = {
  key: string;
  text: string;
  lang: string;
  speed: number;
  voice: string;
  /** Ein Vorlesen wartet darauf; darf nicht verworfen werden. */
  urgent: boolean;
  /** Wer den Vorab-Auftrag gestellt hat; `null`: geteilt, nie verworfen. */
  owner: string | null;
  resolve: (audio: Audio | null) => void;
};

/**
 * Eine Erzeugung nach der anderen (eine ONNX-Sitzung im Worker). Vorlesen
 * geht vor Vorab-Erzeugen; ein Text, der schon in Arbeit ist, wird nicht
 * doppelt erzeugt.
 */
const queue: Job[] = [];
const inFlight = new Map<string, Promise<Audio | null>>();
let pumping = false;

function remember(key: string, audio: Audio) {
  audioCache.set(key, audio);
  while (audioCache.size > AUDIO_CACHE_SIZE) {
    const oldest = audioCache.keys().next().value;
    if (oldest === undefined) break;
    audioCache.delete(oldest);
  }
}

async function pump() {
  if (pumping) return;
  pumping = true;
  try {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const current = await loadModelManifest();
      let audio: Audio | null = null;
      if (current && languageEntry(current, job.lang)) {
        const response = await send({
          type: "synthesize",
          manifest: current,
          lang: job.lang,
          text: job.text,
          voice: job.voice,
          speed: job.speed,
        }).catch(() => null);
        if (response?.type === "audio") {
          audio = {
            samples: response.samples,
            sampleRate: response.sampleRate,
          };
          remember(job.key, audio);
        }
      }
      inFlight.delete(job.key);
      job.resolve(audio);
    }
  } finally {
    pumping = false;
  }
}

async function synthesize(
  text: string,
  lang: string,
  speed: number,
  voice: string | undefined,
  urgent: boolean,
  owner: string | null = null,
): Promise<Audio | null> {
  // Erst das Manifest: Der Schlüssel braucht die aufgelöste Stimme.
  await loadModelManifest();
  const chosen = voiceFor(lang, voice);
  const key = audioKey(text, lang, speed, chosen);
  const hit = audioCache.get(key);
  if (hit) {
    // Zuletzt benutzt nach hinten.
    audioCache.delete(key);
    audioCache.set(key, hit);
    return hit;
  }
  const running = inFlight.get(key);
  if (running) {
    // Vorlesen holt einen wartenden Vorab-Auftrag nach vorn.
    const index = queue.findIndex((job) => job.key === key);
    const job = queue[index];
    if (job && urgent) {
      job.urgent = true;
      queue.splice(index, 1);
      queue.unshift(job);
    } else if (job && job.owner !== owner) {
      // Mehrere Aufrufer wollen denselben Text: keiner darf ihn verwerfen.
      job.owner = null;
    }
    return running;
  }
  const promise = new Promise<Audio | null>((resolve) => {
    const job: Job = {
      key,
      text,
      lang,
      speed,
      voice: chosen,
      urgent,
      owner: urgent ? null : owner,
      resolve,
    };
    if (urgent) queue.unshift(job);
    else queue.push(job);
  });
  inFlight.set(key, promise);
  void pump();
  return promise;
}

/** Höchstens so viele Texte werden auf einmal vorab erzeugt. */
const MAX_AHEAD = 6;

/**
 * Erzeugt Audio vorab (z. B. die nächsten Wörter), ohne abzuspielen. Läuft
 * hinter jedem Vorlesen. Noch nicht begonnene Vorab-Aufträge desselben
 * Aufrufers (`owner`) für andere Texte (die vorige Karte) fallen weg;
 * Aufträge anderer Aufrufer bleiben.
 */
export async function pregenerate(
  texts: string[],
  lang: string,
  speed = 1,
  owner = "vorab",
) {
  await loadModelManifest();
  const wanted = texts
    .map((text) => text.trim())
    .filter(Boolean)
    .slice(0, MAX_AHEAD);
  const keep = new Set(
    wanted.map((text) => audioKey(text, lang, speed, voiceFor(lang))),
  );
  for (let index = queue.length - 1; index >= 0; index -= 1) {
    const job = queue[index];
    if (job && !job.urgent && job.owner === owner && !keep.has(job.key)) {
      queue.splice(index, 1);
      inFlight.delete(job.key);
      job.resolve(null);
    }
  }
  return Promise.all(
    wanted.map((text) =>
      synthesize(text, lang, speed, undefined, false, owner),
    ),
  );
}

/**
 * Liest mit dem Modell vor. `false`, wenn das Modell nicht sprechen konnte
 * (dann übernimmt der Aufrufer mit der Gerätestimme).
 */
export async function speakWithModel(
  text: string,
  lang: string,
  options: { speed?: number; voice?: string; onStart?: () => void } = {},
): Promise<boolean> {
  const mine = ++generation;
  stopAudio();
  const audio = await synthesize(
    text,
    lang,
    options.speed ?? 1,
    options.voice,
    true,
  ).catch(() => null);
  if (!audio) return false;
  // Inzwischen wurde etwas Neues angefordert oder gestoppt.
  if (mine !== generation) return true;
  options.onStart?.();
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
/** Sprachen, die in dieser Sitzung als installiert gelten (spart Cache-Abfragen). */
const installed = new Set<string>();

export async function languageStatus(lang: string): Promise<LanguageStatus> {
  const current = await loadModelManifest();
  const entry = languageEntry(current, lang);
  if (!current || !entry) return "unavailable";
  if (installed.has(entry.espeak)) return "installed";
  for (const asset of assetsFor(current, entry)) {
    if (!(await isAssetCached(asset))) return "missing";
  }
  installed.add(entry.espeak);
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
  installed.delete(entry.espeak);
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
