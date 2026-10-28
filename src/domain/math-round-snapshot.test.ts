import { describe, expect, it } from "vitest";
import { generateMentalMathTasks } from "./mental-math";
import {
  buildMathRoundSnapshot,
  mathRoundSnapshotSchema,
  restoreMathTasks,
  type MathRoundSnapshotSource,
} from "./math-round-snapshot";
import { buildRoundSnapshot, parseRoundSnapshot } from "./round-snapshot";

const options = {
  operations: ["add", "subtract"],
  minValue: 0,
  maxValue: 20,
  count: 10,
} as const;

function source(
  overrides: Partial<MathRoundSnapshotSource> = {},
): MathRoundSnapshotSource {
  return {
    tasks: generateMentalMathTasks(
      { ...options, operations: [...options.operations] },
      () => 0.5,
    ),
    index: 3,
    mistakes: 1,
    helpCount: 0,
    attempt: 4,
    corrected: false,
    wrongTries: 0,
    help: false,
    options: { ...options, operations: [...options.operations] },
    ...overrides,
  };
}

describe("buildMathRoundSnapshot", () => {
  it("hält Aufgaben, Stelle, Zählung und Versuchszähler fest", () => {
    const content = buildMathRoundSnapshot(source())!;
    expect(content).toMatchObject({
      index: 3,
      mistakes: 1,
      attempt: 4,
      corrected: false,
      wrongTries: 0,
    });
    expect(content.tasks).toHaveLength(10);
    expect(content.options).toEqual(source().options);
  });

  it("übersteht Speichern und Lesen unverändert", () => {
    const content = buildMathRoundSnapshot(
      source({ corrected: true, wrongTries: 1, help: true, helpCount: 1 }),
    )!;
    const raw = JSON.stringify(
      buildRoundSnapshot({
        module: "kopfrechnen",
        roundId: "r",
        startedAt: "2026-10-28T09:00:00.000Z",
        now: new Date("2026-10-28T09:05:00.000Z"),
        done: content.index,
        total: content.tasks.length,
        state: content,
      }),
    );
    expect(
      parseRoundSnapshot(raw, {
        module: "kopfrechnen",
        now: new Date("2026-10-28T09:10:00.000Z"),
        state: mathRoundSnapshotSchema,
      })?.state,
    ).toEqual(content);
  });

  it("behält den Wiederholungsposten (practiceKey) und lässt die Einstellung weg", () => {
    const tasks = source().tasks.map((entry, index) => ({
      ...entry,
      practiceKey: `posten-${index}`,
    }));
    const content = buildMathRoundSnapshot(source({ tasks, options: null }))!;
    expect(content.tasks[0]).toMatchObject({ practiceKey: "posten-0" });
    expect(content).not.toHaveProperty("options");
  });

  it("bietet eine fertige oder leere Runde nicht an", () => {
    expect(buildMathRoundSnapshot(source({ index: 10 }))).toBeNull();
    expect(buildMathRoundSnapshot(source({ tasks: [] }))).toBeNull();
  });
});

describe("restoreMathTasks", () => {
  it("liefert die Aufgaben samt Posten-Kennung und ohne leere Felder", () => {
    const tasks = source().tasks.map((entry, index) =>
      index === 0 ? { ...entry, practiceKey: "posten-0" } : entry,
    );
    const restored = restoreMathTasks(
      buildMathRoundSnapshot(source({ tasks, options: null }))!,
    );
    expect(restored).toEqual(tasks);
    expect(restored[1]).not.toHaveProperty("practiceKey");
  });
});

describe("mathRoundSnapshotSchema", () => {
  it("verwirft unplausible Werte", () => {
    const content = buildMathRoundSnapshot(source())!;
    const valid = (patch: Record<string, unknown>) =>
      mathRoundSnapshotSchema.safeParse({ ...content, ...patch }).success;
    expect(valid({})).toBe(true);
    expect(valid({ index: -1 })).toBe(false);
    expect(valid({ attempt: 1.5 })).toBe(false);
    expect(valid({ tasks: [{ id: "x" }] })).toBe(false);
    expect(valid({ options: { operations: [], maxValue: 5, count: 1 } })).toBe(
      false,
    );
  });
});
