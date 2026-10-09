import * as z from "zod";
import { tokenizeText } from "./text-compare";

export const textboxDifficultySchema = z.enum(["leicht", "mittel", "schwer"]);
export const textboxPhenomenonSchema = z.enum([
  "doppelkonsonanten",
  "vokallaenge",
  "dehnungs-h",
  "ie",
  "s-ss-sz",
  "gross-klein",
  "auslautverhaertung",
  "wortbausteine",
  "zusammensetzungen",
  "gemischt",
]);
export const textboxGenreSchema = z.enum([
  "geschichte",
  "alltag",
  "erlebnis",
  "sachtext",
  "schule",
]);
export const textboxTextSchema = z
  .object({
    id: z.string().regex(/^TXT-\d{3}$/),
    title: z.string().trim().min(1).max(80),
    difficulty: textboxDifficultySchema,
    phenomena: z.array(textboxPhenomenonSchema).min(1),
    genre: textboxGenreSchema,
    text: z.string().trim().min(1),
    targetWords: z.array(z.string().trim().min(1)).min(1),
    usage: z.array(z.enum(["frei", "wortspeicher"])).min(1),
  })
  .strict();

export type TextboxDifficulty = z.infer<typeof textboxDifficultySchema>;
export type TextboxPhenomenon = z.infer<typeof textboxPhenomenonSchema>;
export type TextboxGenre = z.infer<typeof textboxGenreSchema>;
export type TextboxText = z.infer<typeof textboxTextSchema>;

export const TEXTBOX_DIFFICULTIES = textboxDifficultySchema.options;
export const TEXTBOX_PHENOMENA = textboxPhenomenonSchema.options;

export const TEXTBOX_DIFFICULTY_LABELS: Record<TextboxDifficulty, string> = {
  leicht: "Leicht",
  mittel: "Mittel",
  schwer: "Schwer",
};

export const TEXTBOX_PHENOMENON_LABELS: Record<TextboxPhenomenon, string> = {
  doppelkonsonanten: "Doppelkonsonanten",
  vokallaenge: "Lange und kurze Vokale",
  "dehnungs-h": "Dehnungs-h",
  ie: "Wörter mit ie",
  "s-ss-sz": "s, ss und ß",
  "gross-klein": "Groß- und Kleinschreibung",
  auslautverhaertung: "Auslautverhärtung",
  wortbausteine: "Wortbausteine und Wortfamilien",
  zusammensetzungen: "Zusammengesetzte Wörter",
  gemischt: "Gemischt",
};

export const TEXTBOX_GENRE_LABELS: Record<TextboxGenre, string> = {
  geschichte: "Geschichte",
  alltag: "Alltag",
  erlebnis: "Erlebnis",
  sachtext: "Sachtext",
  schule: "Schule",
};

/** Wortanzahl je Schwierigkeit (kalibrierbar, siehe Plan 1.8). */
export const TEXTBOX_WORD_COUNT_RANGES: Record<
  TextboxDifficulty,
  { min: number; max: number }
> = {
  leicht: { min: 30, max: 60 },
  mittel: { min: 60, max: 110 },
  schwer: { min: 110, max: 180 },
};

/** Schwerpunkt → Sammlung im Wortspeicher (nur wo es eine passende gibt). */
export const PHENOMENON_TO_COLLECTION: Partial<
  Record<TextboxPhenomenon, string>
> = {
  doppelkonsonanten: "double-consonants",
  "dehnungs-h": "silent-h",
  ie: "long-i",
  "s-ss-sz": "s-ss-sz",
  auslautverhaertung: "final-devoicing",
};

export function countWords(text: string): number {
  return tokenizeText(text).filter((token) => token.kind === "word").length;
}
