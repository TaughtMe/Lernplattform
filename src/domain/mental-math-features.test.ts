import { describe, expect, it } from "vitest";
import {
  buildMathReviewRound,
  mathFamilyKey,
  mathFamilyKeyWithFeature,
  mathFeatureOfTask,
  optionsForMathTask,
  type MathReview,
} from "./math-practice";
import {
  generateMentalMathTasks,
  parseMentalMathExpression,
  parseMentalMathTask,
  type MentalMathOptions,
} from "./mental-math";
import {
  digitwiseSubtraction,
  hasHundredsBridge,
  isTrivialMathTask,
  mathTaskFeature,
  placeValueKind,
  splitPlaceValue,
} from "./mental-math-features";

/** Kleiner deterministischer Zufall (mulberry32). */
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

function expressions(options: MentalMathOptions, seed: number) {
  return generateMentalMathTasks(options, seededRandom(seed)).map((task) =>
    parseMentalMathExpression(task.source)!,
  );
}

describe("Merkmale einer Aufgabe (MA-1)", () => {
  it("erkennt den Übergang in der Einerstelle", () => {
    expect(mathTaskFeature(8, "+", 5)?.bridge).toBe(true);
    expect(mathTaskFeature(5, "+", 5)?.bridge).toBe(true);
    expect(mathTaskFeature(53, "+", 24)?.bridge).toBe(false);
    expect(mathTaskFeature(56, "+", 70)?.bridge).toBe(false);
    expect(mathTaskFeature(13, "-", 6)?.bridge).toBe(true);
    expect(mathTaskFeature(53, "-", 27)?.bridge).toBe(true);
    expect(mathTaskFeature(58, "-", 23)?.bridge).toBe(false);
    expect(mathTaskFeature(100, "-", 7)?.bridge).toBe(true);
  });

  it("nennt die Stellenwertart beider Zahlen", () => {
    expect(mathTaskFeature(47, "+", 8)?.placeValue).toBe("ZE+E");
    expect(mathTaskFeature(47, "+", 28)?.placeValue).toBe("ZE+ZE");
    expect(mathTaskFeature(60, "-", 20)?.placeValue).toBe("Z-Z");
    expect(mathTaskFeature(250, "+", 8)?.placeValue).toBe("HZ+E");
    expect(placeValueKind(2000)).toBe("T");
    expect(placeValueKind(2500)).toBe("T+");
    expect(placeValueKind(1.5)).toBeNull();
    expect(placeValueKind(-3)).toBeNull();
  });

  it("gibt für Mal, Geteilt, Komma und negative Ergebnisse kein Merkmal", () => {
    expect(mathTaskFeature(6, "*", 7)).toBeNull();
    expect(mathTaskFeature(6, "/", 3)).toBeNull();
    expect(mathTaskFeature(1.5, "+", 2)).toBeNull();
    expect(mathTaskFeature(3, "-", 8)).toBeNull();
  });

  it("liest die Stellenwertart wieder aus der Zeichenkette", () => {
    expect(splitPlaceValue("ZE+E")).toEqual({
      left: "ZE",
      operator: "+",
      right: "E",
    });
    expect(splitPlaceValue("T+-HZE")).toEqual({
      left: "T+",
      operator: "-",
      right: "HZE",
    });
    expect(splitPlaceValue("kaputt")).toBeNull();
  });

  it("erkennt Übertrag bei Hundertern und stellenweise Rechnung", () => {
    expect(hasHundredsBridge(270, "+", 60)).toBe(true);
    expect(hasHundredsBridge(210, "+", 60)).toBe(false);
    expect(hasHundredsBridge(340, "-", 70)).toBe(true);
    expect(hasHundredsBridge(6, "*", 7)).toBe(false);
    expect(digitwiseSubtraction(53, 27)).toBe(34);
    expect(digitwiseSubtraction(58, 23)).toBeNull();
    expect(digitwiseSubtraction(3, 8)).toBeNull();
  });

  it("zählt 0, 1 und · 10 als einfache Aufgaben", () => {
    expect(isTrivialMathTask("add", 0, 7)).toBe(true);
    expect(isTrivialMathTask("subtract", 9, 1)).toBe(true);
    expect(isTrivialMathTask("add", 8, 7)).toBe(false);
    expect(isTrivialMathTask("multiply", 7, 10)).toBe(true);
    expect(isTrivialMathTask("multiply", 6, 7)).toBe(false);
    expect(isTrivialMathTask("divide", 70, 10)).toBe(true);
    expect(isTrivialMathTask("divide", 42, 7)).toBe(false);
  });
});

describe("gewichteter Generator (MA-1)", () => {
  const add = (extra: Partial<MentalMathOptions> = {}): MentalMathOptions => ({
    operations: ["add"],
    maxValue: 100,
    count: 40,
    ...extra,
  });

  it("zieht häufig Aufgaben mit Zehnerübergang", () => {
    let bridges = 0;
    let total = 0;
    for (let seed = 1; seed <= 20; seed += 1)
      for (const { left, right } of expressions(add(), seed)) {
        total += 1;
        if (mathTaskFeature(left, "+", right)?.bridge) bridges += 1;
      }
    // Gleichverteilt wären es etwa 45 %, gewichtet deutlich mehr.
    expect(bridges / total).toBeGreaterThan(0.5);
  });

  it("zieht Verdoppeln, Fast-Verdoppeln und Kernaufgaben", () => {
    let doubles = 0;
    let near = 0;
    let core = 0;
    let total = 0;
    for (let seed = 1; seed <= 20; seed += 1)
      for (const { left, right, result } of expressions(add(), seed)) {
        total += 1;
        if (left === right) doubles += 1;
        if (Math.abs(left - right) === 1) near += 1;
        if (result % 10 === 0) core += 1;
      }
    expect(doubles / total).toBeGreaterThan(0.05);
    expect(near / total).toBeGreaterThan(0.05);
    expect(core / total).toBeGreaterThan(0.1);
  });

  it("gewichtet Minus mit Übergang und Halbieren", () => {
    let bridges = 0;
    let halves = 0;
    let total = 0;
    for (let seed = 1; seed <= 20; seed += 1)
      for (const { left, right } of expressions(
        add({ operations: ["subtract"] }),
        seed,
      )) {
        total += 1;
        if (mathTaskFeature(left, "-", right)?.bridge) bridges += 1;
        if (left === 2 * right) halves += 1;
      }
    expect(bridges / total).toBeGreaterThan(0.4);
    expect(halves / total).toBeGreaterThan(0.05);
  });

  it("hält Aufgaben mit 0, 1 und · 10 bei höchstens 5 % je Runde", () => {
    const rounds: MentalMathOptions[] = [
      add({ count: 20 }),
      add({ operations: ["subtract"], count: 40 }),
      {
        operations: ["multiply", "divide"],
        maxValue: 100,
        count: 20,
        multiplicationTables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      },
    ];
    for (const options of rounds)
      for (let seed = 1; seed <= 60; seed += 1) {
        const tasks = generateMentalMathTasks(options, seededRandom(seed));
        const trivial = tasks.filter((task) => {
          const { left, right } = parseMentalMathExpression(task.source)!;
          return isTrivialMathTask(task.operation as "add", left, right);
        });
        expect(trivial.length).toBeLessThanOrEqual(
          Math.floor(options.count * 0.05),
        );
      }
  });

  it("gewichtet das Einmaleins nach Kern- und Nachbaraufgaben", () => {
    let core = 0;
    let neighbour = 0;
    let total = 0;
    for (let seed = 1; seed <= 20; seed += 1)
      for (const { left, right } of expressions(
        {
          operations: ["multiply"],
          maxValue: 100,
          count: 40,
          multiplicationTables: [2, 3, 4, 5, 6, 7, 8, 9],
        },
        seed,
      )) {
        total += 1;
        if ([left, right].some((factor) => factor === 5)) core += 1;
        if ([left, right].some((factor) => [3, 4, 6, 9].includes(factor)))
          neighbour += 1;
      }
    expect(core / total).toBeGreaterThan(0.2);
    expect(neighbour / total).toBeGreaterThan(0.4);
  });

  it("bleibt im Zahlenraum und erfüllt die Nullregeln", () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      for (const operation of [
        "add",
        "subtract",
        "multiply",
        "divide",
      ] as const) {
        const tasks = generateMentalMathTasks(
          {
            operations: [operation],
            maxValue: 20,
            count: 20,
            excludeZeroOperand: true,
            excludeZeroResult: true,
          },
          seededRandom(seed),
        );
        for (const task of tasks) {
          const { left, right, result } = parseMentalMathExpression(
            task.source,
          )!;
          expect(Math.max(left, right, result)).toBeLessThanOrEqual(20);
          expect(Math.min(left, right, result)).toBeGreaterThan(0);
        }
      }
    }
  });

  it("zieht ohne Gewichtung gleichverteilt wie zuvor (weighted: false)", () => {
    const first = generateMentalMathTasks(
      add({ weighted: false }),
      seededRandom(5),
    );
    const second = generateMentalMathTasks(
      add({ weighted: false }),
      seededRandom(5),
    );
    expect(first).toEqual(second);
    const weighted = generateMentalMathTasks(add(), seededRandom(5));
    expect(weighted).not.toEqual(first);
  });

  it("ist bei festem Zufall reproduzierbar", () => {
    expect(generateMentalMathTasks(add(), seededRandom(9))).toEqual(
      generateMentalMathTasks(add(), seededRandom(9)),
    );
  });

  it("erzeugt auch bei engen Zahlenräumen und festen Reihen Aufgaben", () => {
    for (const value of [0, 0.5, 0.999]) {
      expect(
        generateMentalMathTasks(
          {
            operations: ["multiply"],
            maxValue: 100,
            count: 5,
            multiplicationTables: [10],
          },
          () => value,
        ),
      ).toHaveLength(5);
      expect(
        generateMentalMathTasks(
          { operations: ["add", "subtract"], maxValue: 3, count: 5 },
          () => value,
        ),
      ).toHaveLength(5);
    }
  });
});

describe("Nachübung nach Merkmal (MA-3)", () => {
  function review(source: string): MathReview {
    const task = parseMentalMathTask(source)!;
    return {
      id: source,
      task,
      options: optionsForMathTask(task),
      dueAt: "2026-01-01T10:00:00.000Z",
      step: 0,
      mastered: false,
      errors: 1,
      lastRound: "r1",
    };
  }

  it("erzeugt nach einem Fehler mit Übergang Aufgaben mit Übergang in derselben Stellenwertart", () => {
    for (const source of ["47 + 8", "53 - 27", "47 + 28", "136 + 7"]) {
      const wanted = mathFeatureOfTask(parseMentalMathTask(source)!)!;
      expect(wanted.bridge).toBe(true);
      for (let seed = 1; seed <= 10; seed += 1) {
        const round = buildMathReviewRound(
          [review(source)],
          seededRandom(seed),
          false,
        );
        expect(round.length).toBeGreaterThan(0);
        for (const variant of round) {
          expect(
            mathFeatureOfTask(variant),
            `${source} → ${variant.source}`,
          ).toEqual(wanted);
        }
      }
    }
  });

  it("hält ohne Übergang die Aufgaben ohne Übergang", () => {
    const wanted = mathFeatureOfTask(parseMentalMathTask("53 + 24")!)!;
    expect(wanted.bridge).toBe(false);
    const round = buildMathReviewRound(
      [review("53 + 24")],
      seededRandom(2),
      false,
    );
    for (const variant of round)
      expect(mathFeatureOfTask(variant)).toEqual(wanted);
  });

  it("behält die Lücke und die Reihe bei Mal und Geteilt", () => {
    const gap = parseMentalMathTask("47 + 8", 0, "right")!;
    const round = buildMathReviewRound(
      [{ ...review("47 + 8"), task: gap, options: optionsForMathTask(gap) }],
      seededRandom(3),
      false,
    );
    expect(round.every((task) => task.gap === "right")).toBe(true);
    expect(round.every((task) => mathFeatureOfTask(task)?.bridge)).toBe(true);
    const times = buildMathReviewRound(
      [review("7 * 8")],
      seededRandom(3),
      false,
    );
    expect(times.every((task) => task.operation === "multiply")).toBe(true);
    expect(times.every((task) => mathFeatureOfTask(task) === null)).toBe(true);
  });

  it("fällt ohne passende Aufgaben auf den Zahlenraum zurück", () => {
    // Im Raum bis 20 gibt es kein „ZE+ZE“ mit zwei Zahlen über 10 und Summe ≤ 20 und Übergang.
    const round = buildMathReviewRound(
      [review("14 + 6")],
      seededRandom(1),
      false,
    );
    expect(round.length).toBeGreaterThan(0);
  });
});

describe("Familie mit Merkmal (MA-1)", () => {
  it("lässt den bisherigen Schlüssel unverändert", () => {
    const task = parseMentalMathTask("47 + 8")!;
    const item = { task, options: optionsForMathTask(task) };
    expect(mathFamilyKey(item)).toBe("add:normal:bis-100");
    expect(mathFamilyKeyWithFeature(item)).toBe(
      "add:normal:bis-100:uebergang:ZE+E",
    );
    const noBridge = parseMentalMathTask("53 + 24")!;
    expect(
      mathFamilyKeyWithFeature({
        task: noBridge,
        options: optionsForMathTask(noBridge),
      }),
    ).toBe("add:normal:bis-100:ohne-uebergang:ZE+ZE");
  });

  it("hängt bei Mal, Geteilt und gemischten Ausdrücken nichts an", () => {
    for (const source of ["7 * 8", "56 : 7", "(2 + 3) * 4"]) {
      const task = parseMentalMathTask(source)!;
      const item = { task, options: optionsForMathTask(task) };
      expect(mathFamilyKeyWithFeature(item)).toBe(mathFamilyKey(item));
    }
  });
});
