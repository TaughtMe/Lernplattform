import { answerMatches } from "./answer-normalization";
import { normalizeVocabularyText } from "./learning-bundle";
import type { LiveVocabularyOutcome } from "./live-vocabulary-placement";
import { REPETITION_RULES, reviewRepetition } from "./spaced-repetition";
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
  /** Letzter Abruf irgendeiner Richtung (Abgleich, Merge, Empfehlungen). */
  lastReviewed: number;
  /**
   * Zeitpunkt des letzten Abrufs je Richtung (G-005/G-011). Fehlt das Feld
   * (ältere Daten), gilt `lastReviewed` (`getLearningBoxLastReviewed`).
   */
  forwardLastReviewed?: number | undefined;
  reverseLastReviewed?: number | undefined;
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

/**
 * Mehrere richtige Antworten stehen mit „|“ getrennt: „home | house“. Das ist
 * die Anzeige-Liste; was als richtig gilt (auch „/“ und Klammerteile), regelt
 * `answerAlternatives` in der Antwortprüfung.
 */
export function learningBoxAlternatives(text: string) {
  return text
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Prüft die Eingabe gegen die Lösung (G-002, G-003): typografische Zeichen
 * werden angeglichen und Alternativen („|“, „/“, Klammerteile) gelten, siehe
 * `answerMatches`. Der Fingerabdruck der Karte bleibt davon unberührt.
 */
export function evaluateLearningBoxAnswer(
  card: LearningBoxCard,
  input: string,
  direction: LearningBoxDirection,
) {
  const prompt = getLearningBoxPrompt(card, direction);
  return {
    accepted: answerMatches(prompt.answer, input, { compatibility: true }),
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

/**
 * Gespeicherte Box einer Richtung. Anzeigen und Zählungen nach Box nehmen die
 * wirksame Box (`effectiveLearningBoxLevel`); die gespeicherte Box gehört in
 * Sicherung, Abgleich und Replay.
 */
export function getLearningBoxLevel(
  card: LearningBoxCard,
  direction: LearningBoxDirection,
) {
  return direction === "forward" ? card.box : card.reverseBox;
}

/**
 * Zeitpunkt des letzten Abrufs einer Richtung (C1-2). Fehlt das Richtungsfeld,
 * gilt `lastReviewed` (Migration beim Lesen, gespeichert wird nichts neu).
 */
export function getLearningBoxLastReviewed(
  card: LearningBoxCard,
  direction: LearningBoxDirection,
) {
  return (
    (direction === "forward"
      ? card.forwardLastReviewed
      : card.reverseLastReviewed) ?? card.lastReviewed
  );
}

/** Schonfrist nach der Fälligkeit; danach je volle Frist eine Box zurück. */
export const LEARNING_BOX_GRACE_DAYS = 14;

/**
 * Volle Schonfristen, die eine schon geübte Richtung überfällig ist (rein, Zeit
 * kommt von außen). Neue Karten und die nie geübte Rückrichtung (Abstand 0)
 * fallen nicht zurück; vor der Fälligkeit sind es 0.
 */
export function learningBoxGracePeriodsOverdue(
  card: LearningBoxCard,
  direction: LearningBoxDirection,
  now: number,
) {
  const interval =
    direction === "forward" ? card.interval : card.reverseInterval;
  if (interval <= 0) return 0;
  const overdue = now - getLearningBoxNextReview(card, direction);
  if (overdue < 0) return 0;
  return Math.floor(overdue / (LEARNING_BOX_GRACE_DAYS * DAY_MS));
}

/**
 * Wirksame Box: gespeicherte Box minus die vollen Schonfristen Überfälligkeit,
 * höchstens bis Box 1. Wird beim Lesen berechnet; gespeichert wird sie erst mit
 * der nächsten Abfrage (`processLearningBoxResult`).
 */
export function effectiveLearningBoxLevel(
  card: LearningBoxCard,
  direction: LearningBoxDirection,
  now: number,
): LearningBoxLevel {
  const demotions = learningBoxGracePeriodsOverdue(card, direction, now);
  return Math.max(
    1,
    getLearningBoxLevel(card, direction) - demotions,
  ) as LearningBoxLevel;
}

/** „Lange nicht geübt“: ab 14 Tagen Überfälligkeit, in jeder Box (auch Box 1). */
export function isLearningBoxLongUnpracticed(
  card: LearningBoxCard,
  direction: LearningBoxDirection,
  now: number,
) {
  return learningBoxGracePeriodsOverdue(card, direction, now) > 0;
}

/** „Lange nicht geübt“ in mindestens einer Richtung; die Karte zählt einmal. */
export function isLearningBoxCardLongUnpracticed(
  card: LearningBoxCard,
  now: number,
) {
  return (
    isLearningBoxLongUnpracticed(card, "forward", now) ||
    isLearningBoxLongUnpracticed(card, "reverse", now)
  );
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

/** Schlüssel „Karte + Richtung“ für die Bewertung innerhalb einer Runde. */
export function learningBoxAttemptKey(
  cardId: string,
  direction: LearningBoxDirection,
) {
  return `${cardId}:${direction}`;
}

/**
 * Erster Versuch zählt (C3-1): Je Karte und Richtung wirkt in einer Runde nur
 * der erste Versuch auf Box und Fälligkeit. `attempted` nennt die schon
 * bewerteten Schlüssel (`learningBoxAttemptKey`) dieser Runde.
 */
export function isFirstLearningBoxAttempt(
  attempted: readonly string[],
  cardId: string,
  direction: LearningBoxDirection,
) {
  return !attempted.includes(learningBoxAttemptKey(cardId, direction));
}

/** Mindestabstand zum letzten Abruf derselben Richtung, ab dem eine richtige Antwort aufsteigt. */
export const LEARNING_BOX_RECOVERY_GAP_HOURS = 8;

/**
 * Selbsteinschätzung („Gewusst“ nach Aufdecken, Modus `oral`) hebt höchstens bis
 * Box 3 (D-010). Box 4 und 5 erreicht man nur schriftlich.
 */
export const LEARNING_BOX_SELF_CHECK_MAX_BOX = 3;

/**
 * Ergebnis einer Abfrage. Box und Fälligkeit entscheidet der gemeinsame Kern
 * (`reviewRepetition` mit `REPETITION_RULES.lernbox`); Abstände je Box wie im
 * Leitner-Zeitplan (1/3/7/14/30 Tage).
 *
 * - falsch oder zweite Chance verfehlt: Box 1, morgen wieder (jetzt fällig).
 * - zweite Chance geschafft: Box bleibt, Abstand der Box.
 * - richtig, aber vor der Fälligkeit (Richtung schon geübt): kein Aufstieg,
 *   Box, Abstand und Termin bleiben; zu frühes Üben ist nur Üben.
 * - richtig in einer schon geübten Richtung, fällig, aber weniger als
 *   `LEARNING_BOX_RECOVERY_GAP_HOURS` nach dem letzten Abruf DIESER Richtung
 *   (G-005: die andere Richtung zählt nicht), in jeder Box (G-011): etwa nach
 *   einem Fehler über „Meine Fehler“ oder nach der Platzierung aus dem
 *   Unterricht („practice“/„reset“). Der Fehler gilt als geschlossen, aber ohne
 *   Aufstieg: Box bleibt, Abstand 1 Tag, die Karte kommt morgen wieder.
 *   Sofortige Verbesserung ist kein selbstständiger Abruf.
 * - richtig und fällig oder neu (Abstand 0): eine Box höher, höchstens 5. Als
 *   Selbsteinschätzung (`mode: "oral"`) höchstens bis
 *   `LEARNING_BOX_SELF_CHECK_MAX_BOX`: Steht die Box schon darauf oder höher,
 *   bleibt sie; Abstand und Termin richten sich nach dieser Box (Wiederholung,
 *   kein Aufstieg). „Nicht gewusst“ bleibt Box 1.
 *
 * Gerechnet wird von der wirksamen Box aus (Rückstufung nach Zeit): richtig
 * heißt wirksame Box + 1, falsch Box 1. Der Erholungsfall behält dagegen die
 * gespeicherte Box, weil er einen echten Fehler oder eine Unterrichtsplatzierung
 * schließt, keine Zeitrückstufung.
 *
 * Gesetzt werden `lastReviewed` und der Abrufzeitpunkt der abgefragten
 * Richtung; der Zeitpunkt der anderen Richtung bleibt (beim ersten Schreiben
 * aus `lastReviewed` übernommen, damit sie ihre bisherige Lesart behält).
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
  const currentInterval =
    input.direction === "forward" ? card.interval : card.reverseInterval;
  // Die Entscheidung über Box und Fälligkeit trifft der gemeinsame Kern
  // (`REPETITION_RULES.lernbox`); hier bleiben nur Zuordnung und Besonderheiten.
  const { state, decision } = reviewRepetition(
    {
      box: effectiveLearningBoxLevel(card, input.direction, now),
      dueAt: getLearningBoxNextReview(card, input.direction),
      introduced: currentInterval > 0,
      intervalDays: currentInterval,
      lastReviewedAt: getLearningBoxLastReviewed(card, input.direction),
    },
    {
      now,
      correct: input.correct && input.secondChance !== "failed",
      usedHelp: input.secondChance === "recovered",
      selfCorrected: false,
      firstAttempt: true,
      evidence: input.mode === "oral" ? "self-check" : "written",
      scheduled: true,
    },
    REPETITION_RULES.lernbox,
  );
  // Der Erholungsfall schließt einen echten Fehler oder eine Unterrichts-
  // platzierung und behält deshalb die gespeicherte Box, nicht die wirksame.
  const nextBox = (
    decision === "recovered"
      ? getLearningBoxLevel(card, input.direction)
      : state.box
  ) as LearningBoxLevel;
  const nextInterval = state.intervalDays ?? currentInterval;
  const nextReview = state.dueAt;

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
      reverseLastReviewed: now,
      forwardLastReviewed: getLearningBoxLastReviewed(card, "forward"),
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
    forwardLastReviewed: now,
    reverseLastReviewed: getLearningBoxLastReviewed(card, "reverse"),
    lastReviewed: now,
    updatedAt: now,
  };
}

export type LiveVocabularyPlacement = Pick<
  LearningBoxCard,
  "box" | "level" | "interval" | "nextReview" | "lastReviewed"
> & {
  forwardLastReviewed: number;
  /** Nur bei bestehender Karte: bisherige Lesart der Rückrichtung bleibt. */
  reverseLastReviewed?: number;
};

/**
 * Platzierung einer Vokabel aus einer Unterrichtsrunde. Gilt nur für die
 * abgefragte Richtung (`forward`); `reverse` bleibt unberührt, auch ihr
 * Abrufzeitpunkt (bei einer bestehenden Karte aus `lastReviewed` festgehalten,
 * G-011). Jede Platzierung zählt als Abruf der Vorwärtsrichtung:
 * `forwardLastReviewed` und `lastReviewed` sind `now`, damit ein Erfolg kurz
 * danach nicht aufsteigt (siehe `processLearningBoxResult`).
 * Ohne `card` ist die Vokabel neu. Rückgabe `undefined`: Karte bleibt unverändert.
 */
export function placeLiveVocabularyCard(
  card: LearningBoxCard | undefined,
  outcome: LiveVocabularyOutcome,
  now = Date.now(),
): LiveVocabularyPlacement | undefined {
  const reviewed = {
    forwardLastReviewed: now,
    lastReviewed: now,
    ...(card
      ? { reverseLastReviewed: getLearningBoxLastReviewed(card, "reverse") }
      : {}),
  };
  const restart: LiveVocabularyPlacement = {
    box: 1,
    level: 1,
    interval: 1,
    nextReview: now,
    ...reviewed,
  };
  if (!card) {
    return outcome === "known"
      ? {
          box: 2,
          level: 2,
          interval: 1,
          nextReview: now + DAY_MS,
          ...reviewed,
        }
      : restart;
  }
  if (outcome === "reset") return restart;
  if (outcome === "practice") {
    return {
      box: card.box,
      level: card.level,
      interval: card.interval,
      nextReview: now,
      ...reviewed,
    };
  }
  return undefined;
}
