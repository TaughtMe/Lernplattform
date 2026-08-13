import { normalizeVocabularyText } from "./learning-bundle";

export type LearningBoxDirection = "forward" | "reverse";
export type LearningBoxMode = "oral" | "writing";
export type LearningBoxLevel = 1 | 2 | 3 | 4 | 5;

export type LearningBoxSource = {
  kind: "self" | "teacher" | "import" | "running-dictation";
  sourceId?: string;
  classId?: string;
};

export type LearningBoxDeck = {
  id: string;
  title: string;
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
  tag?: string;
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
};

export function learningBoxFingerprint(question: string, answer: string) {
  return `${normalizeVocabularyText(question)}::${normalizeVocabularyText(answer)}`;
}

export function createLearningBoxDeck(input: {
  title: string;
  frontLocale?: string;
  backLocale?: string;
  source?: LearningBoxSource;
  now?: number;
}): LearningBoxDeck {
  const now = input.now ?? Date.now();
  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
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

export function evaluateLearningBoxAnswer(
  card: LearningBoxCard,
  input: string,
  direction: LearningBoxDirection,
) {
  const prompt = getLearningBoxPrompt(card, direction);
  return {
    accepted:
      normalizeVocabularyText(input) === normalizeVocabularyText(prompt.answer),
    expectedAnswer: prompt.answer,
  };
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
