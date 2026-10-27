import { describe, expect, it } from "vitest";
import type { LearningEventV1 } from "./learning-bundle";
import { deriveLeitnerProgress } from "./leitner-schedule";
import {
  REPETITION_RULE_TABLE,
  RULE_TABLE_START,
  type RuleTableModule,
} from "./testing/repetition-rule-table";

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
    // Die zweite Antwort ist zu früh und verschiebt die Fälligkeit nicht
    // (A-004: früher rückte jede weitere richtige Antwort den Termin nach).
    expect(progress.knowledge.dueAt).toBe("2026-08-15T10:00:00.000Z");
    expect(progress.knowledge.lastEventId).toBe("two");
  });

  it("does not advance before the due date, even in new rounds (A-004)", () => {
    const progress = deriveLeitnerProgress({
      ...baseInput,
      events: [0, 1, 2, 3, 4].map((index) =>
        event({
          id: `right-${index}`,
          roundId: `round-${index}`,
          occurredAt: `2026-08-12T10:${String(index * 10).padStart(2, "0")}:00.000Z`,
          result: "correct",
        }),
      ),
    });
    expect(progress.knowledge).toMatchObject({
      box: 2,
      dueAt: "2026-08-15T10:00:00.000Z",
    });
    expect(progress.writing.box).toBe(2);
  });

  it("advances one box per due date and stops at box five", () => {
    const days = [0, 3, 10, 24, 54, 84, 114];
    const progress = deriveLeitnerProgress({
      ...baseInput,
      events: days.map((offset, index) =>
        event({
          id: `due-${index}`,
          roundId: `round-${index}`,
          occurredAt: new Date(
            Date.parse("2026-08-12T10:00:00.000Z") + offset * 86_400_000,
          ).toISOString(),
          result: "correct",
        }),
      ),
    });
    expect(progress.knowledge.box).toBe(5);
    expect(progress.knowledge.dueAt).toBe("2027-01-03T10:00:00.000Z");
  });

  it("keeps the box after a correct answer with help", () => {
    const progress = deriveLeitnerProgress({
      ...baseInput,
      events: [
        event({
          id: "first",
          roundId: "one",
          occurredAt: "2026-08-12T10:00:00.000Z",
          result: "correct",
        }),
        event({
          id: "helped",
          roundId: "two",
          occurredAt: "2026-08-15T10:00:00.000Z",
          result: "correct",
          help: "hint",
        }),
      ],
    });
    expect(progress.knowledge).toMatchObject({
      box: 2,
      dueAt: "2026-08-18T10:00:00.000Z",
    });
  });

  it("caps a self-check at box three", () => {
    const days = [0, 1, 4, 11, 25];
    const progress = deriveLeitnerProgress({
      ...baseInput,
      events: days.map((offset, index) => ({
        ...event({
          id: `check-${index}`,
          roundId: `round-${index}`,
          occurredAt: new Date(
            Date.parse("2026-08-12T10:00:00.000Z") + offset * 86_400_000,
          ).toISOString(),
          result: "correct",
        }),
        answerMode: "self-check" as const,
      })),
    });
    expect(progress.knowledge.box).toBe(3);
  });

  it("ignores dimensions that were not assessed", () => {
    const base = event({
      id: "knowledge-only",
      roundId: "one",
      occurredAt: "2026-08-12T10:00:00.000Z",
      result: "correct",
    });
    const progress = deriveLeitnerProgress({
      ...baseInput,
      events: [
        {
          ...base,
          assessment: { ...base.assessment, writing: "not-assessed" },
        },
      ],
    });
    expect(progress.knowledge.box).toBe(2);
    expect(progress.writing).toEqual({ box: 1, dueAt: baseInput.availableAt });
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

/** Treiber der Regeltabelle: Antworten werden zu Ereignissen, geprüft wird die Ableitung. */
const ereignisModule: RuleTableModule = {
  name: "Ereignisse (deriveLeitnerProgress)",
  maxBox: 5,
  selfCheck: true,
  create(start) {
    const events: LearningEventV1[] = [];
    const availableAt = new Date(start).toISOString();
    const progress = () =>
      deriveLeitnerProgress({ ...baseInput, availableAt, events }).knowledge;
    return {
      answer(input) {
        const base = event({
          id: `ereignis-${events.length}`,
          roundId: input.roundId,
          occurredAt: new Date(input.at).toISOString(),
          result: input.correct ? "correct" : "incorrect",
          help: input.usedHelp ? "hint" : "none",
        });
        events.push({
          ...base,
          answerMode: input.selfCheck ? "self-check" : "typed",
        });
      },
      box: () => progress().box,
      dueAt: () => Date.parse(progress().dueAt),
    };
  },
};

describe("Regeltabelle Vault 06 an der Ereignisableitung", () => {
  for (const row of REPETITION_RULE_TABLE) {
    if (row.applies && !row.applies(ereignisModule)) continue;
    it(row.rule, () => row.run(ereignisModule));
  }

  it("beginnt zum angegebenen Zeitpunkt", () => {
    expect(ereignisModule.create(RULE_TABLE_START).dueAt()).toBe(
      RULE_TABLE_START,
    );
  });
});
