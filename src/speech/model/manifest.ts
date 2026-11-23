/**
 * Manifest der Sprachmodell-Dateien (`public/speech/manifest.json`, erzeugt von
 * `scripts/generate-speech-assets.mjs`, Plan 3.2). Rein.
 */
import * as z from "zod";
import { normalizeSpeechLang } from "../voices";

export const MANIFEST_URL = "/speech/manifest.json";

const assetSchema = z.object({
  path: z.string().regex(/^\/speech\/[\w./-]+$/),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  size: z.number().int().positive(),
});
export type SpeechAsset = z.infer<typeof assetSchema>;

const voiceSchema = z.object({
  /** Schlüssel in `voices.npz`, z. B. `expr-voice-2-f`. */
  id: z.string().min(1),
  /** Name für Menschen, z. B. „Bella“. */
  label: z.string().min(1),
  /** Tempo-Faktor aus der Modellkonfiguration (`speed_priors`). */
  speedPrior: z.number().positive().default(1),
});

const languageSchema = z.object({
  /** Sprachwahl für eSpeak, z. B. `de` oder `en-us`. */
  espeak: z.string().min(2),
  model: assetSchema,
  voices: assetSchema,
  sampleRate: z.number().int().positive().default(24000),
  /** Am Ende abgeschnittene Samples (Nachhall des Modells). */
  trimSamples: z.number().int().nonnegative().default(5000),
  defaultVoice: z.string().min(1),
  voiceList: z.array(voiceSchema).min(1),
});
export type SpeechLanguage = z.infer<typeof languageSchema>;

export const speechManifestSchema = z.object({
  version: z.literal(1),
  ort: z.object({ version: z.string(), wasm: assetSchema, mjs: assetSchema }),
  phonemizer: z.object({
    js: assetSchema,
    wasm: assetSchema,
    data: assetSchema,
  }),
  /** Schlüssel ist die Grundsprache (`de`, `en`). */
  languages: z.record(z.string().regex(/^[a-z]{2,3}$/), languageSchema),
});
export type SpeechManifest = z.infer<typeof speechManifestSchema>;

/** Prüft ein geladenes Manifest; ungültig ergibt `null` (dann kein Modell). */
export function parseSpeechManifest(value: unknown): SpeechManifest | null {
  const parsed = speechManifestSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** `de-DE` → `de`. */
export function baseLanguage(lang: string): string {
  return normalizeSpeechLang(lang).split("-")[0] ?? "";
}

/** Eintrag für eine Sprache, sonst `null`. */
export function languageEntry(
  manifest: SpeechManifest | null,
  lang: string,
): SpeechLanguage | null {
  return manifest?.languages[baseLanguage(lang)] ?? null;
}

/** Alle Dateien, die für eine Sprache gebraucht werden. */
export function assetsFor(
  manifest: SpeechManifest,
  entry: SpeechLanguage,
): SpeechAsset[] {
  return [
    manifest.ort.wasm,
    manifest.ort.mjs,
    manifest.phonemizer.js,
    manifest.phonemizer.wasm,
    manifest.phonemizer.data,
    entry.model,
    entry.voices,
  ];
}

/** Alle Dateien des Manifests (zum Aufräumen des Caches). */
export function allAssets(manifest: SpeechManifest): SpeechAsset[] {
  const assets = [
    manifest.ort.wasm,
    manifest.ort.mjs,
    manifest.phonemizer.js,
    manifest.phonemizer.wasm,
    manifest.phonemizer.data,
  ];
  for (const entry of Object.values(manifest.languages)) {
    assets.push(entry.model, entry.voices);
  }
  return assets;
}
