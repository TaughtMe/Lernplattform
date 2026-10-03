import { normalizeVocabularyText } from "./learning-bundle";
import type { LiveVocabularyOutcome } from "./live-vocabulary-placement";

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

/**
 * Massenimport: eine Vokabel pro Zeile, Spalten mit Tabulator (aus Excel oder
 * Sheets kopiert) oder Semikolon getrennt, optional dritte Spalte als Tag.
 * Weitere richtige Antworten mit „|“.
 */
export function parseLearningBoxImport(text: string) {
  const rows: LearningBoxImportRow[] = [];
  const skipped: number[] = [];
  text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .forEach((line, index) => {
      if (!line.trim()) return;
      const parts = (
        line.includes("\t") ? line.split("\t") : line.split(";")
      ).map((part) => part.trim());
      const [question, answer, tag] = parts;
      if (!question || !answer) {
        skipped.push(index + 1);
        return;
      }
      rows.push({ question, answer, ...(tag ? { tag } : {}) });
    });
  return { rows, skipped };
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

/** Port of LernBoxV2's result transition. */
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
  let nextBox: LearningBoxLevel = currentBox;

  if (input.secondChance === "recovered") nextBox = currentBox;
  else if (input.secondChance === "failed" || !input.correct) nextBox = 1;
  else nextBox = Math.min(currentBox + 1, 5) as LearningBoxLevel;

  const nextInterval = nextBox === 5 ? 7 : 1;
  const nextReview = now + nextInterval * 24 * 60 * 60 * 1000;

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

const DAY_MS = 24 * 60 * 60 * 1000;

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
