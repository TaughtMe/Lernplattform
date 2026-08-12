import { describe, expect, it } from "vitest";
import type { LearningEventV1 } from "./learning-bundle";
import { selectErrorPractice } from "./daily-practice";

const catalog = [
  {
    learningObjectId: "school-library",
    title: "School words wiederholen",
    module: "vocabulary" as const,
    route: "/klasse/7b/aufgaben/vokabeln",
  },
];

function event(
  id: string,
  assessment: "correct" | "incorrect",
  occurredAt: string,
  classId = "klasse-7b",
): LearningEventV1 {
  return {
    id,
    learningObjectId: "school-library",
    occurredAt,
    source: "lesson",
    roundId: `round-${id}`,
    direction: "prompt-to-answer",
    answerMode: "typed",
    help: "none",
    classContext: { classId, rankingEligible: true },
    assessment: {
      knowledge: assessment,
      writing: assessment,
      selfCorrected: false,
    },
  };
}

describe("daily error practice", () => {
  it("selects a class error for another practice round", () => {
    expect(
      selectErrorPractice({
        events: [event("one", "incorrect", "2026-08-12T10:00:00.000Z")],
        catalog,
        classId: "klasse-7b",
        enabledModules: ["vocabulary"],
      }),
    ).toEqual([{ ...catalog[0], reason: "error", amount: 1 }]);
  });

  it("removes an error after a later correct retrieval", () => {
    expect(
      selectErrorPractice({
        events: [
          event("old", "incorrect", "2026-08-12T10:00:00.000Z"),
          event("new", "correct", "2026-08-12T11:00:00.000Z"),
        ],
        catalog,
        classId: "klasse-7b",
        enabledModules: ["vocabulary"],
      }),
    ).toEqual([]);
  });

  it("ignores other classes and disabled modules", () => {
    expect(
      selectErrorPractice({
        events: [
          event("other", "incorrect", "2026-08-12T10:00:00.000Z", "klasse-8a"),
        ],
        catalog,
        classId: "klasse-7b",
        enabledModules: ["german"],
      }),
    ).toEqual([]);
  });
});
