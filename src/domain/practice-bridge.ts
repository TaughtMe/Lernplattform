/**
 * Brücke zwischen Wortspeicher und Textbox (Plan 2.22 und 2.23): Wörter reisen
 * als Adressparameter `?woerter=a,b,c`. Alles, was aus der Adresse kommt, wird
 * mit Zod geprüft; ungültige Parameter werden ignoriert.
 */
import * as z from "zod";
import { getLearningWordCollection } from "./german-learning-content";
import type { WordResult } from "./text-compare";

export const BRIDGE_MAX_WORDS = 50;
const MAX_WORD_LENGTH = 60;
const MAX_PARAM_LENGTH = BRIDGE_MAX_WORDS * (MAX_WORD_LENGTH + 1);

export const TEXTBOX_PATH = "/frei/german/textbox";
export const TEXTBOX_WORKSHEET_PATH = "/frei/german/textbox/laufzettel";
export const LEARNING_WORDS_PATH = "/frei/german/lernwoerter";

const wordSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_WORD_LENGTH)
  // Kein Steuerzeichen, keine Spitzklammern: Wörter sind nur Text.
  .regex(/^[^\p{Cc}<>]+$/u);

export const bridgeWordsSchema = z
  .array(wordSchema)
  .min(1)
  .max(BRIDGE_MAX_WORDS);

const collectionIdSchema = z.string().regex(/^[a-z0-9-]{1,40}$/);

/** Liest `woerter=a,b,c`. Doppelte entfallen; mehr als 50 oder Ungültiges ergibt []. */
export function parseWordsParam(raw: string | null | undefined): string[] {
  if (!raw || raw.length > MAX_PARAM_LENGTH) return [];
  const seen = new Set<string>();
  const words: string[] = [];
  for (const part of raw.split(",")) {
    const word = part.trim().normalize("NFC");
    if (!word) continue;
    const key = word.toLocaleLowerCase("de");
    if (seen.has(key)) continue;
    seen.add(key);
    words.push(word);
  }
  const parsed = bridgeWordsSchema.safeParse(words);
  return parsed.success ? parsed.data : [];
}

/** Liest `sammlung=<id>`; nur bekannte Sammlungen des Wortspeichers gelten. */
export function parseCollectionParam(
  raw: string | null | undefined,
): string | undefined {
  const parsed = collectionIdSchema.safeParse(raw);
  if (!parsed.success) return undefined;
  return getLearningWordCollection(parsed.data) ? parsed.data : undefined;
}

/** Wörter für die Adresse: ohne Komma, ohne Doppelte, höchstens 50. */
export function wordsForLink(words: readonly string[]): string[] {
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const word of words) {
    const value = word.replace(/,/g, " ").trim();
    const key = value.toLocaleLowerCase("de");
    if (
      !value ||
      value.length > MAX_WORD_LENGTH ||
      seen.has(key) ||
      !wordSchema.safeParse(value).success
    ) {
      continue;
    }
    seen.add(key);
    clean.push(value);
    if (clean.length === BRIDGE_MAX_WORDS) break;
  }
  return clean;
}

function wordsQuery(words: readonly string[]) {
  return `woerter=${words.map((word) => encodeURIComponent(word)).join(",")}`;
}

/** Wortspeicher → Textbox. Ohne gültige Wörter führt der Link zur Bibliothek. */
export function buildTextboxLink(
  words: readonly string[],
  collectionId?: string,
): string {
  const clean = wordsForLink(words);
  if (clean.length === 0) return TEXTBOX_PATH;
  const collection = parseCollectionParam(collectionId);
  return `${TEXTBOX_PATH}?${wordsQuery(clean)}${
    collection ? `&sammlung=${collection}` : ""
  }`;
}

/** Woher die Wörter im Adressparameter `woerter` stammen (bestimmt Titel und Beschriftung). */
export type WordsSource = "textbox" | "fehler";

/** Liest `quelle=`; ohne gültigen Wert gilt „textbox“. */
export function parseSourceParam(raw: string | null | undefined): WordsSource {
  return raw === "fehler" ? "fehler" : "textbox";
}

/**
 * Link in den Wortspeicher mit Wörtern: aus der Textbox (Standard) oder von der
 * Fortschrittsseite („fehler“). Das Blatt dort bietet „Jetzt üben“ und
 * „In eine Wortbox speichern“; es wird nichts automatisch gespeichert.
 */
export function buildLearningWordsLink(
  words: readonly string[],
  source: WordsSource = "textbox",
): string | undefined {
  const clean = wordsForLink(words);
  if (clean.length === 0) return undefined;
  return `${LEARNING_WORDS_PATH}?${wordsQuery(clean)}${
    source === "fehler" ? "&quelle=fehler" : ""
  }`;
}

const historyBoxSchema = z.string().regex(/^[a-z0-9-]{1,60}$/);

/** Liest `wortbox=<id>&ansicht=verlauf`; alles andere ergibt `undefined`. */
export function parseHistoryParams(params: {
  get(name: string): string | null;
}): string | undefined {
  if (params.get("ansicht") !== "verlauf") return undefined;
  const parsed = historyBoxSchema.safeParse(params.get("wortbox"));
  return parsed.success ? parsed.data : undefined;
}

/** Link zum Verlauf einer Wortbox. */
export function buildHistoryLink(boxId: string): string {
  return historyBoxSchema.safeParse(boxId).success
    ? `${LEARNING_WORDS_PATH}?wortbox=${boxId}&ansicht=verlauf`
    : LEARNING_WORDS_PATH;
}

/** Link zu einer Sammlung des Wortspeichers (z. B. aus der Fortschrittsseite). */
export function buildCollectionLink(collectionId: string): string {
  return parseCollectionParam(collectionId)
    ? `${LEARNING_WORDS_PATH}?sammlung=${collectionId}`
    : LEARNING_WORDS_PATH;
}

/** Fehlerwörter eines Durchgangs: falsch, Groß-/Kleinfehler und fehlende Wörter. */
export function roundErrorWords(words: readonly WordResult[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of words) {
    if (entry.kind === "richtig" || entry.kind === "zusaetzlich") continue;
    const word = entry.expected;
    if (!word) continue;
    const key = word.toLocaleLowerCase("de");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(word);
  }
  return result;
}
