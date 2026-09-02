import { describe, expect, it } from "vitest";
import {
  checkMentalMathAnswer,
  countMathChainNumbers,
  evaluateMentalMathExpression,
  formatMathChainTokens,
  generateMentalMathTasks,
  normalizeMathChainInput,
  parseMentalMathTask,
  tokenizeMathChain,
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

  it("supports the safe Laufdiktat expression syntax without eval", () => {
    expect(evaluateMentalMathExpression("2 + 3 * 4")).toBe(14);
    expect(evaluateMentalMathExpression("\\frac{3}{4} + \\frac{1}{4}")).toBe(1);
    expect(evaluateMentalMathExpression("\\sqrt[3]{27} + 2^3")).toBe(11);
    expect(evaluateMentalMathExpression("\\sqrt{-4}")).toBeNull();
  });

  it("creates selectable gap tasks at every equation position", () => {
    expect(parseMentalMathTask("7 + 5", 0, "left")).toMatchObject({
      prompt: "_ + 5 = 12",
      answer: 7,
    });
    expect(parseMentalMathTask("7 + 5", 0, "right")).toMatchObject({
      prompt: "7 + _ = 12",
      answer: 5,
    });
    expect(parseMentalMathTask("7 + 5", 0, "result")).toMatchObject({
      prompt: "7 + 5 = _",
      answer: 12,
    });
  });

  it("honors selected multiplication tables and zero rules", () => {
    const tasks = generateMentalMathTasks(
      {
        operations: ["multiply", "divide"],
        minValue: 0,
        maxValue: 100,
        count: 50,
        multiplicationTables: [5],
        excludeZeroOperand: true,
        excludeZeroResult: true,
      },
      () => 0.42,
    );
    expect(tasks).toHaveLength(50);
    expect(tasks.every((task) => task.answer !== 0)).toBe(true);
    expect(tasks.every((task) => task.source.includes("5"))).toBe(true);
  });
});

describe("manually typed math chains", () => {
  it("re-spaces a chain typed without spaces", () => {
    expect(normalizeMathChainInput("3+4-2")).toBe("3 + 4 − 2");
    expect(normalizeMathChainInput("6*7")).toBe("6 · 7");
  });

  it("leaves LaTeX-style input (fractions/roots) untouched", () => {
    expect(normalizeMathChainInput("\\frac{1}{2}")).toBeNull();
  });

  it("counts and blanks any numeral in a chain, not just two operands", () => {
    const tokens = tokenizeMathChain("3 + 4 - 2")!;
    expect(countMathChainNumbers(tokens)).toBe(3);
    expect(formatMathChainTokens(tokens)).toBe("3 + 4 − 2");
    expect(formatMathChainTokens(tokens, 0)).toBe("_ + 4 − 2");
    expect(formatMathChainTokens(tokens, 1)).toBe("3 + _ − 2");
    expect(formatMathChainTokens(tokens, 2)).toBe("3 + 4 − _");
  });
});
