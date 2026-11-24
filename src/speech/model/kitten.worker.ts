/// <reference lib="webworker" />
/**
 * Sprachmodell-Worker (Plan 3.3): KittenTTS 2 Nano über ONNX Runtime Web und
 * der Lernraum-Phonemizer (eSpeak NG, GPL-3, als eigene Datei aus dem Cache
 * geladen). Der Text verlässt das Gerät nicht: Der Worker lädt nur Dateien vom
 * eigenen Ursprung, alle mit Lernraum ausgeliefert.
 */
import * as ort from "onnxruntime-web/wasm";
import { isAssetCached, loadAsset } from "./assets";
import { phonemeChunks, type Lexicon } from "./frontend";
import {
  assetsFor,
  baseLanguage,
  languageEntry,
  type SpeechAsset,
  type SpeechLanguage,
  type SpeechManifest,
} from "./manifest";
import { parseNpz, type VoiceTable } from "./npz";
import type { WorkerRequest, WorkerResponse } from "./protocol";
import { synthesizeText } from "./synthesis";

declare const self: DedicatedWorkerGlobalScope;

type PhonemizerModule = {
  ccall(
    name: string,
    returns: "number" | "string",
    types: string[],
    args: unknown[],
  ): unknown;
};

type Loaded = {
  /** eSpeak-Sprache, z. B. `de` oder `en-us`. */
  code: string;
  /** Grundsprache für das Frontend, z. B. `de` oder `en`. */
  language: string;
  entry: SpeechLanguage;
  session: ort.InferenceSession;
  voices: VoiceTable;
  lexicon: Lexicon | undefined;
};

type Progress = (bytes: number) => void;

let phonemizer: Promise<PhonemizerModule> | undefined;
let ortReady: Promise<void> | undefined;
let vocab: Promise<Record<string, number>> | undefined;
let current: Promise<Loaded> | undefined;
let currentCode: string | undefined;

async function inflateRaw(compressed: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(compressed)])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function retryOnFailure<T>(promise: Promise<T>, reset: () => void): Promise<T> {
  promise.catch(reset);
  return promise;
}

function loadPhonemizer(
  manifest: SpeechManifest,
  onBytes?: Progress,
): Promise<PhonemizerModule> {
  phonemizer ??= retryOnFailure(
    (async () => {
      const [js, wasm, data] = await Promise.all([
        loadAsset(manifest.phonemizer.js, onBytes),
        loadAsset(manifest.phonemizer.wasm, onBytes),
        loadAsset(manifest.phonemizer.data, onBytes),
      ]);
      const url = URL.createObjectURL(
        new Blob([js], { type: "text/javascript" }),
      );
      try {
        const glue = (await import(/* @vite-ignore */ url)) as {
          default: (options: object) => Promise<PhonemizerModule>;
        };
        const instance = await glue.default({
          wasmBinary: new Uint8Array(wasm),
          getPreloadedPackage: () => data,
          locateFile: (path: string) => path,
          print: () => {},
          printErr: () => {},
        });
        if (instance.ccall("lr_init", "number", [], []) !== 0) {
          throw new Error("Phonemizer: Sprachdaten fehlen");
        }
        return instance;
      } finally {
        URL.revokeObjectURL(url);
      }
    })(),
    () => (phonemizer = undefined),
  );
  return phonemizer;
}

function prepareOrt(manifest: SpeechManifest, onBytes?: Progress) {
  ortReady ??= retryOnFailure(
    Promise.all([
      loadAsset(manifest.ort.wasm, onBytes),
      loadAsset(manifest.ort.mjs, onBytes),
    ]).then(([wasm, glue]) => {
      // Lernraum ist nicht crossOriginIsolated: keine Threads (Plan, P6).
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      ort.env.wasm.wasmBinary = new Uint8Array(wasm);
      // Der Lade-Code kommt aus dem Cache; ONNX Runtime importiert ihn einmal.
      ort.env.wasm.wasmPaths = {
        mjs: URL.createObjectURL(new Blob([glue], { type: "text/javascript" })),
      };
    }),
    () => (ortReady = undefined),
  );
  return ortReady;
}

async function json<T>(asset: SpeechAsset, onBytes?: Progress): Promise<T> {
  return JSON.parse(
    new TextDecoder().decode(await loadAsset(asset, onBytes)),
  ) as T;
}

function loadVocab(manifest: SpeechManifest, onBytes?: Progress) {
  vocab ??= retryOnFailure(
    json<Record<string, number>>(manifest.model.vocab, onBytes),
    () => (vocab = undefined),
  );
  return vocab;
}

function loadLanguage(
  manifest: SpeechManifest,
  lang: string,
  onBytes?: Progress,
): Promise<Loaded> {
  const entry = languageEntry(manifest, lang);
  if (!entry) return Promise.reject(new Error(`Kein Sprachmodell für ${lang}`));
  const code = entry.espeak;
  if (current && currentCode === code) return current;

  // Nur eine Sprache im Speicher (Plan, P7).
  const previous = current;
  currentCode = code;
  current = (async () => {
    if (previous) {
      await previous.then((loaded) => loaded.session.release()).catch(() => {});
    }
    await Promise.all([
      prepareOrt(manifest, onBytes),
      loadPhonemizer(manifest, onBytes),
      loadVocab(manifest, onBytes),
    ]);
    const [model, voicesFile, lexicon] = await Promise.all([
      loadAsset(entry.model, onBytes),
      loadAsset(entry.voices, onBytes),
      entry.lexicon ? json<Lexicon>(entry.lexicon, onBytes) : undefined,
    ]);
    const session = await ort.InferenceSession.create(new Uint8Array(model), {
      executionProviders: ["wasm"],
    });
    const voices = await parseNpz(voicesFile, inflateRaw);
    return {
      code,
      language: baseLanguage(lang),
      entry,
      session,
      voices,
      lexicon,
    };
  })();
  current.catch(() => {
    if (currentCode === code) {
      current = undefined;
      currentCode = undefined;
    }
  });
  return current;
}

async function synthesize(
  request: Extract<WorkerRequest, { type: "synthesize" }>,
) {
  const loaded = await loadLanguage(request.manifest, request.lang);
  const [instance, symbols] = await Promise.all([
    loadPhonemizer(request.manifest),
    loadVocab(request.manifest),
  ]);
  if (
    instance.ccall("lr_set_voice", "number", ["string"], [loaded.code]) !== 0
  ) {
    throw new Error(`Phonemizer: Sprache ${loaded.code} fehlt`);
  }
  const raw = (words: string) =>
    String(
      instance.ccall("lr_phonemize_tie", "string", ["string"], [words]) ?? "",
    ).replaceAll("͡", "^");
  const { session } = loaded;
  return synthesizeText(
    request.text,
    { voice: request.voice, speed: request.speed },
    {
      entry: loaded.entry,
      vocab: symbols,
      voices: loaded.voices,
      sampleRate: request.manifest.model.sampleRate,
      frontend: (text) =>
        phonemeChunks(text, {
          language: loaded.language,
          vocab: symbols,
          raw,
          lexicon: loaded.lexicon,
        }),
      run: async ({ ids, style, speed }) => {
        const output = await session.run({
          input_ids: new ort.Tensor("int64", BigInt64Array.from(ids, BigInt), [
            1,
            ids.length,
          ]),
          style: new ort.Tensor("float32", style, [1, style.length]),
          speed: new ort.Tensor("float32", Float32Array.of(speed), [1]),
        });
        const waveform = output["waveform"]?.data;
        const durations = output["durations"]?.data;
        if (!(waveform instanceof Float32Array) || !durations) {
          throw new Error("Sprachmodell: keine Audiodaten");
        }
        return {
          waveform,
          durations: Array.from(
            durations as ArrayLike<number | bigint>,
            Number,
          ),
        };
      },
    },
  );
}

function reply(message: WorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(message, transfer);
}

/** Fortschritt eines Ladevorgangs; nur über Dateien, die noch geladen werden. */
async function progressFor(request: Extract<WorkerRequest, { type: "load" }>) {
  const entry = languageEntry(request.manifest, request.lang);
  let total = 0;
  for (const asset of entry ? assetsFor(request.manifest, entry) : []) {
    if (!(await isAssetCached(asset))) total += asset.size;
  }
  reply({ type: "progress", id: request.id, loaded: 0, total });
  let loaded = 0;
  let lastSent = 0;
  return (bytes: number) => {
    loaded += bytes;
    // Höchstens etwa alle 2 %, damit der Hauptthread nicht überflutet wird.
    if (loaded - lastSent >= total / 50 || loaded >= total) {
      lastSent = loaded;
      reply({ type: "progress", id: request.id, loaded, total });
    }
  };
}

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  const run = async () => {
    try {
      if (request.type === "load") {
        const progress = await progressFor(request);
        await loadLanguage(request.manifest, request.lang, progress);
        // Installieren heißt: alle Dateien liegen geprüft im Cache. Eine schon
        // geladene Sprache (z. B. nach „Entfernen“) holt fehlende Dateien so
        // wieder; vorhandene kommen ohne Netz aus dem Cache.
        const entry = languageEntry(request.manifest, request.lang);
        if (entry) {
          await Promise.all(
            assetsFor(request.manifest, entry).map((asset) =>
              loadAsset(asset, progress),
            ),
          );
        }
        reply({ type: "loaded", id: request.id });
      } else {
        const samples = await synthesize(request);
        reply(
          {
            type: "audio",
            id: request.id,
            samples,
            sampleRate: request.manifest.model.sampleRate,
          },
          [samples.buffer],
        );
      }
    } catch (error) {
      reply({
        type: "error",
        id: request.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
  void run();
});
