/** Nachrichten zwischen Hauptthread und Sprachmodell-Worker (Plan 3.3). */
import type { SpeechManifest } from "./manifest";

export type WorkerRequest =
  | { type: "load"; id: number; manifest: SpeechManifest; lang: string }
  | {
      type: "synthesize";
      id: number;
      manifest: SpeechManifest;
      lang: string;
      text: string;
      voice?: string | undefined;
      speed: number;
    };

export type WorkerResponse =
  | { type: "loaded"; id: number }
  | { type: "audio"; id: number; samples: Float32Array; sampleRate: number }
  | { type: "error"; id: number; message: string };
