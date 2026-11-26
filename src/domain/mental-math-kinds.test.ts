import { describe, expect, it } from "vitest";
import { mathFamilyLabel } from "./competence-profile";
import {
  buildMathReviewRound,
  mathFamilyKey,
  mathFamilyKeyWithFeature,
  mathOptionsSchema,
  mathTaskSchema,
  optionsForMathTask,
  type MathReview,
} from "./math-practice";
import {
  checkMentalMathAnswer,
  parseMentalMathExpression,
  stripAnswerUnit,
  type MentalMathTask,
} from "./mental-math";
import {
  classifyMentalMathError,
  mentalMathHint,
  mentalMathSolutionSteps,
} from "./mental-math-feedback";
import {
  MATH_KINDS,
  generateMathKindTasks,
  generateMathTasks,
  groupedNumber,
  mathKindHint,
  roundToPlace,
  type MathKindId,
} from "./mental-math-kinds";

/** Fester Zufall (linearer Kongruenzgenerator), damit jede Runde reproduzierbar ist. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function tasksOf(kind: MathKindId, count = 60, seed = 7) {
  return generateMathKindTasks({ kinds: [kind], count }, seeded(seed));
}

describe("Zehnereinmaleins", () => {
  it("hat immer einen Faktor, der ein Vielfaches von 10 oder 100 ist", () => {
    for (const task of tasksOf("tens")) {
      const parts = parseMentalMathExpression(task.source)!;
      expect(task.kind).toBe("tens");
      expect(["multiply", "divide"]).toContain(task.operation);
      if (parts.operator === "*") {
        expect(
          [parts.left, parts.right].some((value) => value % 10 === 0),
        ).toBe(true);
      } else {
        expect(parts.result % 10).toBe(0);
        expect(parts.left % parts.right).toBe(0);
      }
      expect(task.answer).toBe(parts.result);
    }
  });

  it("stellt Mal- und Geteilt-Aufgaben", () => {
    const prompts = tasksOf("tens", 80).map((task) => task.prompt);
    expect(prompts.some((prompt) => prompt.includes(" · "))).toBe(true);
    expect(prompts.some((prompt) => prompt.includes(" : "))).toBe(true);
  });

  it("zeigt im Lösungsweg die Nullen, aber nie das Ergebnis", () => {
    const task: MentalMathTask = {
      id: "t",
      prompt: "30 · 4",
      source: "30 · 4",
      answer: 120,
      operation: "multiply",
      kind: "tens",
      skillId: "math:tens:multiply",
    };
    const steps = mentalMathSolutionSteps(task);
    expect(steps[0]).toBe("Rechne ohne die Null: 3 · 4 = 12.");
    expect(steps.join(" ")).not.toContain("120");
    const divide = mentalMathSolutionSteps({
      ...task,
      prompt: "560 : 8",
      source: "560 : 8",
      answer: 70,
      operation: "divide",
    });
    expect(divide[0]).toBe("Lass die Null weg: 56 : 8 = 7.");
    expect(divide.join(" ")).not.toContain("70");
  });
});

describe("Große Zahlen", () => {
  it("rechnet mit vollen Hundertern und bleibt im Positiven", () => {
    for (const task of tasksOf("big")) {
      const parts = parseMentalMathExpression(task.source)!;
      expect(parts.left % 100).toBe(0);
      expect(parts.right % 100).toBe(0);
      expect(Math.min(parts.left, parts.right)).toBeGreaterThanOrEqual(1000);
      expect(task.answer).toBeGreaterThan(0);
      expect(["add", "subtract"]).toContain(task.operation);
    }
  });

  it("zeigt Zahlen ab 1000 mit Tausenderleerzeichen", () => {
    expect(groupedNumber(3400)).toBe("3 400");
    expect(groupedNumber(12000)).toBe("12 000");
    expect(groupedNumber(950)).toBe("950");
    expect(tasksOf("big", 1)[0]!.prompt).toMatch(/\d\u00a0\d{3}/);
  });

  it("nimmt die Antwort mit und ohne Tausendertrenner", () => {
    const task = tasksOf("big", 1)[0]!;
    const plain = String(task.answer);
    const spaced = plain.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    const dotted = plain.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    expect(checkMentalMathAnswer(task, plain)).toBe(true);
    expect(checkMentalMathAnswer(task, spaced)).toBe(true);
    expect(checkMentalMathAnswer(task, dotted)).toBe(true);
    expect(checkMentalMathAnswer(task, `${plain}0`)).toBe(false);
  });
});

describe("Runden", () => {
  it("rundet ab 5 auf und liegt nie schon auf der Stelle", () => {
    expect(roundToPlace(4678, 100)).toBe(4700);
    expect(roundToPlace(4650, 100)).toBe(4700);
    expect(roundToPlace(4649, 100)).toBe(4600);
    expect(roundToPlace(15, 10)).toBe(20);
    for (const task of tasksOf("round")) {
      expect(task.prompt).toMatch(
        /^Runde .+ auf (Zehner|Hunderter|Tausender)$/,
      );
      const [, number, place] = task.source.match(/^Runde (\d+) auf (\S+)$/)!;
      const step = { Zehner: 10, Hunderter: 100, Tausender: 1000 }[place!]!;
      expect(Number(number) % step).not.toBe(0);
      expect(task.answer).toBe(roundToPlace(Number(number), step));
    }
  });

  it("gibt Tipp und Lösungsweg ohne das Ergebnis", () => {
    const task: MentalMathTask = {
      id: "r",
      prompt: "Runde 4 678 auf Hunderter",
      source: "Runde 4678 auf Hunderter",
      answer: 4700,
      operation: "mixed-expression",
      kind: "round",
      skillId: "math:round:hunderter",
    };
    const steps = mentalMathSolutionSteps(task);
    expect(steps[0]).toContain("Hunderter");
    expect(steps[0]).toContain(": 7.");
    expect(steps.join(" ")).not.toContain("4700");
    expect(classifyMentalMathError(task, "470")).toBe("place-value");
    expect(mentalMathHint(task, "place-value")).toBe(mathKindHint(task));
    expect(classifyMentalMathError(task, "4600")).toBe("unknown");
  });
});

describe("Komma und Geld", () => {
  it("liefert Geldaufgaben mit zwei Nachkommastellen und Eurozeichen", () => {
    const tasks = tasksOf("decimal", 80);
    const money = tasks.filter((task) => task.prompt.includes("€"));
    expect(money.length).toBeGreaterThan(10);
    expect(tasks.length - money.length).toBeGreaterThan(10);
    for (const task of money)
      expect(task.prompt).toMatch(/^\d+,\d{2} € [+−] \d+,\d{2} €$/);
    for (const task of tasks) {
      const parts = parseMentalMathExpression(task.source)!;
      expect(task.answer).toBeGreaterThan(0);
      expect(task.answer).toBeCloseTo(parts.result, 9);
    }
  });

  it("nimmt Komma oder Punkt, mit und ohne Eurozeichen", () => {
    const task: MentalMathTask = {
      id: "d",
      prompt: "2,50 € + 1,75 €",
      source: "2,5 + 1,75",
      answer: 4.25,
      operation: "add",
      kind: "decimal",
      skillId: "math:decimal:money",
    };
    for (const input of ["4,25", "4.25", "4,25 €", "4,25€", "4.25 Euro"])
      expect(checkMentalMathAnswer(task, input)).toBe(true);
    for (const input of ["425", "4,2", "4,25 cm", "4,26"])
      expect(checkMentalMathAnswer(task, input)).toBe(false);
  });

  it("erkennt das verrutschte Komma wie bei normalen Aufgaben", () => {
    const task: MentalMathTask = {
      id: "d",
      prompt: "0,5 + 0,25",
      source: "0,5 + 0,25",
      answer: 0.75,
      operation: "add",
      kind: "decimal",
      skillId: "math:decimal:plain",
    };
    expect(classifyMentalMathError(task, "7,5")).toBe("decimal-point");
    expect(mentalMathSolutionSteps(task)[0]).toBe(
      "Rechne ohne Komma: 50 + 25.",
    );
  });
});

describe("Größen umrechnen", () => {
  it("rechnet die Einheiten richtig um", () => {
    const factors: Record<string, number> = {
      "m-cm": 100,
      "kg-g": 1000,
      "h-min": 60,
    };
    for (const task of tasksOf("units", 120)) {
      const [, amount, from, to] = task.source.match(
        /^(\S+) (\S+) = _ (\S+)$/,
      )!;
      const value = Number(amount!.replace(",", "."));
      const forward = factors[`${from}-${to}`];
      const backward = factors[`${to}-${from}`];
      expect(task.answer).toBeCloseTo(
        forward ? value * forward : value / backward!,
        9,
      );
      expect(task.prompt).toMatch(/ = _ (cm|m|g|kg|min|h)$/);
    }
  });

  it("stellt 90 min = _ h eindeutig mit der Antwort 1,5", () => {
    const task = tasksOf("units", 400).find((entry) =>
      entry.source.startsWith("90 min"),
    )!;
    expect(task.answer).toBe(1.5);
    expect(checkMentalMathAnswer(task, "1,5")).toBe(true);
    expect(checkMentalMathAnswer(task, "1,5 h")).toBe(true);
    expect(checkMentalMathAnswer(task, "1,5 min")).toBe(false);
    expect(checkMentalMathAnswer(task, "90")).toBe(false);
  });

  it("nimmt nur die erwartete Einheit hinter der Antwort", () => {
    const task = { prompt: "3 m = _ cm", kind: "units" };
    expect(stripAnswerUnit(task, "300 cm")).toBe("300");
    expect(stripAnswerUnit(task, "300cm")).toBe("300");
    expect(stripAnswerUnit(task, "300 m")).toBe("300 m");
    expect(stripAnswerUnit({ prompt: "3 + 4" }, "7 cm")).toBe("7 cm");
  });

  it("gibt Tipp und Lösungsweg ohne das Ergebnis", () => {
    const task: MentalMathTask = {
      id: "u",
      prompt: "3 m = _ cm",
      source: "3 m = _ cm",
      answer: 300,
      operation: "mixed-expression",
      kind: "units",
      skillId: "math:units:m-cm",
    };
    const steps = mentalMathSolutionSteps(task);
    expect(steps[0]).toBe("1 m = 100 cm.");
    expect(steps.join(" ")).not.toContain("300");
    expect(classifyMentalMathError(task, "30")).toBe("place-value");
    expect(classifyMentalMathError(task, "30 m")).toBe("unknown");
    expect(mentalMathHint(task, "place-value")).toContain("cm");
  });
});

describe("Runde mit mehreren Arten", () => {
  it("ist mit festem Zufall reproduzierbar und enthält jede gewählte Art", () => {
    const first = generateMathKindTasks(
      { kinds: [...MATH_KINDS], count: 10 },
      seeded(3),
    );
    const second = generateMathKindTasks(
      { kinds: [...MATH_KINDS], count: 10 },
      seeded(3),
    );
    expect(second).toEqual(first);
    expect(first).toHaveLength(10);
    expect(new Set(first.map((task) => task.kind))).toEqual(
      new Set(MATH_KINDS),
    );
  });

  it("stellt nur die gewählten Arten", () => {
    const tasks = generateMathKindTasks(
      { kinds: ["round", "units"], count: 20 },
      seeded(5),
    );
    expect(new Set(tasks.map((task) => task.kind))).toEqual(
      new Set(["round", "units"]),
    );
  });

  it("fällt ohne Arten auf die normalen Aufgaben zurück", () => {
    const tasks = generateMathTasks(
      { operations: ["add"], maxValue: 20, count: 5, kinds: [] },
      seeded(1),
    );
    expect(tasks).toHaveLength(5);
    expect(tasks.every((task) => task.kind === undefined)).toBe(true);
  });

  it("gibt verschiedene Aufgaben in einer Runde, wo es genug gibt", () => {
    const tasks = tasksOf("round", 30);
    expect(new Set(tasks.map((task) => task.source)).size).toBe(30);
  });
});

describe("Speicherformat und Familien", () => {
  it("bleibt abwärtskompatibel: alte Aufgaben und Einstellungen ohne Art", () => {
    expect(
      mathTaskSchema.safeParse({
        id: "a",
        prompt: "7 + 8",
        source: "7 + 8",
        answer: 15,
        skillId: "math:add:range",
        operation: "add",
      }).success,
    ).toBe(true);
    expect(
      mathOptionsSchema.safeParse({
        operations: ["add"],
        maxValue: 20,
        count: 5,
      }).success,
    ).toBe(true);
  });

  it("lässt jede erzeugte Aufgabe samt Einstellung speichern", () => {
    for (const kind of MATH_KINDS) {
      const task = tasksOf(kind, 1)[0]!;
      expect(mathTaskSchema.safeParse(task).success).toBe(true);
      const options = optionsForMathTask(task);
      expect(mathOptionsSchema.safeParse(options).success).toBe(true);
      expect(options.kinds).toEqual([kind]);
    }
  });

  it("bildet eine Familie je Art mit Wörtern für Kinder", () => {
    const families = MATH_KINDS.map((kind) => {
      const task = tasksOf(kind, 1)[0]!;
      const review = { task, options: optionsForMathTask(task) };
      expect(mathFamilyKeyWithFeature(review)).toBe(mathFamilyKey(review));
      return mathFamilyKey(review);
    });
    expect(new Set(families).size).toBe(5);
    expect(families.map(mathFamilyLabel)).toEqual([
      "Mal mit Zehnern",
      "Große Zahlen",
      "Runden",
      "Geld und Komma",
      "Größen umrechnen",
    ]);
  });

  it("gruppiert zwei Aufgaben derselben Art in eine Familie", () => {
    const [first, second] = tasksOf("big", 2);
    const key = (task: MentalMathTask) =>
      mathFamilyKey({ task, options: optionsForMathTask(task) });
    expect(key(first!)).toBe(key(second!));
  });
});

describe("Fehlerübung", () => {
  function review(task: MentalMathTask): MathReview {
    return {
      id: `obj-${task.id}`,
      task,
      options: optionsForMathTask(task),
      dueAt: "2026-11-25T08:00:00.000Z",
      step: 0,
      mastered: false,
      errors: 1,
      lastRound: "round-1",
    };
  }

  it("erzeugt für jede Art neue Aufgaben derselben Art", () => {
    for (const kind of MATH_KINDS) {
      const task = tasksOf(kind, 1, 11)[0]!;
      const round = buildMathReviewRound([review(task)], seeded(2));
      expect(round[0]!.source).toBe(task.source);
      const variants = round.slice(1);
      expect(variants.length).toBeGreaterThan(0);
      expect(variants.every((entry) => entry.kind === kind)).toBe(true);
      expect(variants.every((entry) => entry.source !== task.source)).toBe(
        true,
      );
    }
  });
});
