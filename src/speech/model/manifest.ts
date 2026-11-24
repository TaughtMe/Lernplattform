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
  /** Schlüssel in `voices.npz`, z. B. `anna`. */
  id: z.string().min(1),
  /** Name für Menschen, z. B. „Anna“. */
  label: z.string().min(1),
  description: z.string().default(""),
});
export type ModelVoice = z.infer<typeof voiceSchema>;

const languageSchema = z.object({
  /** Name der Sprache für Menschen, z. B. „Deutsch“. */
  label: z.string().min(1),
  /** Sprachwahl für eSpeak, z. B. `de` oder `en-us`. */
  espeak: z.string().min(2),
  model: assetSchema,
  voices: assetSchema,
  /** Nur Englisch: Aussprachewörterbuch im misaki-Alphabet. */
  lexicon: assetSchema.optional(),
  defaultVoice: z.string().min(1),
  voiceList: z.array(voiceSchema).min(1),
});
export type SpeechLanguage = z.infer<typeof languageSchema>;

export const speechManifestSchema = z.object({
  version: z.literal(2),
  model: z.object({
    name: z.string(),
    revision: z.string(),
    sampleRate: z.number().int().positive(),
    vocab: assetSchema,
  }),
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

/** Dateien, die alle Sprachen teilen (Laufzeit, Phonemizer, Vokabular). */
export function sharedAssets(manifest: SpeechManifest): SpeechAsset[] {
  return [
    manifest.ort.wasm,
    manifest.ort.mjs,
    manifest.phonemizer.js,
    manifest.phonemizer.wasm,
    manifest.phonemizer.data,
    manifest.model.vocab,
  ];
}

/** Dateien, die nur zu einer Sprache gehören. */
export function languageAssets(entry: SpeechLanguage): SpeechAsset[] {
  return [entry.model, entry.voices, ...(entry.lexicon ? [entry.lexicon] : [])];
}

/** Alle Dateien, die für eine Sprache gebraucht werden. */
export function assetsFor(
  manifest: SpeechManifest,
  entry: SpeechLanguage,
): SpeechAsset[] {
  return [...sharedAssets(manifest), ...languageAssets(entry)];
}

/** Alle Dateien des Manifests (zum Aufräumen des Caches). */
export function allAssets(manifest: SpeechManifest): SpeechAsset[] {
  return [
    ...sharedAssets(manifest),
    ...Object.values(manifest.languages).flatMap(languageAssets),
  ];
}

/** Stimme nach Kennung oder Name (beliebige Schreibung), sonst die Vorgabe. */
export function resolveVoice(
  entry: SpeechLanguage,
  wanted?: string | null,
): ModelVoice {
  const want = wanted?.toLowerCase();
  const fallback = entry.voiceList[0] as ModelVoice;
  return (
    entry.voiceList.find(
      (voice) => voice.id === want || voice.label.toLowerCase() === want,
    ) ??
    entry.voiceList.find((voice) => voice.id === entry.defaultVoice) ??
    fallback
  );
}
