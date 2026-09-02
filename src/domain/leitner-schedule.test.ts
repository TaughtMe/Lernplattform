import { describe, expect, it } from "vitest";
import type { LearningEventV1 } from "./learning-bundle";
import { deriveLeitnerProgress } from "./leitner-schedule";

function event(input: {
  id: string;
  roundId: string;
  occurredAt: string;
  result: "correct" | "incorrect";
  help?: "none" | "hint";
}): LearningEventV1 {
  return {
    id: input.id,
    learningObjectId: "library",
    occurredAt: input.occurredAt,
    source: "learning-box",
    roundId: input.roundId,
    direction: "prompt-to-answer",
    answerMode: "typed",
    help: input.help ?? "none",
    assessment: {
      knowledge: input.result,
      writing: input.result,
      selfCorrected: false,
    },
  };
}

const baseInput = {
  learningObjectId: "library",
  direction: "prompt-to-answer" as const,
  availableAt: "2026-08-12T08:00:00.000Z",
};

describe("Leitner schedule", () => {
  it("starts a new learning object in box one and makes it available", () => {
    expect(deriveLeitnerProgress({ ...baseInput, events: [] })).toEqual({
      knowledge: { box: 1, dueAt: baseInput.availableAt },
      writing: { box: 1, dueAt: baseInput.availableAt },
    });
  });

  it("advances only once in the same round", () => {
    const progress = deriveLeitnerProgress({
      ...baseInput,
      events: [
        event({
          id: "one",
          roundId: "round",
          occurredAt: "2026-08-12T10:00:00.000Z",
          result: "correct",
        }),
        event({
          id: "two",
          roundId: "round",
          occurredAt: "2026-08-12T10:05:00.000Z",
          result: "correct",
        }),
      ],
    });
    expect(progress.knowledge.box).toBe(2);
    expect(progress.knowledge.dueAt).toBe("2026-08-15T10:05:00.000Z");
  });

  it("keeps a later correction in the failed round in box one", () => {
    const progress = deriveLeitnerProgress({
      ...baseInput,
      events: [
        event({
          id: "wrong",
          roundId: "round",
          occurredAt: "2026-08-12T10:00:00.000Z",
          result: "incorrect",
        }),
        event({
          id: "right",
          roundId: "next-round",
          occurredAt: "2026-08-12T10:05:00.000Z",
          result: "correct",
        }),
      ],
    });
    expect(progress.knowledge.box).toBe(1);
    expect(progress.knowledge.dueAt).toBe("2026-08-13T10:05:00.000Z");
  });

  it("does not advance after a hint and resets after an error", () => {
    const progress = deriveLeitnerProgress({
      ...baseInput,
      events: [
        event({
          id: "hint",
          roundId: "one",
          occurredAt: "2026-08-12T10:00:00.000Z",
          result: "correct",
          help: "hint",
        }),
        event({
          id: "right",
          roundId: "two",
          occurredAt: "2026-08-14T10:00:00.000Z",
          result: "correct",
        }),
        event({
          id: "wrong",
          roundId: "three",
          occurredAt: "2026-08-15T10:00:00.000Z",
          result: "incorrect",
        }),
      ],
    });
    expect(progress.knowledge).toMatchObject({
      box: 1,
      dueAt: "2026-08-15T10:00:00.000Z",
    });
  });
});
