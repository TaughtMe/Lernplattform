import { normalizeVocabularyText } from "./learning-bundle";
import { LEITNER_INTERVAL_DAYS } from "./leitner-schedule";
import type { LiveVocabularyOutcome } from "./live-vocabulary-placement";
import {
  parseVocabularyImport,
  type VocabularyImportEntry,
} from "./vocabulary-import";

export type LearningBoxDirection = "forward" | "reverse";
/** Richtung einer Lernrunde: fest oder gemischt (abwechselnd je Karte). */
export type LearningBoxSessionDirection = LearningBoxDirection | "mixed";
export type LearningBoxMode = "oral" | "writing";
export type LearningBoxLevel = 1 | 2 | 3 | 4 | 5;

export type LearningBoxSource = {
  kind: "self" | "teacher" | "import" | "running-dictation";
  sourceId?: string | undefined;
  classId?: string | undefined;
};

export type LearningBoxSourceLink = {
  source: LearningBoxSource;
  itemId: string;
  revision: number;
  promptLocale: string;
  answerLocale: string;
};

/** Ordner fasst Stapel zusammen, z. B. „Buch Klasse 5“. */
export type LearningBoxFolder = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export type LearningBoxDeck = {
  id: string;
  title: string;
  /** Ordner, in dem der Stapel liegt; ohne Angabe liegt er lose. */
  folderId?: string | undefined;
  frontLocale: string;
  backLocale: string;
  source: LearningBoxSource;
  createdAt: number;
  updatedAt: number;
};

export type LearningBoxCard = {
  id: string;
  deckId: string;
  question: string;
  answer: string;
  tag?: string | undefined;
  fingerprint: string;
  source: LearningBoxSource;
  level: LearningBoxLevel;
  box: LearningBoxLevel;
  interval: number;
  nextReview: number;
  writingStreak: number;
  reverseBox: LearningBoxLevel;
  reverseInterval: number;
  reverseNextReview: number;
  reverseWritingStreak: number;
  lastReviewed: number;
  createdAt: number;
  updatedAt: number;
  sourceLinks?: LearningBoxSourceLink[] | undefined;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function learningBoxFingerprint(question: string, answer: string) {
  return `${normalizeVocabularyText(question)}::${normalizeVocabularyText(answer)}`;
}

export function createLearningBoxFolder(input: {
  title: string;
  now?: number;
}): LearningBoxFolder {
  const now = input.now ?? Date.now();
  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

export function createLearningBoxDeck(input: {
  title: string;
  folderId?: string | undefined;
  frontLocale?: string;
  backLocale?: string;
  source?: LearningBoxSource;
  now?: number;
}): LearningBoxDeck {
  const now = input.now ?? Date.now();
  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    ...(input.folderId ? { folderId: input.folderId } : {}),
    frontLocale: input.frontLocale ?? "de-DE",
    backLocale: input.backLocale ?? "en-US",
    source: input.source ?? { kind: "self" },
    createdAt: now,
    updatedAt: now,
  };
}

export function createLearningBoxCard(input: {
  deckId: string;
  question: string;
  answer: string;
  tag?: string;
  source?: LearningBoxSource;
  now?: number;
}): LearningBoxCard {
  const now = input.now ?? Date.now();
  const tag = input.tag?.trim();
  return {
    id: crypto.randomUUID(),
    deckId: input.deckId,
    question: input.question.trim(),
    answer: input.answer.trim(),
    ...(tag ? { tag } : {}),
    fingerprint: learningBoxFingerprint(input.question, input.answer),
    source: input.source ?? { kind: "self" },
    level: 1,
    box: 1,
    interval: 0,
    nextReview: now,
    writingStreak: 0,
    reverseBox: 1,
    reverseInterval: 0,
    reverseNextReview: now,
    reverseWritingStreak: 0,
    lastReviewed: now,
    createdAt: now,
    updatedAt: now,
  };
}

export function getLearningBoxPrompt(
  card: LearningBoxCard,
  direction: LearningBoxDirection,
) {
  return direction === "forward"
    ? { question: card.question, answer: card.answer }
    : { question: card.answer, answer: card.question };
}

/** Mehrere richtige Antworten stehen mit „|“ getrennt: „home | house“. */
export function learningBoxAlternatives(text: string) {
  return text
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function evaluateLearningBoxAnswer(
  card: LearningBoxCard,
  input: string,
  direction: LearningBoxDirection,
) {
  const prompt = getLearningBoxPrompt(card, direction);
  const given = normalizeVocabularyText(input);
  return {
    accepted:
      given !== "" &&
      learningBoxAlternatives(prompt.answer).some(
        (answer) => normalizeVocabularyText(answer) === given,
      ),
    expectedAnswer: prompt.answer,
  };
}

/** Richtung der n-ten Karte einer Runde; gemischt wechselt sie ab. */
export function learningBoxDirectionAt(
  choice: LearningBoxSessionDirection,
  index: number,
): LearningBoxDirection {
  if (choice !== "mixed") return choice;
  return index % 2 === 0 ? "forward" : "reverse";
}

/** Fällig in der gewählten Richtung; gemischt, wenn eine Richtung fällig ist. */
export function isLearningBoxCardDueFor(
  card: LearningBoxCard,
  choice: LearningBoxSessionDirection,
  now = Date.now(),
) {
  if (choice !== "mixed") return isLearningBoxCardDue(card, choice, now);
  return (
    isLearningBoxCardDue(card, "forward", now) ||
    isLearningBoxCardDue(card, "reverse", now)
  );
}

export type LearningBoxImportRow = {
  question: string;
  answer: string;
  tag?: string;
};

/** Wandelt erkannte Zeilen des gemeinsamen Parsers in LernBox-Vokabeln. */
export function toLearningBoxImportRows(
  entries: readonly VocabularyImportEntry[],
): LearningBoxImportRow[] {
  return entries.map(({ front, back, tag }) => ({
    question: front,
    answer: back,
    ...(tag ? { tag } : {}),
  }));
}

/**
 * Massenimport: eine Vokabel pro Zeile, Spalten mit Tabulator (aus Excel oder
 * Sheets kopiert) oder Semikolon getrennt, optional dritte Spalte als Tag.
 * Weitere richtige Antworten mit „|“. Die Kopfzeile der Vorlage entfällt;
 * `skipped` nennt die Nummern übersprungener Zeilen.
 */
export function parseLearningBoxImport(text: string) {
  const { entries, skipped } = parseVocabularyImport(text);
  return {
    rows: toLearningBoxImportRows(entries),
    skipped: skipped.map((line) => line.lineNumber),
  };
}

export type LearningBoxSort = "alphabet" | "box" | "tag" | "date" | "deck";

/** Sortiert Karten für die Vokabelliste; Gleichstand alphabetisch. */
export function sortLearningBoxCards(
  cards: readonly LearningBoxCard[],
  sort: LearningBoxSort,
  deckTitle: (deckId: string) => string = () => "",
) {
  const alphabet = (left: LearningBoxCard, right: LearningBoxCard) =>
    left.question.localeCompare(right.question, "de", { sensitivity: "base" });
  const compare: Record<
    LearningBoxSort,
    (left: LearningBoxCard, right: LearningBoxCard) => number
  > = {
    alphabet,
    box: (left, right) => left.box - right.box,
    tag: (left, right) =>
      (left.tag ?? "\uffff").localeCompare(right.tag ?? "\uffff", "de"),
    date: (left, right) => right.createdAt - left.createdAt,
    deck: (left, right) =>
      deckTitle(left.deckId).localeCompare(deckTitle(right.deckId), "de"),
  };
  return [...cards].sort(
    (left, right) => compare[sort](left, right) || alphabet(left, right),
  );
}

/** Suche in Vorder- und Rückseite und Tag, ohne Groß-/Kleinschreibung. */
export function filterLearningBoxCards(
  cards: readonly LearningBoxCard[],
  query: string,
) {
  const needle = normalizeVocabularyText(query);
  if (!needle) return [...cards];
  return cards.filter((card) =>
    [card.question, card.answer, card.tag ?? ""].some((text) =>
      normalizeVocabularyText(text).includes(needle),
    ),
  );
}

/** Karte bearbeiten: Texte und Tag ändern, Lernstand bleibt. */
export function editLearningBoxCard(
  card: LearningBoxCard,
  input: { question: string; answer: string; tag?: string | null },
  now = Date.now(),
): LearningBoxCard {
  const question = input.question.trim();
  const answer = input.answer.trim();
  const next: LearningBoxCard = {
    ...card,
    question,
    answer,
    fingerprint: learningBoxFingerprint(question, answer),
    updatedAt: now,
  };
  const tag = input.tag === undefined ? card.tag : input.tag?.trim();
  if (tag) next.tag = tag;
  else delete next.tag;
  return next;
}

export function getLearningBoxLevel(
  card: LearningBoxCard,
  direction: LearningBoxDirection,
) {
  return direction === "forward" ? card.box : card.reverseBox;
}

export function getLearningBoxNextReview(
  card: LearningBoxCard,
  direction: LearningBoxDirection,
) {
  return direction === "forward" ? card.nextReview : card.reverseNextReview;
}

export function isLearningBoxCardDue(
  card: LearningBoxCard,
  direction: LearningBoxDirection,
  now = Date.now(),
) {
  const interval =
    direction === "forward" ? card.interval : card.reverseInterval;
  const bufferHours = interval <= 1 ? 4 : 12;
  return (
    now >=
    getLearningBoxNextReview(card, direction) - bufferHours * 60 * 60 * 1000
  );
}

/**
 * Fälligkeit nach Zeitplan: Eine Richtung zählt erst, wenn sie schon einmal
 * geübt wurde (Abstand > 0). Neue Karten und die nie geübte Rückrichtung sind
 * „neu“, nicht fällig; sie kommen über das Kontingent für neue Aufgaben der
 * Tagesportion oder über freies Üben eines Stapels.
 */
export function isLearningBoxCardScheduledDue(
  card: LearningBoxCard,
  now = Date.now(),
) {
  return (
    (card.interval > 0 && isLearningBoxCardDue(card, "forward", now)) ||
    (card.reverseInterval > 0 && isLearningBoxCardDue(card, "reverse", now))
  );
}

/** Mindestabstand zum letzten Abruf, ab dem eine richtige Antwort in Box 1 aufsteigt. */
export const LEARNING_BOX_RECOVERY_GAP_HOURS = 8;

/**
 * Ergebnis einer Abfrage. Abstände je Box wie im Leitner-Zeitplan
 * (`LEITNER_INTERVAL_DAYS`: 1/3/7/14/30 Tage).
 *
 * - falsch oder zweite Chance verfehlt: Box 1, morgen wieder (jetzt fällig).
 * - zweite Chance geschafft: Box bleibt, Abstand der Box.
 * - richtig, aber vor der Fälligkeit (Richtung schon geübt): kein Aufstieg,
 *   Box, Abstand und Termin bleiben; zu frühes Üben ist nur Üben.
 * - richtig in Box 1 kurz nach dem letzten Abruf (weniger als
 *   `LEARNING_BOX_RECOVERY_GAP_HOURS`), etwa nach einem Fehler über „Meine
 *   Fehler“: Der Fehler gilt als geschlossen, aber ohne Aufstieg; die Karte
 *   kommt morgen wieder. Sofortige Verbesserung ist kein selbstständiger Abruf.
 * - richtig und fällig oder neu (Abstand 0): eine Box höher, höchstens 5.
 */
export function processLearningBoxResult(
  card: LearningBoxCard,
  input: {
    correct: boolean;
    direction: LearningBoxDirection;
    mode: LearningBoxMode;
    secondChance?: "recovered" | "failed";
    now?: number;
  },
): LearningBoxCard {
  const now = input.now ?? Date.now();
  const currentBox = getLearningBoxLevel(card, input.direction);
  const currentInterval =
    input.direction === "forward" ? card.interval : card.reverseInterval;
  const currentNextReview = getLearningBoxNextReview(card, input.direction);
  const failed = input.secondChance === "failed" || !input.correct;
  const early =
    !failed &&
    input.secondChance !== "recovered" &&
    currentInterval > 0 &&
    !isLearningBoxCardDue(card, input.direction, now);

  const recovering =
    !failed &&
    !early &&
    input.secondChance !== "recovered" &&
    currentBox === 1 &&
    currentInterval > 0 &&
    now - card.lastReviewed < LEARNING_BOX_RECOVERY_GAP_HOURS * 60 * 60 * 1000;

  let nextBox: LearningBoxLevel = currentBox;
  let nextInterval = currentInterval;
  let nextReview = currentNextReview;
  if (failed) {
    nextBox = 1;
    nextInterval = 1;
    nextReview = now;
  } else if (recovering) {
    nextInterval = LEITNER_INTERVAL_DAYS[1];
    nextReview = now + nextInterval * DAY_MS;
  } else if (!early) {
    if (input.secondChance !== "recovered") {
      nextBox = Math.min(currentBox + 1, 5) as LearningBoxLevel;
    }
    nextInterval = LEITNER_INTERVAL_DAYS[nextBox];
    nextReview = now + nextInterval * DAY_MS;
  }

  if (input.direction === "reverse") {
    return {
      ...card,
      reverseBox: nextBox,
      reverseInterval: nextInterval,
      reverseNextReview: nextReview,
      reverseWritingStreak:
        input.mode === "writing"
          ? input.correct && !input.secondChance
            ? card.reverseWritingStreak + 1
            : 0
          : card.reverseWritingStreak,
      lastReviewed: now,
      updatedAt: now,
    };
  }

  return {
    ...card,
    box: nextBox,
    level: nextBox,
    interval: nextInterval,
    nextReview,
    writingStreak:
      input.mode === "writing"
        ? input.correct && !input.secondChance
          ? card.writingStreak + 1
          : 0
        : card.writingStreak,
    lastReviewed: now,
    updatedAt: now,
  };
}

export type LiveVocabularyPlacement = Pick<
  LearningBoxCard,
  "box" | "level" | "interval" | "nextReview"
>;

/**
 * Platzierung einer Vokabel aus einer Unterrichtsrunde. Gilt nur für die
 * abgefragte Richtung (`forward`); `reverse` bleibt unberührt.
 * Ohne `card` ist die Vokabel neu. Rückgabe `undefined`: Karte bleibt unverändert.
 */
export function placeLiveVocabularyCard(
  card: LearningBoxCard | undefined,
  outcome: LiveVocabularyOutcome,
  now = Date.now(),
): LiveVocabularyPlacement | undefined {
  const restart: LiveVocabularyPlacement = {
    box: 1,
    level: 1,
    interval: 1,
    nextReview: now,
  };
  if (!card) {
    return outcome === "known"
      ? { box: 2, level: 2, interval: 1, nextReview: now + DAY_MS }
      : restart;
  }
  if (outcome === "reset") return restart;
  if (outcome === "practice") {
    return {
      box: card.box,
      level: card.level,
      interval: card.interval,
      nextReview: now,
    };
  }
  return undefined;
}
