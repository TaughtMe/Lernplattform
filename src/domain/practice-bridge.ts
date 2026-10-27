/**
 * Brücke zwischen Wortspeicher und Textbox (Plan 2.22 und 2.23): Wörter reisen
 * als Adressparameter `?woerter=a,b,c`. Alles, was aus der Adresse kommt, wird
 * mit Zod geprüft; ungültige Parameter werden ignoriert. Dieselbe Brücke trägt
 * den Wortauftrag der Lehrkraft (D4): `?woerter=…&auftrag=<Titel>`.
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
  // Kein Steuerzeichen, kein halbes Ersatzzeichen, keine Spitzklammern:
  // Wörter sind nur Text (und lassen sich verlustfrei in eine Adresse schreiben).
  .regex(/^[^\p{Cc}\p{Cs}<>]+$/u);

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

/* ---------- Wortauftrag der Lehrkraft (D4) ---------- */

/** Der Auftrag liegt auf der Wortspeicher-Seite; sie liest `woerter` und `auftrag`. */
export const ORDER_PATH = "/frei/german";
/** Name der Wortbox, wenn die Lehrkraft keinen Titel eingibt. */
export const ORDER_DEFAULT_TITLE = "Wortauftrag";
export const ORDER_TITLE_MAX = 40;
/**
 * Längste Adresse (mit Ursprung) für einen Auftrags-QR. Bei Fehlerkorrektur
 * „M“ ergeben 500 Zeichen höchstens 85 Module je Kante (Version 17). Auf einem
 * Kärtchen von 4,5 cm sind das gut 0,5 mm je Modul, das schaffen Tablet- und
 * Handykameras sicher. Bei 600 Zeichen wären es 93 Module, bei 700 schon 101.
 * Eine Liste mit 50 Wörtern von durchschnittlich acht Buchstaben passt noch;
 * längere Listen teilt die Lehrkraft besser in zwei Aufträge.
 */
export const ORDER_LINK_MAX_LENGTH = 500;

const FORBIDDEN_IN_TITLE = /[\p{Cc}\p{Cs}<>]/u;

/** Titel ordnen: Unicode-NFC, Zeilenumbrüche und Mehrfach-Leerzeichen werden zu einem Leerzeichen. */
function tidyTitle(raw: string): string {
  return raw.normalize("NFC").replace(/\s+/gu, " ").trim();
}

/**
 * Liest `auftrag=<Titel>` (Name der Wortbox). Zu lange oder ungültige Titel
 * ergeben `undefined`; dann gilt der Standardname.
 */
export function parseOrderTitleParam(
  raw: string | null | undefined,
): string | undefined {
  if (!raw || raw.length > ORDER_TITLE_MAX * 2) return undefined;
  const title = tidyTitle(raw);
  if (!title || [...title].length > ORDER_TITLE_MAX) return undefined;
  return FORBIDDEN_IN_TITLE.test(title) ? undefined : title;
}

/** Was aus dem Textfeld der Lehrkraft als Wortliste erkannt wurde. */
export type OrderWordsReading = {
  /** Gültige Wörter ohne Doppelte, höchstens `BRIDGE_MAX_WORDS`. */
  words: string[];
  /** Doppelte oder unbrauchbare Einträge (zu lang, Sonderzeichen). */
  ignored: number;
  /** Gültige Wörter jenseits der Höchstzahl. */
  surplus: number;
};

/** Wörter aus einem Textfeld: getrennt durch Komma, Semikolon oder Zeilenumbruch. */
export function readOrderWords(text: string): OrderWordsReading {
  const seen = new Set<string>();
  const words: string[] = [];
  let ignored = 0;
  let surplus = 0;
  for (const part of text.split(/[,;\n\r]+/u)) {
    const word = part.trim().normalize("NFC");
    if (!word) continue;
    const key = word.toLocaleLowerCase("de");
    if (seen.has(key) || !wordSchema.safeParse(word).success) {
      ignored += 1;
      continue;
    }
    seen.add(key);
    if (words.length < BRIDGE_MAX_WORDS) words.push(word);
    else surplus += 1;
  }
  return { words, ignored, surplus };
}

export type WordOrderProblem =
  | "keine-woerter"
  | "zu-viele-woerter"
  | "titel-zu-lang"
  | "titel-zeichen"
  | "ungueltig"
  | "link-zu-lang";

export type WordOrderLink =
  | {
      ok: true;
      /** Adresse mit Ursprung (ohne Ursprung: nur Pfad und Abfrage). */
      url: string;
      words: string[];
      title: string;
      ignored: number;
    }
  | { ok: false; problem: WordOrderProblem; message: string };

const ORDER_MESSAGES: Record<WordOrderProblem, string> = {
  "keine-woerter": "Schreibe mindestens ein Wort auf.",
  "zu-viele-woerter": `Das sind zu viele Wörter. Ein Auftrag hat höchstens ${BRIDGE_MAX_WORDS} Wörter.`,
  "titel-zu-lang": `Der Titel ist zu lang. Er darf höchstens ${ORDER_TITLE_MAX} Zeichen haben.`,
  "titel-zeichen": "Im Titel sind die Zeichen < und > nicht erlaubt.",
  ungueltig:
    "Aus diesen Wörtern lässt sich kein Link bauen. Prüfe die Schreibweise.",
  "link-zu-lang":
    "Der Code würde zu dicht und ist schlecht zu scannen. Nimm weniger oder kürzere Wörter oder teile die Liste in zwei Aufträge.",
};

function orderProblem(problem: WordOrderProblem): WordOrderLink {
  return { ok: false, problem, message: ORDER_MESSAGES[problem] };
}

/**
 * Baut die Adresse eines Wortauftrags: `/frei/german?woerter=…&auftrag=…`.
 * Der Auftrag enthält nur Titel und Wörter, nichts über Kinder. Die Wörter
 * werden wie auf dem Schülergerät gelesen (`parseWordsParam`); stimmt das
 * Ergebnis nicht mit der Liste überein, gibt es keinen Link. `origin` ist der
 * Ursprung der App (z. B. `window.location.origin`); die Längengrenze gilt für
 * die vollständige Adresse.
 */
export function buildWordOrderLink(
  input: { title?: string | undefined; text: string },
  origin = "",
): WordOrderLink {
  const title = tidyTitle(input.title ?? "") || ORDER_DEFAULT_TITLE;
  if (FORBIDDEN_IN_TITLE.test(title)) return orderProblem("titel-zeichen");
  if ([...title].length > ORDER_TITLE_MAX) return orderProblem("titel-zu-lang");

  const reading = readOrderWords(input.text);
  if (reading.words.length === 0) return orderProblem("keine-woerter");
  if (reading.surplus > 0) return orderProblem("zu-viele-woerter");

  const path = `${ORDER_PATH}?${wordsQuery(reading.words)}&auftrag=${encodeURIComponent(title)}`;
  // Gegenprobe wie auf dem Schülergerät: dieselben Wörter und derselbe Titel.
  const params = new URL(path, "https://lernraum.invalid").searchParams;
  const back = parseWordsParam(params.get("woerter"));
  if (
    back.length !== reading.words.length ||
    back.some((word, index) => word !== reading.words[index]) ||
    parseOrderTitleParam(params.get("auftrag")) !== title
  ) {
    return orderProblem("ungueltig");
  }

  const url = `${origin}${path}`;
  if (url.length > ORDER_LINK_MAX_LENGTH) return orderProblem("link-zu-lang");
  return {
    ok: true,
    url,
    words: reading.words,
    title,
    ignored: reading.ignored,
  };
}

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
