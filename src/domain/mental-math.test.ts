import { describe, expect, it } from "vitest";
import {
  checkMentalMathAnswer,
  generateMentalMathTasks,
  type MentalMathOperation,
} from "./mental-math";

describe("mental math copied from the Laufdiktat task model", () => {
  it("keeps every value and result inside the selected range", () => {
    const operations: MentalMathOperation[] = [
      "add",
      "subtract",
      "multiply",
      "divide",
    ];
    const tasks = generateMentalMathTasks(
      { operations, maxValue: 20, count: 200 },
      () => 0.61,
    );

    expect(tasks).toHaveLength(200);
    for (const task of tasks) {
      const values = task.prompt.match(/\d+/g)?.map(Number) ?? [];
      expect(Math.max(...values, task.answer)).toBeLessThanOrEqual(20);
      expect(task.answer).toBeGreaterThanOrEqual(0);
    }
  });

  it("generates exact division tasks", () => {
    const tasks = generateMentalMathTasks(
      { operations: ["divide"], maxValue: 100, count: 30 },
      () => 0.42,
    );
    for (const task of tasks) {
      const [left, right] = task.prompt.match(/\d+/g)?.map(Number) ?? [];
      if (left === undefined || right === undefined) {
        throw new Error(`Ungültige Rechenaufgabe: ${task.prompt}`);
      }
      expect(left / right).toBe(task.answer);
    }
  });

  it.each(["add", "subtract", "multiply", "divide"] as const)(
    "calculates %s tasks correctly",
    (operation) => {
      const tasks = generateMentalMathTasks(
        { operations: [operation], maxValue: 20, count: 100 },
        () => 0.47,
      );
      for (const task of tasks) {
        const values = task.prompt.match(/\d+/g)?.map(Number) ?? [];
        const first = values[0];
        const second = values[1];
        if (first === undefined || second === undefined) {
          throw new Error(`Ungültige Rechenaufgabe: ${task.prompt}`);
        }
        const expected =
          operation === "add"
            ? first + second
            : operation === "subtract"
              ? first - second
              : operation === "multiply"
                ? first * second
                : first / second;
        expect(task.answer).toBe(expected);
      }
    },
  );

  it("accepts numeric answers with decimal comma", () => {
    expect(
      checkMentalMathAnswer(
        { id: "one", prompt: "7 : 2", answer: 3.5, skillId: "division" },
        "3,5",
      ),
    ).toBe(true);
  });
});
