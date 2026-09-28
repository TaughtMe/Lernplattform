/**
 * Leitner-Logik nach Konzept 06 („Lernlogik und Leitner-Boxen").
 * Framework-unabhängig und ohne Seiteneffekte, damit LernBox, Wortspeicher
 * und Laufdiktat dieselben Regeln verwenden.
 */
import type { DirectionProgressV1, LearningDirection, LearningProgressV1 } from "./learning-bundle";

export type Box = 1 | 2 | 3 | 4 | 5;

/** Wiederholungsabstand je Box in Tagen. Box 1 ist sofort wieder fällig. */
export const BOX_INTERVAL_DAYS: Record<Box, number> = { 1: 0, 2: 1, 3: 2, 4: 4, 5: 7 };

/** Nach einer Hilfe oder einem Fehler wird kurzfristig erneut abgefragt. */
export const SHORT_RETRY_MINUTES = 10;

const DAY = 86_400_000;

export function clampBox(value: number): Box {
  return Math.min(5, Math.max(1, Math.round(value))) as Box;
}

export function dueAtForBox(box: Box, now: Date): string {
  if (box === 1) return new Date(now.getTime() + SHORT_RETRY_MINUTES * 60_000).toISOString();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return new Date(start.getTime() + BOX_INTERVAL_DAYS[box] * DAY).toISOString();
}

export function isDue(progress: Pick<DirectionProgressV1, "dueAt">, now: Date): boolean {
  return new Date(progress.dueAt).getTime() <= now.getTime();
}

export function newDirectionProgress(now: Date): DirectionProgressV1 {
  return { box: 1, dueAt: now.toISOString() };
}

export function newLearningProgress(learningObjectId: string, now: Date): LearningProgressV1 {
  const fresh = () => newDirectionProgress(now);
  return {
    learningObjectId,
    knowledge: { "prompt-to-answer": fresh(), "answer-to-prompt": fresh() },
    writing: { "prompt-to-answer": fresh(), "answer-to-prompt": fresh() },
  };
}

/**
 * Ergebnis einer Abfrage:
 * - correct: beim ersten Versuch richtig
 * - misspelled: Bedeutung gewusst, aber falsch geschrieben („Ja, Box bleibt")
 * - wrong: Bedeutung nicht gewusst
 * - helped: Hinweis oder Lösung verwendet
 * - skipped: übersprungen
 */
export type ReviewOutcome = "correct" | "misspelled" | "wrong" | "helped" | "skipped";
export type ReviewMode = "writing" | "oral";

function step(current: DirectionProgressV1, change: "up" | "stay" | "reset" | "retry", now: Date, mayRise: boolean): DirectionProgressV1 {
  if (change === "up" && mayRise) {
    const box = clampBox(current.box + 1);
    return { ...current, box, dueAt: dueAtForBox(box, now) };
  }
  if (change === "reset") return { ...current, box: 1, dueAt: dueAtForBox(1, now) };
  if (change === "retry") return { ...current, dueAt: dueAtForBox(1, now) };
  // "stay" oder bereits in dieser Runde aufgestiegen: Box und Fälligkeit bleiben stehen.
  return current;
}

/**
 * Wendet ein Abfrageergebnis an. `alreadyRoseThisRound` verhindert, dass eine
 * Vokabel innerhalb derselben Runde mehr als einmal aufsteigt.
 */
export function applyReview(
  progress: LearningProgressV1,
  direction: LearningDirection,
  mode: ReviewMode,
  outcome: ReviewOutcome,
  now: Date,
  alreadyRoseThisRound = false,
): LearningProgressV1 {
  const mayRise = !alreadyRoseThisRound;
  const knowledge = progress.knowledge[direction];
  const writing = progress.writing[direction];
  let nextKnowledge = knowledge;
  let nextWriting = writing;

  switch (outcome) {
    case "correct":
      nextKnowledge = step(knowledge, "up", now, mayRise);
      if (mode === "writing") nextWriting = step(writing, "up", now, mayRise);
      break;
    case "misspelled":
      nextKnowledge = step(knowledge, "stay", now, false);
      nextWriting = step(writing, "reset", now, false);
      break;
    case "wrong":
    case "skipped":
      nextKnowledge = step(knowledge, "reset", now, false);
      if (mode === "writing") nextWriting = step(writing, "reset", now, false);
      break;
    case "helped":
      nextKnowledge = step(knowledge, "retry", now, false);
      if (mode === "writing") nextWriting = step(writing, "retry", now, false);
      break;
  }

  return {
    ...progress,
    knowledge: { ...progress.knowledge, [direction]: nextKnowledge },
    writing: { ...progress.writing, [direction]: nextWriting },
  };
}

/** Box, die in der Oberfläche angezeigt wird: Schreiben im Schreibmodus, sonst Bedeutung. */
export function visibleBox(progress: LearningProgressV1, direction: LearningDirection, mode: ReviewMode): Box {
  return clampBox((mode === "writing" ? progress.writing : progress.knowledge)[direction].box);
}

export function visibleDue(progress: LearningProgressV1, direction: LearningDirection, mode: ReviewMode, now: Date): boolean {
  return isDue((mode === "writing" ? progress.writing : progress.knowledge)[direction], now);
}

/** Einfache Boxlogik für Lernwörter im Wortspeicher (nur Schreiben, Groß-/Kleinschreibung zählt). */
export interface WordProgress {
  box: Box;
  dueAt: string;
  wrongCount: number;
}

export function applyWordReview(progress: WordProgress, outcome: "correct" | "wrong" | "helped", now: Date, alreadyRoseThisRound = false): WordProgress {
  if (outcome === "correct") {
    const box = alreadyRoseThisRound ? progress.box : clampBox(progress.box + 1);
    return { ...progress, box, dueAt: dueAtForBox(box, now) };
  }
  if (outcome === "helped") return { ...progress, dueAt: dueAtForBox(1, now) };
  return { box: 1, dueAt: dueAtForBox(1, now), wrongCount: progress.wrongCount + 1 };
}
