import { describe, expect, it } from "vitest";
import {
  checkMentalMathAnswer,
  countMathChainNumbers,
  defaultMathGapIndex,
  evaluateMentalMathExpression,
  formatMathChainTokens,
  generateMentalMathTasks,
  insertAtSelection,
  isGapUnique,
  isLatexMathSyntax,
  isLatexMathTask,
  spokenMathText,
  stripMathDelimiters,
  mathAnswerMatches,
  mathNumbersEqual,
  normalizeMathChainInput,
  parseMathAnswer,
  parseMentalMathExpression,
  parseMentalMathTask,
  shuffleMathTasks,
  splitMathLines,
  tokenizeMathChain,
  type MathGapSlot,
  type MentalMathOperation,
} from "./mental-math";

/** Kleiner deterministischer Zufall (mulberry32) für die Eigenschaftstests. */
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

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

  it("reads a leading minus as a sign and brackets negative numbers", () => {
    for (const input of ["-1 − -4", "-1--4", "-1 - (-4)", "-1 − ( -4 )"]) {
      expect(normalizeMathChainInput(input)).toBe("-1 − (-4)");
    }
    expect(normalizeMathChainInput("3 + -2")).toBe("3 + (-2)");
    expect(normalizeMathChainInput("6 · -3")).toBe("6 · (-3)");
    const tokens = tokenizeMathChain("-1 − -4")!;
    expect(countMathChainNumbers(tokens)).toBe(2);
    expect(formatMathChainTokens(tokens, 1)).toBe("-1 − _");
    expect(tokens.filter((token) => token.kind === "number")).toEqual([
      { kind: "number", value: -1 },
      { kind: "number", value: -4 },
    ]);
    for (const source of ["-1 − -4", "-1 − (-4)", "(-1) − (-4)"]) {
      expect(parseMentalMathTask(source, 0)).toMatchObject({
        prompt: "-1 − (-4)",
        answer: 3,
        operation: "subtract",
      });
    }
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

  it("flags fractions/roots/powers as needing KaTeX, but not plain chains", () => {
    expect(isLatexMathSyntax("\\frac{1}{2}")).toBe(true);
    expect(isLatexMathSyntax("\\sqrt{9}")).toBe(true);
    expect(isLatexMathSyntax("2^3")).toBe(true);
    expect(isLatexMathSyntax("3 + 4 - 2")).toBe(false);
    expect(isLatexMathSyntax("7 + 8")).toBe(false);
  });
});

describe("isLatexMathTask", () => {
  const mixed = (prompt: string) => ({
    prompt,
    operation: "mixed-expression" as const,
  });

  it("erkennt Brüche, Potenzen und Wurzeln im Aufgabentext", () => {
    expect(isLatexMathTask(mixed("19 + 1 + 3+ \\frac{1}{2}"))).toBe(true);
    expect(isLatexMathTask(mixed("\\frac{3}{4} + \\frac{1}{4}"))).toBe(true);
    expect(isLatexMathTask(mixed("\\sqrt{16} + 2"))).toBe(true);
    expect(isLatexMathTask(mixed("2^3 + 1"))).toBe(true);
  });

  it("erkennt LaTeX auch, wenn der Text nicht auswertbar ist oder Umrandung hat", () => {
    expect(isLatexMathTask(mixed("\\left(1+2\\right) \\cdot 3"))).toBe(true);
    expect(isLatexMathTask(mixed("$\\frac{1}{2} + 1$"))).toBe(true);
    expect(isLatexMathTask(mixed("\\(2 + 3\\)"))).toBe(true);
  });

  it("lässt gewöhnliche Aufgaben als Text", () => {
    expect(isLatexMathTask(mixed("19 + 1 + 3 + 5"))).toBe(false);
    expect(isLatexMathTask(mixed("(2 + 3) · 4"))).toBe(false);
    expect(isLatexMathTask(mixed("7 + _ = 15"))).toBe(false);
    // Aufgaben mit zwei Zahlen sind nie LaTeX.
    expect(isLatexMathTask({ prompt: "7 + 8", operation: "add" })).toBe(false);
  });

  it("macht aus LaTeX gesprochene Sprache", () => {
    expect(spokenMathText("19 + 1 + 3+ \\frac{1}{2}")).toBe(
      "19 plus 1 plus 3 plus 1 durch 2",
    );
    expect(spokenMathText("\\sqrt{16} - 2^{3}")).toBe(
      "Wurzel aus 16 minus 2 hoch 3",
    );
    expect(spokenMathText("$(2 + 3) \\cdot 4$")).toBe(
      "Klammer auf 2 plus 3 Klammer zu mal 4",
    );
  });

  it("entfernt Umrandungen", () => {
    expect(stripMathDelimiters("$\\frac{1}{2}$")).toBe("\\frac{1}{2}");
    expect(stripMathDelimiters("\\(1 + 2\\)")).toBe("1 + 2");
    expect(stripMathDelimiters(" 1 + 2 ")).toBe("1 + 2");
  });
});

describe("Rechenzeilen und Lücken", () => {
  it("trimmt Zeilen und lässt leere weg", () => {
    expect(splitMathLines("  3 + 4 \n\n\t\n5 - 1\n")).toEqual([
      "3 + 4",
      "5 - 1",
    ]);
    expect(splitMathLines("")).toEqual([]);
  });

  it("verdeckt vorgabemäßig die letzte Zahl", () => {
    expect(defaultMathGapIndex(0)).toBe(0);
    expect(defaultMathGapIndex(1)).toBe(0);
    expect(defaultMathGapIndex(2)).toBe(1);
    expect(defaultMathGapIndex(5)).toBe(4);
  });

  it("fügt an der Auswahl ein und setzt den Cursor", () => {
    expect(insertAtSelection("12", "+", 1, 1, 1)).toEqual({
      text: "1+2",
      cursor: 2,
    });
    expect(insertAtSelection("a123b", "()", 1, 4, 1)).toEqual({
      text: "a()b",
      cursor: 2,
    });
    expect(insertAtSelection("", "\\frac{}{}", 0, 0, 6)).toEqual({
      text: "\\frac{}{}",
      cursor: 6,
    });
  });
});

describe("parseMathAnswer (G-008, M-2)", () => {
  it.each([
    ["7", 7],
    ["0", 0],
    ["-3", -3],
    ["−3", -3],
    ["–3", -3],
    ["- 3", -3],
    ["2,5", 2.5],
    ["2.5", 2.5],
    ["0.75", 0.75],
    ["0,001", 0.001],
    ["1.000", 1000],
    ["1 000", 1000],
    ["1\u00a0000", 1000],
    ["1\u202f000", 1000],
    ["12.345", 12345],
    ["1.000.000", 1000000],
    ["12 345 678", 12345678],
    ["1.000,5", 1000.5],
    ["1 000,5", 1000.5],
    ["1 000.5", 1000.5],
    ["1234.567", 1234.567],
    ["1,000", 1],
    ["0.500", 0.5],
    ["  42  ", 42],
    ["-0", 0],
  ])("liest %j als %s", (input, expected) => {
    expect(parseMathAnswer(input)).toBe(expected);
  });

  it.each([
    "",
    "   ",
    "abc",
    "0x10",
    "1e1",
    "1/3",
    "+",
    "-",
    "5,",
    ",5",
    ".5",
    "1,5,5",
    "1.5.5",
    "1.00.0",
    "1.00.000",
    "1 00",
    "1 0000",
    "10.00 0",
    "1,000.5",
    "1.000.5",
    "0.000.000",
    "1 000 00",
    "--3",
    "3-",
    "1 2",
    "Infinity",
    "NaN",
  ])("lehnt %j ab", (input) => {
    expect(parseMathAnswer(input)).toBeNull();
  });

  it.each([
    // [Lösung, Eingabe, richtig?]
    [0.01, "0,001", false],
    [0.01, "0,01", true],
    [0.01, "0,010", true],
    [0.01, "0.01", true],
    [0.01, "0,011", false],
    [0.01, "0", false],
    [1000, "1.000", true],
    [1000, "1 000", true],
    [1000, "1000", true],
    [1000, "1,000", false],
    [1000, "1.00", false],
    [1000, "1", false],
    [1, "1.000", false],
    [1, "1", true],
    [1, "1,0", true],
    [-3, "−3", true],
    [-3, "-3", true],
    [-3, "3", false],
    [2.5, "2,5", true],
    [2.5, "2.5", true],
    [2.5, "2,50", true],
    [2.5, "2,4", false],
    [0, "0", true],
    [0, "-0", true],
    [0, "0,0000001", false],
    [0.025, "0,02", false],
    [0.025, "0,03", false],
    [0.025, "0,025", true],
    [3, "2,995", false],
    [1 / 3, "0,333333", true],
    [1 / 3, "0,34", false],
    [1 / 3, "0,33", true],
    [1 / 3, "0,333", true],
    [1 / 3, "0,3", false],
    [2 / 3, "0,67", true],
    [2 / 3, "0,66", false],
    [-1 / 3, "-0,33", true],
    [0.1 + 0.2, "0,3", true],
    [1000000, "1.000.000", true],
    [5, "", false],
    [5, "  ", false],
    [5, "abc", false],
  ])("Lösung %s, Eingabe %j: richtig = %s", (solution, input, expected) => {
    expect(mathAnswerMatches(solution, input)).toBe(expected);
    expect(
      checkMentalMathAnswer(
        { id: "t", prompt: "x", answer: solution, skillId: "s" },
        input,
      ),
    ).toBe(expected);
  });

  it("vergleicht Zahlen auf sechs Nachkommastellen ohne Epsilon", () => {
    expect(mathNumbersEqual(0.1 + 0.2, 0.3)).toBe(true);
    expect(mathNumbersEqual(0.01, 0.011)).toBe(false);
    expect(mathNumbersEqual(1, 1.000001)).toBe(false);
    expect(mathNumbersEqual(Number.NaN, Number.NaN)).toBe(false);
  });
});

describe("eindeutige Lücken (G-009, M-3)", () => {
  it.each([
    // „_ · 0 = 0“ und „0 · _ = 0“ sind mehrdeutig.
    ["*", 0, 5, "left", true],
    ["*", 5, 0, "left", false],
    ["*", 0, 5, "right", false],
    ["*", 5, 0, "right", true],
    ["*", 0, 0, "result", true],
    ["/", 0, 5, "right", false],
    ["/", 0, 5, "left", true],
    ["/", 6, 3, "right", true],
    ["+", 0, 0, "left", true],
    ["-", 0, 0, "right", true],
  ] as const)(
    "%s mit %s und %s, Lücke %s: eindeutig = %s",
    (operator, left, right, gap, expected) => {
      expect(isGapUnique(operator, { left, right }, gap)).toBe(expected);
    },
  );

  const operations: MentalMathOperation[] = [
    "add",
    "subtract",
    "multiply",
    "divide",
  ];
  const ranges = [
    { minValue: 0, maxValue: 20 },
    { minValue: 0, maxValue: 100 },
    { minValue: -20, maxValue: 20, allowNegativeResults: true },
    { minValue: 0, maxValue: 1000 },
  ];
  const slotModes: Array<MathGapSlot | undefined> = [
    undefined,
    "left",
    "right",
    "result",
  ];

  /** Zählt die ganzen Zahlen im Zahlenraum, die die Gleichung erfüllen. */
  function solutionCount(
    task: ReturnType<typeof generateMentalMathTasks>[number],
    min: number,
    max: number,
  ) {
    const expression = parseMentalMathExpression(task.source)!;
    const { left, right, result, operator } = expression;
    const holds = (a: number, b: number, c: number) =>
      operator === "+"
        ? a + b === c
        : operator === "-"
          ? a - b === c
          : operator === "*"
            ? a * b === c
            : b !== 0 && a === c * b;
    let count = 0;
    for (let candidate = min; candidate <= max; candidate += 1) {
      const fits =
        task.gap === "left"
          ? holds(candidate, right, result)
          : task.gap === "right"
            ? holds(left, candidate, result)
            : holds(left, right, candidate);
      if (fits) count += 1;
    }
    return count;
  }

  it.each(
    operations.flatMap((operation) =>
      ranges.flatMap((range) =>
        slotModes.map((slot) => [operation, range, slot] as const),
      ),
    ),
  )(
    "jede Lückenaufgabe hat genau eine ganzzahlige Lösung (%s, %j, Lücke %s)",
    (operation, range, slot) => {
      // Nullen sind ausdrücklich erlaubt: Das ist der Standard der App.
      const seeds = range.maxValue === 1000 ? 8 : 25;
      const lowest = Math.min(range.minValue, -range.maxValue);
      for (let seed = 1; seed <= seeds; seed += 1) {
        const tasks = generateMentalMathTasks(
          {
            operations: [operation],
            ...range,
            count: 20,
            gapMode: true,
            ...(slot ? { gapSlots: Array(20).fill(slot) } : {}),
          },
          seededRandom(seed * 7919 + operation.length),
        );
        expect(tasks).toHaveLength(20);
        for (const task of tasks) {
          expect(task.gap).toBeDefined();
          if (slot) expect(task.gap).toBe(slot);
          expect(
            solutionCount(task, lowest, range.maxValue),
            `${task.prompt} (Lösung ${task.answer})`,
          ).toBe(1);
        }
      }
    },
  );

  it("gemischte Rechenarten und Lückenpositionen bleiben eindeutig und decken Nullen ab", () => {
    let withZero = 0;
    for (let seed = 1; seed <= 300; seed += 1) {
      const tasks = generateMentalMathTasks(
        { operations, maxValue: 100, count: 30, gapMode: true },
        seededRandom(seed),
      );
      for (const task of tasks) {
        expect(solutionCount(task, -100, 100), task.prompt).toBe(1);
        if (/(^| )0 /.test(task.prompt) || / 0 /.test(task.prompt))
          withZero += 1;
      }
    }
    // Die Nullen bleiben als Operanden erlaubt, nur nicht als verschluckte Lücke.
    expect(withZero).toBeGreaterThan(0);
  });

  it("weicht bei einer Null auf eine andere Lückenposition aus", () => {
    // Mit festem Zufall 0 ergibt die Einmaleins-Aufgabe „0 · 1“ bzw. „1 · 0“.
    const tasks = generateMentalMathTasks(
      {
        operations: ["multiply"],
        maxValue: 100,
        count: 12,
        gapMode: true,
        multiplicationTables: [1],
      },
      seededRandom(3),
    );
    for (const task of tasks) {
      const expression = parseMentalMathExpression(task.source)!;
      if (expression.left === 0) expect(task.gap).not.toBe("left");
      if (expression.right === 0) expect(task.gap).not.toBe("right");
    }
  });

  it("zieht bei fester Lückenposition neue Operanden, auch bei festem Zufall", () => {
    for (const [slot, zeroSide] of [
      ["left", "right"],
      ["right", "left"],
    ] as const) {
      const tasks = generateMentalMathTasks(
        {
          operations: ["multiply"],
          maxValue: 100,
          count: 5,
          gapMode: true,
          gapSlots: Array(5).fill(slot),
          multiplicationTables: [1],
        },
        () => 0,
      );
      for (const task of tasks) {
        const expression = parseMentalMathExpression(task.source)!;
        expect(expression[zeroSide]).not.toBe(0);
        expect(task.gap).toBe(slot);
      }
    }
  });

  it("Aufgaben ohne Lücke und Lehrer-Aufgaben bleiben unverändert", () => {
    expect(parseMentalMathTask("0 * 5", 0, "left")).toMatchObject({
      prompt: "_ · 5 = 0",
      answer: 0,
      gap: "left",
    });
    const plain = generateMentalMathTasks(
      { operations: ["multiply"], maxValue: 100, count: 20 },
      seededRandom(5),
    );
    expect(plain.every((task) => task.gap === undefined)).toBe(true);
  });
});

describe("shuffleMathTasks", () => {
  it("mischt reproduzierbar, ohne die Eingabe zu ändern", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const first = shuffleMathTasks(input, seededRandom(11));
    expect(shuffleMathTasks(input, seededRandom(11))).toEqual(first);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...first].sort()).toEqual(input);
    expect(first).not.toEqual(input);
  });

  it("verarbeitet leere und einelementige Listen", () => {
    expect(shuffleMathTasks([])).toEqual([]);
    expect(shuffleMathTasks(["x"], () => 0.9)).toEqual(["x"]);
  });
});
