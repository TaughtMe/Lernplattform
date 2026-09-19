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

function addDays(value: string, days: number): string {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function nextBox(box: LeitnerBox): LeitnerBox {
  return Math.min(5, box + 1) as LeitnerBox;
}

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
  const promotedRounds = {
    knowledge: new Set<string>(),
    writing: new Set<string>(),
  };
  const failedRounds = {
    knowledge: new Set<string>(),
    writing: new Set<string>(),
  };
  const needsRecovery = { knowledge: false, writing: false };

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

      if (assessment === "incorrect") {
        failedRounds[dimension].add(event.roundId);
        needsRecovery[dimension] = true;
        progress[dimension] = {
          box: 1,
          dueAt: event.occurredAt,
          lastEventId: event.id,
        };
        continue;
      }

      const mayAdvance =
        event.help === "none" &&
        !needsRecovery[dimension] &&
        !failedRounds[dimension].has(event.roundId) &&
        !promotedRounds[dimension].has(event.roundId);
      const box = mayAdvance
        ? nextBox(progress[dimension].box)
        : progress[dimension].box;
      if (mayAdvance) promotedRounds[dimension].add(event.roundId);
      needsRecovery[dimension] = false;
      progress[dimension] = {
        box,
        dueAt: addDays(event.occurredAt, LEITNER_INTERVAL_DAYS[box]),
        lastEventId: event.id,
      };
    }
  }

  return progress;
}
