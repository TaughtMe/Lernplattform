import type { ClassModule } from "./class-workspace";
import type { LearningEventV1 } from "./learning-bundle";
import { deriveLeitnerProgress } from "./leitner-schedule";

export type PracticeCatalogEntry = {
  learningObjectId: string;
  title: string;
  module: ClassModule;
  route: string;
  availableAt: string;
};

export type DailyPracticeGroup = PracticeCatalogEntry & {
  reason: "error" | "due";
  amount: number;
};

export function selectDailyPractice(input: {
  events: readonly LearningEventV1[];
  catalog: readonly PracticeCatalogEntry[];
  classId: string;
  enabledModules: readonly ClassModule[];
  now: string;
}): DailyPracticeGroup[] {
  const latestByLearningObject = new Map<string, LearningEventV1>();

  for (const event of input.events) {
    if (event.classContext?.classId !== input.classId) continue;
    const previous = latestByLearningObject.get(event.learningObjectId);
    if (!previous || event.occurredAt > previous.occurredAt) {
      latestByLearningObject.set(event.learningObjectId, event);
    }
  }

  return input.catalog.flatMap<DailyPracticeGroup>((entry) => {
    if (!input.enabledModules.includes(entry.module)) return [];
    const latest = latestByLearningObject.get(entry.learningObjectId);
    if (
      latest?.assessment.knowledge === "incorrect" ||
      latest?.assessment.writing === "incorrect"
    ) {
      return [{ ...entry, reason: "error" as const, amount: 1 }];
    }

    const progress = deriveLeitnerProgress({
      events: input.events.filter(
        (event) => event.classContext?.classId === input.classId,
      ),
      learningObjectId: entry.learningObjectId,
      direction: "prompt-to-answer",
      availableAt: entry.availableAt,
    });
    if (
      progress.knowledge.dueAt <= input.now ||
      progress.writing.dueAt <= input.now
    ) {
      return [{ ...entry, reason: "due" as const, amount: 1 }];
    }

    return [];
  });
}
