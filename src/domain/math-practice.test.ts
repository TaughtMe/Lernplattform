import { describe, expect, it } from "vitest";
import {
  buildMathReviewRound,
  MATH_REVIEW_DAYS,
  mathFamilyKey,
  mathOptionsSchema,
  mathReviews,
  mathRoundReviews,
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
    step: 0,
    mastered: false,
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

  it("liest die Lösung der Lehrkraft streng und vergleicht ohne Toleranz (M-2)", () => {
    // Tausenderpunkt und -leerzeichen in der Lösung gelten wie bei Kindern.
    for (const answer of ["1.000", "1 000", "1000"]) {
      expect(mathTaskFromPrompt("500 + 500", answer)).toMatchObject({
        answer: 1000,
        operation: "add",
      });
    }
    expect(mathTaskFromPrompt("_ + 500 = 1500", "1.000")).toMatchObject({
      answer: 1000,
      operation: "add",
      gap: "left",
    });
    // Kommafehler: 0,001 ist nicht 0,1 · 0,1; die Lösung der Lehrkraft bleibt erhalten.
    expect(mathTaskFromPrompt("0,1 * 0,1", "0,01")).toMatchObject({
      answer: 0.01,
      operation: "multiply",
    });
    expect(mathTaskFromPrompt("0,1 * 0,1", "0,001")).toMatchObject({
      answer: 0.001,
      operation: "mixed-expression",
    });
    expect(mathTaskFromPrompt("1 + 2", "−3")).toMatchObject({ answer: -3 });
    for (const answer of ["1e1", "0x10", "1.00.0", "5,", "1/3"])
      expect(mathTaskFromPrompt("1 + 2", answer)).toBeNull();
  });

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
      errors: 2,
      step: 0,
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
    expect(mathReviews(events)[0]).toMatchObject({ step: 0, errors: 3 });
    // Saubere Antworten in derselben Runde sind nur Übung, kein Aufstieg.
    for (const minute of [3, 4])
      events.push(
        await createMathAttempt({
          ...base,
          attemptId: String(minute),
          answer: "56",
          now: `2026-09-18T10:0${minute}:00.000Z`,
        }),
      );
    expect(mathReviews(events)[0]).toMatchObject({
      step: 0,
      dueAt: "2026-09-18T10:02:00.000Z",
    });
    // Erst die saubere Antwort in einer neuen Runde hebt auf Stufe 1 (1 Tag).
    events.push(
      await createMathAttempt({
        ...base,
        roundId: "tomorrow",
        attemptId: "1",
        answer: "56",
        now: "2026-09-19T11:00:00.000Z",
      }),
    );
    expect(mathReviews(events)[0]).toMatchObject({
      step: 1,
      dueAt: "2026-09-20T11:00:00.000Z",
    });
    expect(mathReviews([...events].reverse())).toEqual(mathReviews(events));
  });

  describe("mathReviews: Wiederholungsregel", () => {
    const answer = (
      id: string,
      at: string,
      options: {
        round?: string;
        answer?: string;
        help?: boolean;
        corrected?: boolean;
        task?: typeof task;
      } = {},
    ) =>
      createMathAttempt({
        task: options.task ?? task,
        roundId: options.round ?? `round-${id}`,
        attemptId: id,
        answer: options.answer ?? "56",
        selfCorrected: options.corrected ?? false,
        usedHelp: options.help ?? false,
        now: at,
      });

    it("legt bei sauberer erster Antwort keinen Posten an", async () => {
      expect(
        mathReviews([await answer("1", "2026-09-18T10:00:00.000Z")]),
      ).toEqual([]);
    });

    it("macht Fehler, Hilfe und Selbstkorrektur sofort fällig", async () => {
      for (const options of [
        { answer: "54" },
        { help: true },
        { corrected: true },
      ]) {
        const [entry, ...rest] = mathReviews([
          await answer("1", "2026-09-18T10:00:00.000Z", options),
        ]);
        expect(rest).toEqual([]);
        expect(entry).toMatchObject({
          step: 0,
          mastered: false,
          errors: 1,
          dueAt: "2026-09-18T10:00:00.000Z",
        });
      }
    });

    it("hebt zu frühes Üben nicht an (vor dem Fälligkeitszeitpunkt)", async () => {
      const events = [
        await answer("1", "2026-09-18T10:00:00.000Z", { answer: "54" }),
        await answer("2", "2026-09-19T10:00:00.000Z"),
      ];
      const [entry] = mathReviews(events);
      expect(entry).toMatchObject({
        step: 1,
        dueAt: "2026-09-20T10:00:00.000Z",
      });
      // Einen Tag zu früh: keine neue Stufe, Fälligkeit unverändert.
      events.push(await answer("3", "2026-09-19T20:00:00.000Z"));
      expect(mathReviews(events)[0]).toMatchObject({
        step: 1,
        dueAt: "2026-09-20T10:00:00.000Z",
      });
    });

    it("zählt zweimal sauber in derselben Runde als höchstens einen Aufstieg", async () => {
      const events = [
        await answer("1", "2026-09-18T10:00:00.000Z", { answer: "54" }),
        await answer("2", "2026-09-19T10:00:00.000Z", { round: "neu" }),
        await answer("3", "2026-09-21T10:00:00.000Z", { round: "neu" }),
      ];
      expect(mathReviews(events)[0]).toMatchObject({ step: 1 });
      // Ab der Fälligkeit, aber in derselben Runde wie die letzte Antwort.
      expect(
        mathReviews([
          ...events,
          await answer("4", "2026-09-22T10:00:00.000Z", { round: "neu" }),
        ])[0],
      ).toMatchObject({ step: 1 });
    });

    it("durchläuft die Stufen 1/3/7/14 und festigt danach", async () => {
      expect(MATH_REVIEW_DAYS).toEqual([1, 3, 7, 14]);
      const events = [
        await answer("0", "2026-09-01T10:00:00.000Z", { answer: "54" }),
      ];
      let at = Date.parse("2026-09-01T10:00:00.000Z");
      for (const [index, days] of MATH_REVIEW_DAYS.entries()) {
        at += index === 0 ? 3_600_000 : 0;
        events.push(await answer(`s${index}`, new Date(at).toISOString()));
        at += days * 86_400_000;
        expect(mathReviews(events)[0]).toMatchObject({
          step: index + 1,
          mastered: false,
          dueAt: new Date(at).toISOString(),
        });
      }
      events.push(await answer("fertig", new Date(at).toISOString()));
      expect(mathReviews(events)).toEqual([]);
      // Weitere saubere Antworten halten den Posten gefestigt.
      events.push(
        await answer("noch", new Date(at + 86_400_000).toISOString()),
      );
      expect(mathReviews(events)).toEqual([]);
    });

    it("macht einen gefestigten Posten nach einem neuen Fehler wieder fällig", async () => {
      const events = [
        await answer("0", "2026-09-01T10:00:00.000Z", { answer: "54" }),
      ];
      let at = Date.parse("2026-09-01T11:00:00.000Z");
      for (const [index, days] of [0, ...MATH_REVIEW_DAYS].entries()) {
        at += days * 86_400_000;
        events.push(await answer(`s${index}`, new Date(at).toISOString()));
      }
      expect(mathReviews(events)).toEqual([]);
      events.push(
        await answer("rueckfall", "2027-01-01T10:00:00.000Z", {
          answer: "12",
        }),
      );
      expect(mathReviews(events)[0]).toMatchObject({
        step: 0,
        mastered: false,
        errors: 2,
        dueAt: "2027-01-01T10:00:00.000Z",
      });
    });

    it("sortiert nach Fälligkeit und ignoriert Ereignisse ohne Mathedaten", async () => {
      const later = await answer("1", "2026-09-18T12:00:00.000Z", {
        answer: "1",
      });
      const earlier = await answer("2", "2026-09-18T09:00:00.000Z", {
        answer: "1",
        task: parseMentalMathTask("6 * 8")!,
      });
      const { math: _math, ...withoutMath } = later;
      void _math;
      const result = mathReviews([
        later,
        earlier,
        { ...withoutMath, id: "ohne-mathe" },
      ]);
      expect(result.map((item) => item.dueAt)).toEqual([
        earlier.occurredAt,
        later.occurredAt,
      ]);
    });

    it("spielt eine bestehende Historie im alten Format korrekt ab", async () => {
      // Historie wie vor der Regeländerung: je Aufgabe mehrere Antworten,
      // erzeugt von createMathAttempt (7*8 sauber, 6*8 mit Fehler und
      // Selbstkorrektur, 9*9 dreimal sauber in Folge).
      const six = parseMentalMathTask("6 * 8")!;
      const nine = parseMentalMathTask("9 * 9")!;
      const history = [
        await answer("a1", "2026-09-10T09:00:00.000Z", { round: "r1" }),
        await answer("a2", "2026-09-10T09:01:00.000Z", {
          round: "r1",
          task: six,
          answer: "46",
        }),
        await answer("a3", "2026-09-10T09:01:30.000Z", {
          round: "r1",
          task: six,
          answer: "48",
          corrected: true,
        }),
        await answer("a4", "2026-09-10T09:02:00.000Z", {
          round: "r1",
          task: nine,
          answer: "81",
        }),
        await answer("a5", "2026-09-11T09:00:00.000Z", {
          round: "r2",
          task: nine,
          answer: "81",
        }),
        await answer("a6", "2026-09-14T09:00:00.000Z", {
          round: "r3",
          task: nine,
          answer: "81",
        }),
        await answer("a7", "2026-09-12T09:00:00.000Z", {
          round: "r2",
          task: six,
          answer: "48",
        }),
      ];
      const result = mathReviews(history);
      // 7*8 und 9*9 (nie falsch) erzeugen keine Posten mehr, nur 6*8.
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        task: { source: six.source },
        errors: 2,
        step: 1,
        mastered: false,
        dueAt: "2026-09-13T09:00:00.000Z",
      });
      expect(mathReviews([...history].reverse())).toEqual(result);
    });
  });

  describe("mathRoundReviews", () => {
    it("liefert alle Aufgaben einer Runde, auch saubere, und zählt Fehler", async () => {
      const six = parseMentalMathTask("6 * 8")!;
      const events = [
        await createMathAttempt({
          task,
          roundId: "raum",
          attemptId: "1",
          answer: "56",
          selfCorrected: false,
          usedHelp: false,
          now: "2026-09-18T10:00:00.000Z",
        }),
        await createMathAttempt({
          task: six,
          roundId: "raum",
          attemptId: "2",
          answer: "1",
          selfCorrected: false,
          usedHelp: false,
          now: "2026-09-18T10:01:00.000Z",
        }),
        await createMathAttempt({
          task: six,
          roundId: "raum",
          attemptId: "3",
          answer: "48",
          selfCorrected: true,
          usedHelp: false,
          now: "2026-09-18T10:02:00.000Z",
        }),
      ];
      const result = mathRoundReviews(events);
      expect(result.map((item) => item.errors)).toEqual([0, 2]);
      expect(result.every((item) => item.step === 0 && !item.mastered)).toBe(
        true,
      );
      expect(mathRoundReviews(events.slice(0, 1))).toHaveLength(1);
      expect(mathRoundReviews([])).toEqual([]);
    });
  });

  describe("mathFamilyKey", () => {
    const key = (source: string, options?: Partial<MathReview["options"]>) => {
      const entry = review(source);
      return mathFamilyKey({
        task: entry.task,
        options: { ...entry.options, ...options },
      });
    };

    it("bildet für ×-Aufgaben die Einmaleinsreihe", () => {
      expect(key("7 * 8")).toBe("multiply:normal:reihe-7");
      expect(key("7 * 4")).toBe("multiply:normal:reihe-4");
      expect(key("7 * 8", { multiplicationTables: [8] })).toBe(
        "multiply:normal:reihe-8",
      );
      expect(key("7 * 8", { multiplicationTables: [3, 7, 8] })).toBe(
        "multiply:normal:reihe-7",
      );
    });

    it("bildet für ÷-Aufgaben die Reihe des Divisors", () => {
      expect(key("56 : 7")).toBe("divide:normal:reihe-7");
      expect(key("56 : 7", { multiplicationTables: [8, 7] })).toBe(
        "divide:normal:reihe-7",
      );
    });

    it("trennt Lückenaufgaben von normalen", () => {
      const gap = parseMentalMathTask("7 + 5", 0, "right")!;
      expect(
        mathFamilyKey({ task: gap, options: optionsForMathTask(gap) }),
      ).toBe("add:right:bis-20");
      expect(key("7 + 5")).toBe("add:normal:bis-20");
    });

    it("stuft + und − nach dem Zahlenraum", () => {
      expect(key("7 + 5", { maxValue: 20 })).toBe("add:normal:bis-20");
      expect(key("70 + 5", { maxValue: 100 })).toBe("add:normal:bis-100");
      expect(key("700 - 5", { maxValue: 1000 })).toBe(
        "subtract:normal:bis-1000",
      );
      expect(key("700 - 5", { maxValue: 5000 })).toBe(
        "subtract:normal:darueber",
      );
    });

    it("fällt bei ×/÷ ohne Reihe auf den Zahlenraum zurück", () => {
      const entry = review("7 * 8");
      expect(
        mathFamilyKey({
          task: { ...entry.task, source: "7 * 8 * 2" },
          options: { ...entry.options, multiplicationTables: undefined },
        }),
      ).toBe("multiply:normal:bis-100");
    });

    it("fasst gemischte Ausdrücke zusammen", () => {
      expect(key("2^3")).toBe("mixed-expression");
      expect(
        mathFamilyKey({
          task: mathTaskFromPrompt("6 + _ - 2", "4")!,
          options: optionsForMathTask(mathTaskFromPrompt("6 + _ - 2", "4")!),
        }),
      ).toBe("mixed-expression");
    });
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
      reviews.find((item) => item.id === second.learningObjectId)!.step,
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
