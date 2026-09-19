import { describe, expect, it } from "vitest";
import type { LearningEventV1 } from "./learning-bundle";
import { summarizePersonalLearning } from "./adaptive-learning";

function event(
  id: string,
  object: string,
  occurredAt: string,
  result: "correct" | "incorrect",
  shared = false,
): LearningEventV1 {
  return {
    id,
    learningObjectId: object,
    occurredAt,
    source: "lesson",
    roundId: `round-${id}`,
    direction: "prompt-to-answer",
    answerMode: "typed",
    help: "none",
    ...(shared
      ? { classContext: { classId: "klasse-7b", rankingEligible: true } }
      : {}),
    assessment: {
      knowledge: result,
      writing: result,
      selfCorrected: false,
    },
  };
}

describe("personal adaptive learning summary", () => {
  it("recognises practice, active days, improvements and data boundaries", () => {
    expect(
      summarizePersonalLearning([
        event("one", "library", "2026-08-12T09:00:00.000Z", "incorrect", true),
        event("two", "library", "2026-08-13T09:00:00.000Z", "correct", true),
        event("three", "other", "2026-08-13T10:00:00.000Z", "correct"),
      ]),
    ).toEqual({
      activities: 3,
      activeDays: 2,
      improvedObjects: 1,
      classContributions: 2,
      privateActivities: 1,
    });
  });

  it("does not claim improvement without an earlier error", () => {
    expect(
      summarizePersonalLearning([
        event("one", "library", "2026-08-12T09:00:00.000Z", "correct"),
      ]).improvedObjects,
    ).toBe(0);
  });
});
