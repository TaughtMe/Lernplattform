import {
  REPETITION_RULES,
  reviewRepetition,
  type RepetitionState,
} from "./spaced-repetition";
import type { LearningDirection, LearningEventV1 } from "./learning-bundle";

export type LeitnerBox = 1 | 2 | 3 | 4 | 5;
export type LeitnerDimensionProgress = {
  box: LeitnerBox;
  dueAt: string;
  lastEventId?: string;
};
export type LeitnerProgress = {
  knowledge: LeitnerDimensionProgress;
  writing: LeitnerDimensionProgress;
};

export const LEITNER_INTERVAL_DAYS: Record<LeitnerBox, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

/**
 * Lernarchiv (Box 6) der Lernwörter: frühestens alle 30 Tage darf ein
 * Archivwort als Bonus wiederkommen (Regel A-3). Eigene Konstante statt eines
 * sechsten Eintrags in `LEITNER_INTERVAL_DAYS`, denn die Tabelle gilt auch für
 * die LernBox und die Ereignisableitung (Boxen 1 bis 5).
 */
export const LEARNING_ARCHIVE_BONUS_DAYS = 30;

/**
 * Box und Fälligkeit je Dimension (Wissen, Schreiben) aus den Ereignissen eines
 * Lernobjekts. Die Entscheidung trifft der gemeinsame Kern
 * (`REPETITION_RULES.ereignis`, Audit A-004):
 *
 * - Kein Aufstieg vor der Fälligkeit; je Runde höchstens ein Schritt.
 * - Fehler: Box 1, sofort fällig. Richtig mit Hilfe: Box bleibt, Abstand der Box.
 * - Erster richtiger Abruf nach einem Fehler: Box bleibt, morgen wieder.
 * - Selbsteinschätzung (`answerMode: "self-check"`) hebt höchstens bis Box 3.
 *
 * Nicht bewertete Dimensionen eines Ereignisses (`not-assessed`) zählen nicht.
 */
export function deriveLeitnerProgress(input: {
  events: readonly LearningEventV1[];
  learningObjectId: string;
  direction: LearningDirection;
  availableAt: string;
}): LeitnerProgress {
  const initial = (): LeitnerDimensionProgress => ({
    box: 1,
    dueAt: input.availableAt,
  });
  const progress: LeitnerProgress = {
    knowledge: initial(),
    writing: initial(),
  };
  const states: Record<"knowledge" | "writing", RepetitionState | undefined> = {
    knowledge: undefined,
    writing: undefined,
  };

  const events = input.events
    .filter(
      (event) =>
        event.learningObjectId === input.learningObjectId &&
        event.direction === input.direction,
    )
    .toSorted((left, right) => left.occurredAt.localeCompare(right.occurredAt));

  for (const event of events) {
    for (const dimension of ["knowledge", "writing"] as const) {
      const assessment = event.assessment[dimension];
      if (assessment === "not-assessed") continue;

      const before = progress[dimension];
      const { state, decision } = reviewRepetition(
        states[dimension] ?? {
          box: before.box,
          dueAt: Date.parse(before.dueAt),
          introduced: false,
        },
        {
          now: Date.parse(event.occurredAt),
          correct: assessment === "correct",
          usedHelp: event.help !== "none",
          selfCorrected: false,
          firstAttempt: true,
          roundId: event.roundId,
          evidence:
            event.answerMode === "self-check" ? "self-check" : "written",
          scheduled: true,
        },
        REPETITION_RULES.ereignis,
      );
      states[dimension] = state;
      progress[dimension] = {
        box: state.box as LeitnerBox,
        // Fehler und unveränderte Fälligkeit behalten die Zeichenfolge der Quelle.
        dueAt:
          decision === "reset"
            ? event.occurredAt
            : Object.is(state.dueAt, Date.parse(before.dueAt))
              ? before.dueAt
              : new Date(state.dueAt).toISOString(),
        lastEventId: event.id,
      };
    }
  }

  return progress;
}
