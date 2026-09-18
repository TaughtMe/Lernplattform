import { describe, expect, it } from "vitest";
import {
  buildMathReviewRound,
  mathOptionsSchema,
  mathReviews,
  mathTaskFromPrompt,
  optionsForMathTask,
  type MathReview,
} from "./math-practice";
import { createMathAttempt } from "../storage/math-practice";
import { generateMentalMathTasks, parseMentalMathTask } from "./mental-math";

const task = parseMentalMathTask("7 * 8")!;
function review(source = "7 * 8"): MathReview {
  const task = parseMentalMathTask(source)!;
  return {
    id: source,
    task,
    options: optionsForMathTask(task),
    streak: 0,
    errors: 1,
    dueAt: "2026-09-18T10:00:00.000Z",
    lastRound: "lesson",
  };
}

describe("personal math practice", () => {
  it.each([
    ["7 · 8", "56", "multiply", undefined],
    ["_ + 5 = 12", "7", "add", "left"],
    ["7 + _ = 12", "5", "add", "right"],
    ["7 + 5 = _", "12", "add", "result"],
    ["(-5) + 2", "-3", "add", undefined],
    ["2^3", "8", "mixed-expression", undefined],
    ["6 + _ - 2", "4", "mixed-expression", undefined],
    ["_ + 5 = 99", "7", "mixed-expression", undefined],
  ])(
    "recovers %s without losing the answer",
    (prompt, answer, operation, gap) => {
      expect(mathTaskFromPrompt(prompt!, answer!)).toMatchObject({
        answer: Number(answer),
        operation,
      });
      expect(mathTaskFromPrompt(prompt!, answer!)?.gap).toBe(gap);
    },
  );

  it("rejects nonnumeric answers and invalid settings", () => {
    expect(mathTaskFromPrompt("1+2", "bad")).toBeNull();
    expect(mathTaskFromPrompt("1+2", " ")).toBeNull();
    expect(
      mathOptionsSchema.safeParse({ operations: [], maxValue: 20, count: 5 })
        .success,
    ).toBe(false);
    expect(
      mathOptionsSchema.safeParse({
        operations: ["add"],
        minValue: 50,
        maxValue: 20,
        count: 5,
      }).success,
    ).toBe(false);
  });

  it("keeps a correction or solution help due, then requires later retrieval", async () => {
    const events = [];
    const base = {
      task,
      roundId: "lesson",
      selfCorrected: false,
      usedHelp: false,
    };
    events.push(
      await createMathAttempt({
        ...base,
        attemptId: "1",
        answer: "54",
        now: "2026-09-18T10:00:00.000Z",
      }),
    );
    events.push(
      await createMathAttempt({
        ...base,
        attemptId: "2",
        answer: "56",
        selfCorrected: true,
        now: "2026-09-18T10:01:00.000Z",
      }),
    );
    expect(mathReviews(events)[0]).toMatchObject({
      errors: 1,
      streak: 0,
      dueAt: "2026-09-18T10:01:00.000Z",
    });
    events.push(
      await createMathAttempt({
        ...base,
        attemptId: "3",
        answer: "56",
        usedHelp: true,
        now: "2026-09-18T10:02:00.000Z",
      }),
    );
    expect(mathReviews(events)[0]!.streak).toBe(0);
    for (const minute of [3, 4])
      events.push(
        await createMathAttempt({
          ...base,
          roundId: "practice",
          attemptId: String(minute),
          answer: "56",
          now: `2026-09-18T10:0${minute}:00.000Z`,
        }),
      );
    expect(mathReviews(events)[0]!.dueAt).toBe("2026-09-19T10:04:00.000Z");
    events.push(
      await createMathAttempt({
        ...base,
        roundId: "tomorrow",
        attemptId: "1",
        answer: "56",
        now: "2026-09-19T11:00:00.000Z",
      }),
    );
    expect(mathReviews(events)[0]!.dueAt).toBe("2026-09-22T11:00:00.000Z");
    expect(mathReviews([...events].reverse())).toEqual(mathReviews(events));
  });

  it("keeps other errors active when a related variant is solved", async () => {
    const base = {
      roundId: "lesson",
      selfCorrected: false,
      usedHelp: false,
      now: "2026-09-18T10:00:00.000Z",
    };
    const first = await createMathAttempt({
      ...base,
      task,
      attemptId: "1",
      answer: "0",
    });
    const second = await createMathAttempt({
      ...base,
      task: parseMentalMathTask("6 * 8")!,
      attemptId: "2",
      answer: "0",
    });
    const variant = await createMathAttempt({
      ...base,
      task: {
        ...parseMentalMathTask("7 * 4")!,
        practiceKey: first.learningObjectId,
      },
      attemptId: "3",
      answer: "28",
      now: "2026-09-18T11:00:00.000Z",
    });
    const reviews = mathReviews([first, second, variant]);
    expect(reviews).toHaveLength(2);
    expect(
      reviews.find((item) => item.id === second.learningObjectId)!.streak,
    ).toBe(0);
    expect(
      reviews.find((item) => item.id === first.learningObjectId)!.task.answer,
    ).toBe(56);
  });

  it("makes short rounds with the original and related table tasks", () => {
    const original = review();
    const tasks = buildMathReviewRound([original], () => 0.42);
    expect(tasks).toHaveLength(10);
    expect(tasks[0]!.answer).toBe(56);
    expect(
      tasks.every(
        (task) =>
          task.practiceKey === original.id && task.operation === "multiply",
      ),
    ).toBe(true);
    expect(tasks.slice(1).every((task) => task.source.includes("7"))).toBe(
      true,
    );
    expect(
      buildMathReviewRound([original], () => 0.42, false)[0]!.id,
    ).toContain("variant");
    expect(buildMathReviewRound([])).toEqual([]);
    expect(
      buildMathReviewRound(Array.from({ length: 20 }, () => original)),
    ).toHaveLength(10);
  });

  it("preserves gaps, decimal and complex tasks and handles impossible variants", () => {
    const gap = {
      ...review("7 + 5"),
      task: parseMentalMathTask("7 + 5", 0, "right")!,
    };
    expect(
      buildMathReviewRound([gap], () => 0.2).every(
        (task) => task.gap === "right",
      ),
    ).toBe(true);
    expect(buildMathReviewRound([review("2^3")])).toHaveLength(1);
    expect(buildMathReviewRound([review("7 : 2")])).toHaveLength(1);
    const impossible = {
      ...review("1 + 1"),
      options: {
        operations: ["add" as const],
        minValue: 10,
        maxValue: 10,
        count: 5,
      },
    };
    expect(buildMathReviewRound([impossible], () => 0)).toHaveLength(1);
    expect(
      optionsForMathTask(parseMentalMathTask("1000 - 500")!).maxValue,
    ).toBe(1000);
    expect(
      optionsForMathTask(parseMentalMathTask("-5 + 2")!).allowNegativeResults,
    ).toBe(true);
    expect(
      optionsForMathTask(parseMentalMathTask("36 : 4")!).multiplicationTables,
    ).toEqual([4]);
  });

  it("never silently breaks generator constraints in its fallback", () => {
    const tasks = generateMentalMathTasks(
      {
        operations: ["subtract"],
        minValue: 0,
        maxValue: 20,
        count: 5,
        excludeZeroOperand: true,
        excludeZeroResult: true,
      },
      () => 0.5,
    );
    expect(tasks.every((task) => task.answer > 0)).toBe(true);
    expect(() =>
      generateMentalMathTasks(
        { operations: ["add"], minValue: 10, maxValue: 10, count: 5 },
        () => 0,
      ),
    ).toThrow("keine passenden Aufgaben");
    expect(() =>
      generateMentalMathTasks(
        {
          operations: ["multiply"],
          maxValue: 1,
          count: 5,
          multiplicationTables: [7],
          excludeZeroOperand: true,
        },
        () => 0,
      ),
    ).toThrow();
    const divided = generateMentalMathTasks(
      {
        operations: ["divide"],
        maxValue: 20,
        count: 1,
        multiplicationTables: [7],
        excludeZeroOperand: true,
      },
      () => 0,
    );
    expect(divided[0]!.source).toBe("7 : 7");
  });
});

it("retains a teacher-selected multiplication row when both factors are rows", () => {
  const entry = review("7 * 8");
  entry.options.multiplicationTables = [8];
  const tasks = buildMathReviewRound([entry], () => 0.3);
  expect(tasks.slice(1).every((task) => task.source.includes("8"))).toBe(true);
});
