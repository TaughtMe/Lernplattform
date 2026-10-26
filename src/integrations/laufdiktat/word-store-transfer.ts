import { LEARNING_WORD_COLLECTIONS } from "../../domain/german-learning-content";
import {
  alignWords,
  tokenizeText,
  wordsOf,
  type TextToken,
} from "../../domain/text-compare";
import { wordKey } from "../../domain/word-box";
import { liveWordKind, type LiveSession } from "./live-session";
import {
  markWordStoreTransferDone,
  readWordStoreTransferDone,
} from "./live-trace";
import {
  liveWordErrorKey,
  type LiveTransferTrace,
} from "./vocabulary-transfer";

export type { WordStoreTransferChoice } from "./live-session";

/** Mindestlänge (Buchstaben) bei „Alle Wörter“; kalibrierbar (Plan 2.8). */
export const WORD_STORE_MIN_LETTERS = 4;

/** Höchstens so viele Wörter zeigt der Abschlussbildschirm (Plan 2.8). */
export const WORD_STORE_SHOWN_WORDS = 5;

const LETTER = /\p{L}/gu;
const ONLY_NUMBERS = /^[\p{N}\p{P}\p{S}]+$/u;

function isNumberOnly(word: string) {
  return ONLY_NUMBERS.test(word);
}

function letterCount(word: string) {
  return word.match(LETTER)?.length ?? 0;
}

function distinct(words: readonly string[]) {
  const seen = new Set<string>();
  return words.filter((word) => {
    const key = wordKey(word);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- Satzanfänge (G-012) -----------------------------------------------------
//
// Am Satzanfang ist jedes Wort großgeschrieben. Im Wortspeicher soll es so
// stehen, wie man es mitten im Satz schreibt: „Plötzlich“ wird „plötzlich“,
// „Hund“ bleibt „Hund“.

const SENTENCE_END = new Set([".", "!", "?", ":"]);

/** Kürzel, nach deren Punkt kein neuer Satz beginnt („z. B. Tom“, „Dr. Roth“). */
const ABBREVIATIONS = new Set([
  "dr",
  "hr",
  "fr",
  "nr",
  "prof",
  "bzw",
  "usw",
  "ca",
  "vgl",
  "ggf",
  "evtl",
  "str",
  "mio",
  "mrd",
  "sog",
  "bspw",
]);

let knownCapitalised: ReadonlySet<string> | undefined;

/** Großgeschrieben bekannte Wörter (Nomen) der eingebauten Wortboxen, einmal gebaut. */
function capitalisedWordIndex(): ReadonlySet<string> {
  knownCapitalised ??= new Set(
    LEARNING_WORD_COLLECTIONS.flatMap((collection) => collection.words)
      .map((word) => word.normalize("NFC"))
      .filter((word) => /^\p{Lu}/u.test(word)),
  );
  return knownCapitalised;
}

/**
 * Indizes (unter den Wörtern) der Wörter am Satzanfang: das erste Wort des
 * Textes und jedes großgeschriebene Wort nach „.“, „!“, „?“ oder „:“, auch nach
 * öffnenden Anführungszeichen. Ein Punkt nach Kürzel, Zahl oder Einzelbuchstaben
 * beendet keinen Satz.
 */
function sentenceStartIndexes(tokens: readonly TextToken[]): Set<number> {
  const starts = new Set<number>();
  let pending = true;
  let previousWord: string | undefined;
  for (const token of tokens) {
    if (token.kind === "word") {
      if (pending && /^\p{Lu}/u.test(token.text)) starts.add(token.index);
      pending = false;
      previousWord = token.text;
      continue;
    }
    if (SENTENCE_END.has(token.text)) {
      const lower = previousWord?.toLocaleLowerCase("de");
      const abbreviation =
        token.text === "." &&
        lower !== undefined &&
        (ABBREVIATIONS.has(lower) ||
          /^\p{N}+$/u.test(lower) ||
          [...lower].length === 1);
      if (!abbreviation) pending = true;
    }
    previousWord = undefined;
  }
  return starts;
}

function isAcronym(word: string) {
  return (word.slice(1).match(/\p{Lu}/gu)?.length ?? 0) > 0;
}

/**
 * Wörter eines Textes in der Form für den Wortspeicher: Wörter am Satzanfang
 * klein, außer sie sind als Nomen bekannt, stehen im selben Text auch mitten im
 * Satz großgeschrieben oder sind Kürzel („USA“, „E-Mail“).
 */
function storeForms(text: string) {
  const tokens = tokenizeText(text);
  const words = wordsOf(tokens);
  const starts = sentenceStartIndexes(tokens);
  const capitalInside = new Set(
    words
      .filter((word, index) => !starts.has(index) && /^\p{Lu}/u.test(word))
      .map((word) => word.toLocaleLowerCase("de")),
  );
  const known = capitalisedWordIndex();
  const keepsCapital = (word: string) =>
    isAcronym(word) ||
    known.has(word.normalize("NFC")) ||
    capitalInside.has(word.toLocaleLowerCase("de"));
  const form = (word: string, index: number) =>
    starts.has(index) && !keepsCapital(word)
      ? word.toLocaleLowerCase("de")
      : word;
  return { tokens, words, starts, form, keepsCapital };
}

/**
 * Falsch geschriebene Wörter eines Textteils: Wort für Wort ausgerichtet, nur
 * „falsch“ und „nur Groß-/Kleinschreibung“. Ausgelassene und zusätzliche Wörter
 * zählen nicht, reine Zahlen nie. Zurück kommen die Wörter des Zieltextes, am
 * Satzanfang klein geschrieben (G-012), außer es sind Nomen. Ein reiner
 * Großschreibfehler am Satzanfang („heute“ für „Heute“) zählt nicht.
 */
export function misspelledWords(target: string, input: string): string[] {
  const { words, starts, form, keepsCapital } = storeForms(target);
  const results = alignWords(words, wordsOf(tokenizeText(input)));
  return distinct(
    results.flatMap((result) => {
      const { expected, expectedIndex } = result;
      if (
        (result.kind !== "falsch" && result.kind !== "gross-klein") ||
        expected === undefined ||
        isNumberOnly(expected)
      ) {
        return [];
      }
      const atStart = expectedIndex !== undefined && starts.has(expectedIndex);
      if (atStart && result.kind === "gross-klein" && !keepsCapital(expected)) {
        return [];
      }
      return [
        expectedIndex === undefined ? expected : form(expected, expectedIndex),
      ];
    }),
  );
}

/**
 * Wörter, die in den Wortspeicher übernommen werden. `errorWords` sind die
 * falsch geschriebenen und werden bevorzugt (und sofort fällig).
 */
export function buildWordStoreTransfer(
  session: LiveSession,
  trace: LiveTransferTrace,
): { words: string[]; errorWords: string[] } | undefined {
  if (session.stationMode || session.wordStoreTransfer === "none") {
    return undefined;
  }
  const errorWords: string[] = [];
  const reached: string[] = [];
  session.words.forEach((word, index) => {
    if (liveWordKind(word) !== "text") return;
    errorWords.push(
      ...(trace.wordMisspellings?.[liveWordErrorKey(word)] ?? []),
    );
    if (trace.finished || index <= trace.currentIndex) {
      const { words, form } = storeForms(word.targetWord);
      reached.push(
        ...words
          .map(form)
          .filter(
            (token) =>
              !isNumberOnly(token) &&
              letterCount(token) >= WORD_STORE_MIN_LETTERS,
          ),
      );
    }
  });
  const errors = distinct(errorWords.filter((word) => !isNumberOnly(word)));
  const words =
    session.wordStoreTransfer === "all"
      ? distinct([...errors, ...reached])
      : errors;
  return words.length === 0 ? undefined : { words, errorWords: errors };
}

export type WordStoreTransferResult =
  | { status: "none" }
  | {
      status: "success";
      /** Übernommene Wörter für den Abschlussbildschirm. */
      added: string[];
      full: boolean;
    }
  | { status: "error"; notice: string };

type WordStoreRepository = {
  importFromLesson: (input: {
    words: string[];
    errorWords: string[];
    sourceId: string;
  }) => Promise<{ added: string[]; full: boolean }>;
};

export const WORD_STORE_TRANSFER_ERROR =
  "Die Wörter konnten auf diesem Gerät nicht in den Wortspeicher übernommen werden.";

export const WORD_STORE_FULL_NOTICE =
  "Deine Wortbox ‚Aus dem Unterricht‘ ist voll. Lösche Wörter, die du sicher kannst.";

/** „Dazu und n weitere“: höchstens fünf Wörter zeigen, den Rest zählen. */
export function summarizeSavedWords(words: readonly string[]): {
  shown: string[];
  more: number;
} {
  return {
    shown: words.slice(0, WORD_STORE_SHOWN_WORDS),
    more: Math.max(0, words.length - WORD_STORE_SHOWN_WORDS),
  };
}

const inFlight = new Map<string, Promise<WordStoreTransferResult>>();

/**
 * Übernimmt die Wörter einer Runde in den Wortspeicher, höchstens einmal pro
 * Runde und Gerät. Läuft auch, wenn die Lehrkraft die Runde vorzeitig beendet
 * hat. Im Stationsmodus nie (mehrere Kinder an einem Gerät).
 */
export function runLiveWordStoreTransfer(
  repository: WordStoreRepository,
  session: LiveSession,
  trace: LiveTransferTrace,
): Promise<WordStoreTransferResult> {
  if (session.stationMode) return Promise.resolve({ status: "none" });
  const done = readWordStoreTransferDone(session.sessionId);
  if (done !== undefined) {
    return Promise.resolve({ status: "success", ...done });
  }
  const running = inFlight.get(session.sessionId);
  if (running) return running;

  const transfer = buildWordStoreTransfer(session, trace);
  if (!transfer) return Promise.resolve({ status: "none" });

  const promise = repository
    .importFromLesson({ ...transfer, sourceId: session.sessionId })
    .then((result): WordStoreTransferResult => {
      markWordStoreTransferDone(session.sessionId, result);
      return { status: "success", ...result };
    })
    .catch((): WordStoreTransferResult => ({
      status: "error",
      notice: WORD_STORE_TRANSFER_ERROR,
    }))
    .finally(() => inFlight.delete(session.sessionId));
  inFlight.set(session.sessionId, promise);
  return promise;
}
