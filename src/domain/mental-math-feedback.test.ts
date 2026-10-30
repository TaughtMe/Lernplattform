import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  classifyMentalMathError,
  mentalMathHint,
  mentalMathSolutionSteps,
  type MentalMathErrorKind,
} from "./mental-math-feedback";
import { parseMentalMathTask, type MathGapSlot } from "./mental-math";

function task(source: string, gap?: MathGapSlot) {
  const parsed = parseMentalMathTask(source, 0, gap);
  if (!parsed) throw new Error(`Aufgabe nicht lesbar: ${source}`);
  return parsed;
}

/** Testkatalog (Erfolgskriterium D-008): je Fehlerart drei Beispiele. */
const catalogue: Record<
  MentalMathErrorKind,
  [source: string, given: string, gap?: MathGapSlot][]
> = {
  "tens-bridge": [
    ["47 + 8", "45"],
    ["56 + 7", "73"],
    ["62 - 5", "47"],
  ],
  "digit-swap": [
    ["20 + 25", "54"],
    ["60 + 14", "47"],
    ["92 - 14", "87"],
  ],
  "operation-mix": [
    ["14 + 3", "11"],
    ["9 - 4", "13"],
    ["6 * 7", "13"],
  ],
  "off-by-one": [
    ["13 + 5", "19"],
    ["30 - 8", "21"],
    ["72 : 9", "9"],
  ],
  "neighbor-fact": [
    ["7 * 8", "49"],
    ["6 * 9", "48"],
    ["8 * 4", "36"],
  ],
  "place-value": [
    ["5 * 4", "200"],
    ["30 + 20", "5"],
    ["900 : 3", "30"],
  ],
  "decimal-point": [
    ["0,5 + 0,7", "12"],
    ["1,5 * 4", "0,6"],
    ["2,5 + 2,5", "0,5"],
  ],
  sign: [
    ["3 - 8", "5"],
    ["12 - 20", "8"],
    ["6 - 9", "3"],
  ],
  unknown: [
    ["7 * 8", "100"],
    ["34 + 19", "abc"],
    ["45 : 5", "2"],
  ],
};

describe("classifyMentalMathError", () => {
  for (const [kind, examples] of Object.entries(catalogue))
    for (const [source, given, gap] of examples)
      it(`erkennt ${kind}: ${source} mit Antwort ${given}`, () => {
        expect(classifyMentalMathError(task(source, gap), given)).toBe(kind);
      });

  it("erkennt Lückenaufgaben: Umkehraufgabe verwechselt", () => {
    // _ + 5 = 12: Wer 12 + 5 rechnet, nimmt die falsche Richtung.
    expect(classifyMentalMathError(task("7 + 5", "left"), "17")).toBe(
      "operation-mix",
    );
  });

  it("lässt richtige Antworten und Antwort null ohne Faktorfehler", () => {
    expect(classifyMentalMathError(task("0,5 + 0,7"), "1,2")).toBe("unknown");
    expect(classifyMentalMathError(task("5 - 5"), "0")).toBe("unknown");
    expect(classifyMentalMathError(task("5 - 5"), "7")).toBe("unknown");
  });
});

describe("mentalMathHint", () => {
  const forbidden = ["Zahlendreher", "Fehler", "Zählfehler", "falsch"];

  it("nennt dem Kind nur Strategien, nie die Fehlerart", () => {
    for (const [kind, examples] of Object.entries(catalogue))
      for (const [source, , gap] of examples) {
        const hint = mentalMathHint(
          task(source, gap),
          kind as MentalMathErrorKind,
        );
        expect(hint.length).toBeGreaterThan(10);
        for (const word of forbidden) expect(hint).not.toContain(word);
      }
  });

  it("verrät das Ergebnis nicht", () => {
    for (const [kind, examples] of Object.entries(catalogue))
      for (const [source, , gap] of examples) {
        const t = task(source, gap);
        const hint = mentalMathHint(t, kind as MentalMathErrorKind);
        const numbers = hint.replace(/,/g, ".").match(/\d+(?:\.\d+)?/g) ?? [];
        // Die Lösung darf nur vorkommen, wenn sie auch in der Aufgabe steht.
        const shown = source.replace(/,/g, ".").match(/\d+(?:\.\d+)?/g) ?? [];
        for (const number of numbers)
          if (Number(number) === t.answer) expect(shown).toContain(number);
      }
  });

  it("gibt die vorgesehenen Strategien aus", () => {
    expect(mentalMathHint(task("20 + 25"), "digit-swap")).toBe(
      "Schau auf die Reihenfolge der Ziffern: Zehner zuerst, dann Einer.",
    );
    expect(mentalMathHint(task("47 + 8"), "tens-bridge")).toBe(
      "Zerlege am Zehner: 47 + 8 = 47 + 3 + 5.",
    );
    expect(mentalMathHint(task("62 - 5"), "tens-bridge")).toBe(
      "Zerlege am Zehner: 62 − 5 = 62 − 2 − 3.",
    );
    expect(mentalMathHint(task("7 * 8"), "neighbor-fact")).toBe(
      "Nutze die Nachbaraufgabe: 7 · 8 = 7 · 7 + 7.",
    );
    expect(mentalMathHint(task("56 : 8"), "unknown")).toBe(
      "Umkehraufgabe: 56 : 8 = ?, weil ? · 8 = 56.",
    );
    expect(mentalMathHint(task("6 * 7", "result"), "operation-mix")).toContain(
      "Probe",
    );
  });

  it("fällt bei Plus und Minus ohne Übergang auf kleine Schritte zurück", () => {
    expect(mentalMathHint(task("12 + 5"), "unknown")).toContain("Zehner");
  });
});

describe("mentalMathSolutionSteps", () => {
  const cases: [string, MathGapSlot | undefined, string[]][] = [
    [
      "47 + 8",
      undefined,
      [
        "47 + 3 = 50 (bis zum vollen Zehner).",
        "Von der 8 bleiben 5 übrig.",
        "Jetzt rechnest du zu Ende: 50 + 5.",
      ],
    ],
    [
      "47 + 28",
      undefined,
      ["47 + 20 = 67.", "Jetzt rechnest du zu Ende: 67 + 8."],
    ],
    [
      "62 - 5",
      undefined,
      [
        "62 − 2 = 60 (bis zum vollen Zehner).",
        "Von der 5 bleiben 3 übrig.",
        "Jetzt rechnest du zu Ende: 60 − 3.",
      ],
    ],
    [
      "347 + 285",
      undefined,
      [
        "347 + 200 = 547.",
        "547 + 80 = 627.",
        "Jetzt rechnest du zu Ende: 627 + 5.",
      ],
    ],
    [
      "3 - 8",
      undefined,
      [
        "Rechne andersherum: 8 − 3.",
        "Du nimmst mehr weg, als da ist. Darum kommt ein Minus davor.",
        "Jetzt rechnest du zu Ende.",
      ],
    ],
    [
      "0,5 + 0,7",
      undefined,
      [
        "Rechne ohne Komma: 5 + 7.",
        "Setze das Komma wieder: Es hat so viele Stellen wie in der Aufgabe.",
        "Jetzt rechnest du zu Ende.",
      ],
    ],
    [
      "7 * 8",
      undefined,
      [
        "Kernaufgabe: 5 · 7 = 35.",
        "Dazu kommt: 3 · 7 = 21.",
        "Jetzt rechnest du zu Ende: 35 + 21.",
      ],
    ],
    [
      "9 * 6",
      undefined,
      [
        "Rechne mit 10: 10 · 6 = 60.",
        "Ein 6er ist zu viel.",
        "Jetzt rechnest du zu Ende: 60 − 6.",
      ],
    ],
    [
      "3 * 4",
      undefined,
      ["Zähle in 4er-Schritten, 3 Mal: 4, 8, …", "Jetzt rechnest du zu Ende."],
    ],
    [
      "7 * 10",
      undefined,
      ["Mal 10 heißt: eine Null anhängen.", "Jetzt rechnest du zu Ende."],
    ],
    [
      "12 * 5",
      undefined,
      [
        "Zerlege 12 in 10 und 2.",
        "10 · 5 = 50 und 2 · 5 = 10.",
        "Jetzt rechnest du zu Ende: 50 + 10.",
      ],
    ],
    [
      "56 : 8",
      undefined,
      [
        "Umkehraufgabe: 56 : 8 = ?, weil ? · 8 = 56.",
        "Geh in der 8er-Reihe weiter, bis du bei 56 bist.",
        "Jetzt rechnest du zu Ende.",
      ],
    ],
    [
      "144 : 12",
      undefined,
      [
        "Umkehraufgabe: 144 : 12 = ?, weil ? · 12 = 144.",
        "Mach zur Probe: Dein Ergebnis · 12 muss 144 ergeben.",
        "Jetzt rechnest du zu Ende.",
      ],
    ],
    [
      "7 + 5",
      "left",
      ["Drehe die Aufgabe um und rechne 12 − 5.", "Jetzt rechnest du zu Ende."],
    ],
    [
      "9 - 4",
      "right",
      ["Drehe die Aufgabe um und rechne 9 − 5.", "Jetzt rechnest du zu Ende."],
    ],
    [
      "6 * 7",
      "left",
      ["Drehe die Aufgabe um und rechne 42 : 7.", "Jetzt rechnest du zu Ende."],
    ],
    // Die Lücke „Ergebnis“ ist eine normale Aufgabe: nichts umdrehen.
    [
      "47 + 28",
      "result",
      ["47 + 20 = 67.", "Jetzt rechnest du zu Ende: 67 + 8."],
    ],
    // Ohne Zerlegung: nur die Strategie, nie „20 + 3 = 23“.
    [
      "20 + 3",
      undefined,
      [
        "Rechne in kleinen Schritten: Zerlege die zweite Zahl in Zehner und Einer.",
      ],
    ],
    ["47 + 30", undefined, ["Zerlege am Zehner: 47 + 30 = 47 + 3 + 27."]],
    ["5 * 0", undefined, ["Was passiert, wenn du mit null malnimmst?"]],
    ["1 * 5", undefined, ["Was passiert, wenn du mit eins malnimmst?"]],
  ];

  for (const [source, gap, expected] of cases)
    it(`${source}${gap ? ` (Lücke ${gap})` : ""}`, () => {
      expect(mentalMathSolutionSteps(task(source, gap))).toEqual(expected);
    });

  it("nennt das Ergebnis in keinem Schritt und kein Schritt verrät es allein", () => {
    const sources = [
      "0 + 0",
      "9 + 9",
      "100 - 1",
      "15 - 20",
      "1 * 9",
      "0 * 5",
      "10 * 10",
      "25 * 4",
      "9 : 9",
      "0 : 5",
      "1,5 * 4",
      "7,5 : 2,5",
      "-4 + 9",
      "(2 + 3) * 4",
    ];
    for (const source of sources) {
      const t = task(source);
      const steps = mentalMathSolutionSteps(t);
      expect(steps.length, source).toBeGreaterThanOrEqual(1);
      expect(steps.length, source).toBeLessThanOrEqual(4);
      expect(revealing(t, steps), source).toEqual([]);
    }
  });
});

/** Zeilen, die das Endergebnis der Aufgabe nennen (außer als Zahl der Aufgabe selbst). */
function revealing(t: ReturnType<typeof task>, steps: string[]) {
  const answer = t.answer;
  const shown =
    t.source
      .replace(/,/g, ".")
      .match(/\d+(?:\.\d+)?/g)
      ?.map(Number) ?? [];
  return steps.filter((step) => {
    if (/Die Lösung|Das Ergebnis ist/.test(step)) return true;
    const text = step.replace(/\$[^$]*\$/g, " ").replace(/,/g, ".");
    // „… = <Ergebnis>“ ist immer eine Verrat, auch wenn die Zahl sonst vorkäme.
    for (const match of text.matchAll(
      /=\s*(−|-)?(\d+(?:\.\d+)?)(?!\s*[:·+−*/])/g,
    )) {
      const value = (match[1] ? -1 : 1) * Number(match[2]);
      if (Math.abs(value - answer) < 1e-9 && !shown.includes(Math.abs(value)))
        return true;
    }
    return false;
  });
}

describe("mentalMathSolutionSteps: gemischte Ausdrücke", () => {
  it("zeigt die ersten Rechenschritte und lässt den letzten aus", () => {
    const t = task("19 + 1 + 3+ \\frac{1}{2}");
    expect(t.operation).toBe("mixed-expression");
    expect(t.answer).toBe(23.5);
    expect(mentalMathSolutionSteps(t)).toEqual([
      "Rechne zuerst 19 + 1 = 20.",
      "Dann 20 + 3 = 23.",
      "Jetzt rechnest du zu Ende: 23 + $\\frac{1}{2}$.",
    ]);
  });

  it("rechnet Klammern zuerst und dann Punkt vor Strich", () => {
    expect(mentalMathSolutionSteps(task("(2 + 3) * 4 + 6"))).toEqual([
      "Rechne zuerst die Klammer: 2 + 3 = 5.",
      "Dann Punkt vor Strich: 5 · 4 = 20.",
      "Jetzt rechnest du zu Ende: 20 + 6.",
    ]);
    expect(mentalMathSolutionSteps(task("2 * 3 + 4 * 5 + 1"))).toEqual([
      "Rechne zuerst Punkt vor Strich: 2 · 3 = 6 und 4 · 5 = 20.",
      "Dann 6 + 20 = 26.",
      "Jetzt rechnest du zu Ende: 26 + 1.",
    ]);
    expect(mentalMathSolutionSteps(task("(2 + 3) * 4"))).toEqual([
      "Rechne zuerst die Klammer: 2 + 3 = 5.",
      "Jetzt rechnest du zu Ende: 5 · 4.",
    ]);
  });

  it("zeigt bei Minus und Dezimalzahlen die Zwischenwerte", () => {
    expect(mentalMathSolutionSteps(task("20 - 5 - 3 + 1,5"))).toEqual([
      "Rechne zuerst 20 − 5 = 15.",
      "Dann 15 − 3 = 12.",
      "Jetzt rechnest du zu Ende: 12 + 1,5.",
    ]);
  });

  it("nennt nur die Strategie, wenn kein Teilschritt möglich ist", () => {
    const strategy = [
      "Rechne Schritt für Schritt: Klammern zuerst, dann Punkt vor Strich.",
    ];
    for (const source of [
      "\\frac{3}{4} + \\frac{1}{4}",
      "2^3",
      "\\sqrt{9}",
      "2 + 3 + 0",
      "(2 + 3)",
      "4 * 5 * 6",
    ])
      expect(mentalMathSolutionSteps(task(source)), source).toEqual(strategy);
  });

  it("zeigt nie einen Zwischenwert, der schon das Ergebnis ist", () => {
    // 7 + 8 = 15 wäre schon das Ergebnis von 7 + 8 + 0.
    expect(mentalMathSolutionSteps(task("7 + 8 + 0"))).toHaveLength(1);
    const steps = mentalMathSolutionSteps(task("3 + 4 + 1 - 1"));
    expect(steps.some((step) => step.includes("= 8"))).toBe(false);
  });
});

describe("Eigenschaft: Der Lösungsweg verrät das Ergebnis nie", () => {
  const operand = fc.integer({ min: 0, max: 99 });
  const decimal = fc
    .tuple(fc.integer({ min: 0, max: 99 }), fc.integer({ min: 0, max: 9 }))
    .map(([whole, tenth]) => `${whole},${tenth}`);
  const number = fc.oneof(operand.map(String), decimal);
  const operator = fc.constantFrom("+", "-", "*", ":");
  const gap = fc.constantFrom<MathGapSlot | undefined>(
    undefined,
    "left",
    "right",
    "result",
  );

  function check(t: ReturnType<typeof task> | null) {
    if (!t) return;
    const steps = mentalMathSolutionSteps(t);
    expect(steps.length).toBeGreaterThanOrEqual(1);
    expect(steps.length).toBeLessThanOrEqual(4);
    expect(revealing(t, steps), `${t.source} → ${steps.join(" / ")}`).toEqual(
      [],
    );
    // Wer mehr als eine Zeile zeigt, endet mit der Aufforderung zum Selbstrechnen.
    if (steps.length > 1)
      expect(steps.at(-1)).toMatch(/^Jetzt rechnest du zu Ende/);
  }

  it("bei Aufgaben mit zwei Zahlen und Lücken", () => {
    fc.assert(
      fc.property(number, operator, number, gap, (left, op, right, slot) => {
        check(parseMentalMathTask(`${left} ${op} ${right}`, 0, slot));
      }),
      { numRuns: 600 },
    );
  });

  it("bei Aufgaben mit mehreren Rechenzeichen und Klammern", () => {
    const part = fc.oneof(
      number,
      fc.tuple(number, operator, number).map(([a, o, b]) => `(${a} ${o} ${b})`),
      fc.tuple(number, number).map(([a, b]) => `\\frac{${a}}{${b}}`),
    );
    fc.assert(
      fc.property(
        part,
        fc.array(fc.tuple(operator, part), { minLength: 1, maxLength: 5 }),
        (first, rest) => {
          const source = [first, ...rest.map(([o, p]) => `${o} ${p}`)].join(
            " ",
          );
          check(parseMentalMathTask(source));
        },
      ),
      { numRuns: 600 },
    );
  });
});
