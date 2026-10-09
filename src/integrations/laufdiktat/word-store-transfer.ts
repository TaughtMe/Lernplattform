import { alignWords, tokenizeText, wordsOf } from "../../domain/text-compare";
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

/**
 * Falsch geschriebene Wörter eines Textteils: Wort für Wort ausgerichtet, nur
 * „falsch“ und „nur Groß-/Kleinschreibung“. Ausgelassene und zusätzliche Wörter
 * zählen nicht, reine Zahlen nie. Zurück kommen die Wörter des Zieltextes.
 */
export function misspelledWords(target: string, input: string): string[] {
  const results = alignWords(
    wordsOf(tokenizeText(target)),
    wordsOf(tokenizeText(input)),
  );
  return distinct(
    results
      .filter(
        (result) =>
          (result.kind === "falsch" || result.kind === "gross-klein") &&
          result.expected !== undefined &&
          !isNumberOnly(result.expected),
      )
      .map((result) => result.expected!),
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
      reached.push(
        ...wordsOf(tokenizeText(word.targetWord)).filter(
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
