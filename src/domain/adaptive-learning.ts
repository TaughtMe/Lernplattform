import type { LearningEventV1 } from "./learning-bundle";

export type PersonalLearningSummary = {
  activities: number;
  activeDays: number;
  improvedObjects: number;
  classContributions: number;
  privateActivities: number;
};

export function summarizePersonalLearning(
  events: readonly LearningEventV1[],
): PersonalLearningSummary {
  const ordered = [...events].sort((left, right) =>
    left.occurredAt.localeCompare(right.occurredAt),
  );
  const hadError = new Set<string>();
  const improved = new Set<string>();

  for (const event of ordered) {
    const incorrect =
      event.assessment.knowledge === "incorrect" ||
      event.assessment.writing === "incorrect";
    const correct =
      event.assessment.knowledge === "correct" &&
      event.assessment.writing !== "incorrect";
    if (incorrect) hadError.add(event.learningObjectId);
    if (correct && hadError.has(event.learningObjectId)) {
      improved.add(event.learningObjectId);
    }
  }

  const classContributions = events.filter(
    (event) => event.classContext?.rankingEligible,
  ).length;

  return {
    activities: events.length,
    activeDays: new Set(events.map((event) => event.occurredAt.slice(0, 10)))
      .size,
    improvedObjects: improved.size,
    classContributions,
    privateActivities: events.length - classContributions,
  };
}
