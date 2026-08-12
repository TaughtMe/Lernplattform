import type { ClassModule } from "./class-workspace";
import type { LearningEventV1 } from "./learning-bundle";

export type PracticeCatalogEntry = {
  learningObjectId: string;
  title: string;
  module: ClassModule;
  route: string;
};

export type DailyPracticeGroup = PracticeCatalogEntry & {
  reason: "error";
  amount: number;
};

export function selectErrorPractice(input: {
  events: readonly LearningEventV1[];
  catalog: readonly PracticeCatalogEntry[];
  classId: string;
  enabledModules: readonly ClassModule[];
}): DailyPracticeGroup[] {
  const latestByLearningObject = new Map<string, LearningEventV1>();

  for (const event of input.events) {
    if (event.classContext?.classId !== input.classId) continue;
    const previous = latestByLearningObject.get(event.learningObjectId);
    if (!previous || event.occurredAt > previous.occurredAt) {
      latestByLearningObject.set(event.learningObjectId, event);
    }
  }

  return input.catalog
    .filter((entry) => input.enabledModules.includes(entry.module))
    .filter((entry) => {
      const latest = latestByLearningObject.get(entry.learningObjectId);
      return (
        latest?.assessment.knowledge === "incorrect" ||
        latest?.assessment.writing === "incorrect"
      );
    })
    .map((entry) => ({ ...entry, reason: "error", amount: 1 }));
}
