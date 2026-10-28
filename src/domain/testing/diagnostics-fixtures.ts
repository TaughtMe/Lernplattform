import type { LearningEventV1 } from "../learning-bundle";
import { createLearningBoxCard, type LearningBoxCard } from "../learning-box";
import {
  learningWordId,
  type LearningWordProgress,
} from "../learning-word-progress";
import { optionsForMathTask } from "../math-practice";
import { parseMentalMathTask } from "../mental-math";

/** Gemeinsame Bausteine der Tests zu Kompetenzprofil, Tagestraining und Startpunkt. */

let counter = 0;

/** Zeitpunkt am Mittag (UTC) des Tages `2026-10-<day>`; verschiedene Tage bleiben verschieden. */
export function noon(day: number) {
  return `2026-10-${String(day).padStart(2, "0")}T10:00:00.000Z`;
}

export function learningEvent(
  input: Partial<LearningEventV1> & {
    learningObjectId: string;
    correct?: boolean;
  },
): LearningEventV1 {
  counter += 1;
  const { correct = true, ...rest } = input;
  return {
    id: `event-${counter}`,
    occurredAt: noon(20),
    source: "learning-word",
    roundId: `round-${counter}`,
    direction: "prompt-to-answer",
    answerMode: "typed",
    help: "none",
    assessment: {
      knowledge: correct ? "correct" : "incorrect",
      writing: correct ? "correct" : "incorrect",
      selfCorrected: false,
    },
    ...rest,
  };
}

export function mathEvent(
  source: string,
  input: { correct?: boolean; occurredAt?: string; roundId?: string } = {},
): LearningEventV1 {
  const task = parseMentalMathTask(source)!;
  const correct = input.correct ?? true;
  return learningEvent({
    learningObjectId: `math:${source}`,
    source: "lesson",
    learningArea: "mathematics",
    ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
    ...(input.roundId ? { roundId: input.roundId } : {}),
    math: {
      task,
      options: optionsForMathTask(task),
      answer: correct ? String(task.answer) : "-1",
    },
    assessment: {
      knowledge: correct ? "correct" : "incorrect",
      writing: "not-assessed",
      selfCorrected: false,
    },
  });
}

export function wordProgress(
  word: string,
  box: LearningWordProgress["box"],
  dueAt = "2026-10-21T00:00:00.000Z",
): LearningWordProgress {
  return {
    id: learningWordId(word),
    word,
    stage: 3,
    box,
    dueAt,
    attempts: 3,
    incorrectAttempts: 0,
    helpUses: 0,
    lastPracticedAt: noon(20),
  };
}

export function card(
  id: string,
  deckId: string,
  progress: Partial<LearningBoxCard> = {},
): LearningBoxCard {
  return {
    ...createLearningBoxCard({
      deckId,
      question: `frage ${id}`,
      answer: `antwort ${id}`,
      now: Date.parse(noon(1)),
    }),
    id,
    ...progress,
  };
}
