/// <reference lib="webworker" />
/**
 * Sprachmodell-Worker (Plan 3.3): Phonemizer (eSpeak NG, GPL-3, als eigene
 * Datei aus dem Cache geladen) und KittenTTS über ONNX Runtime Web. Der Text
 * verlässt das Gerät nicht: Der Worker lädt nur Dateien vom eigenen Ursprung.
 */
import * as ort from "onnxruntime-web/wasm";
import { loadAsset } from "./assets";
import {
  languageEntry,
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
  lang: string;
  entry: SpeechLanguage;
  session: ort.InferenceSession;
  voices: VoiceTable;
};

let phonemizer: Promise<PhonemizerModule> | undefined;
let ortReady: Promise<void> | undefined;
let current: Promise<Loaded> | undefined;
let currentLang: string | undefined;

async function inflateRaw(compressed: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(compressed)])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function loadPhonemizer(manifest: SpeechManifest): Promise<PhonemizerModule> {
  phonemizer ??= (async () => {
    const [js, wasm, data] = await Promise.all([
      loadAsset(manifest.phonemizer.js),
      loadAsset(manifest.phonemizer.wasm),
      loadAsset(manifest.phonemizer.data),
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
  })();
  phonemizer.catch(() => {
    phonemizer = undefined;
  });
  return phonemizer;
}

function prepareOrt(manifest: SpeechManifest): Promise<void> {
  ortReady ??= Promise.all([
    loadAsset(manifest.ort.wasm),
    loadAsset(manifest.ort.mjs),
  ]).then(([wasm, glue]) => {
    // Lernraum ist nicht crossOriginIsolated: keine Threads (Plan, P6).
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    ort.env.wasm.wasmBinary = new Uint8Array(wasm);
    // Der Lade-Code kommt aus dem Cache; ONNX Runtime importiert ihn einmal.
    ort.env.wasm.wasmPaths = {
      mjs: URL.createObjectURL(new Blob([glue], { type: "text/javascript" })),
    };
  });
  ortReady.catch(() => {
    ortReady = undefined;
  });
  return ortReady;
}

async function loadLanguage(
  manifest: SpeechManifest,
  lang: string,
): Promise<Loaded> {
  const entry = languageEntry(manifest, lang);
  if (!entry) throw new Error(`Kein Sprachmodell für ${lang}`);
  if (current && currentLang === entry.espeak) return current;

  // Nur eine Sprache im Speicher (Plan, P7).
  const previous = current;
  currentLang = entry.espeak;
  current = (async () => {
    if (previous) {
      await previous.then((loaded) => loaded.session.release()).catch(() => {});
    }
    await Promise.all([prepareOrt(manifest), loadPhonemizer(manifest)]);
    const [model, voicesFile] = await Promise.all([
      loadAsset(entry.model),
      loadAsset(entry.voices),
    ]);
    const session = await ort.InferenceSession.create(new Uint8Array(model), {
      executionProviders: ["wasm"],
    });
    const voices = await parseNpz(voicesFile, inflateRaw);
    return { lang: entry.espeak, entry, session, voices };
  })();
  current.catch(() => {
    if (currentLang === entry.espeak) {
      current = undefined;
      currentLang = undefined;
    }
  });
  return current;
}

async function synthesize(
  request: Extract<WorkerRequest, { type: "synthesize" }>,
) {
  const loaded = await loadLanguage(request.manifest, request.lang);
  const instance = await loadPhonemizer(request.manifest);
  if (
    instance.ccall("lr_set_voice", "number", ["string"], [loaded.lang]) !== 0
  ) {
    throw new Error(`Phonemizer: Sprache ${loaded.lang} fehlt`);
  }
  const { session } = loaded;
  return synthesizeText(
    request.text,
    { voice: request.voice, speed: request.speed },
    {
      entry: loaded.entry,
      voices: loaded.voices,
      phonemize: (words) =>
        String(
          instance.ccall("lr_phonemize", "string", ["string"], [words]) ?? "",
        ),
      run: async ({ ids, style, speed }) => {
        const feeds = {
          input_ids: new ort.Tensor("int64", BigInt64Array.from(ids, BigInt), [
            1,
            ids.length,
          ]),
          style: new ort.Tensor("float32", style, [1, style.length]),
          speed: new ort.Tensor("float32", Float32Array.of(speed), [1]),
        };
        const output = await session.run(feeds);
        const first = session.outputNames[0];
        const tensor = first ? output[first] : undefined;
        if (!tensor || !(tensor.data instanceof Float32Array)) {
          throw new Error("Sprachmodell: keine Audiodaten");
        }
        return tensor.data;
      },
    },
  );
}

function reply(message: WorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(message, transfer);
}

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  const run = async () => {
    try {
      if (request.type === "load") {
        await loadLanguage(request.manifest, request.lang);
        reply({ type: "loaded", id: request.id });
      } else {
        const samples = await synthesize(request);
        const entry = languageEntry(request.manifest, request.lang);
        reply(
          {
            type: "audio",
            id: request.id,
            samples,
            sampleRate: entry?.sampleRate ?? 24000,
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
