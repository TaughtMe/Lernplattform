import { describe, expect, it } from "vitest";
import {
  classifyMentalMathError,
  mentalMathHint,
  mentalMathSolutionSteps,
  type MentalMathErrorKind,
} from "./mental-math-feedback";
import {
  displayMathNumber,
  parseMentalMathTask,
  type MathGapSlot,
} from "./mental-math";

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
        if (kind === "unknown") continue;
        const hint = mentalMathHint(
          task(source, gap),
          kind as MentalMathErrorKind,
        );
        expect(hint).not.toBeNull();
        expect(hint!.length).toBeGreaterThan(10);
        for (const word of forbidden) expect(hint).not.toContain(word);
      }
  });

  it("verrät das Ergebnis nicht", () => {
    for (const [kind, examples] of Object.entries(catalogue))
      for (const [source, , gap] of examples) {
        const t = task(source, gap);
        const hint = mentalMathHint(t, kind as MentalMathErrorKind);
        if (hint === null) continue;
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
    expect(mentalMathHint(task("6 * 7", "result"), "operation-mix")).toContain(
      "Probe",
    );
  });

  it("gibt bei unbekannter Fehlerart keinen Hinweis, auch keinen allgemeinen", () => {
    expect(mentalMathHint(task("56 : 8"), "unknown")).toBeNull();
    expect(mentalMathHint(task("12 + 5"), "unknown")).toBeNull();
    expect(mentalMathHint(task("7 * 8"), "unknown")).toBeNull();
    expect(mentalMathHint(task("7 + 5", "left"), "unknown")).toBeNull();
    expect(mentalMathHint(task("(2 + 3) * 4"), "unknown")).toBeNull();
  });

  it("liefert für jede erkannte Fehlerart einen Hinweis", () => {
    for (const [kind, examples] of Object.entries(catalogue))
      if (kind !== "unknown")
        for (const [source, , gap] of examples)
          expect(
            mentalMathHint(task(source, gap), kind as MentalMathErrorKind),
          ).not.toBeNull();
  });
});

describe("mentalMathSolutionSteps", () => {
  const cases: [string, MathGapSlot | undefined, string[]][] = [
    [
      "47 + 8",
      undefined,
      [
        "47 + 3 = 50 (bis zum vollen Zehner).",
        "Von der 8 bleiben 5 übrig: 50 + 5 = 55.",
        "Die Lösung ist 55.",
      ],
    ],
    [
      "47 + 28",
      undefined,
      ["47 + 20 = 67.", "67 + 8 = 75.", "Die Lösung ist 75."],
    ],
    ["47 + 30", undefined, ["47 + 30 = 77.", "Die Lösung ist 77."]],
    [
      "62 - 5",
      undefined,
      [
        "62 − 2 = 60 (bis zum vollen Zehner).",
        "Von der 5 bleiben 3 übrig: 60 − 3 = 57.",
        "Die Lösung ist 57.",
      ],
    ],
    [
      "347 + 285",
      undefined,
      [
        "347 + 200 = 547.",
        "547 + 80 = 627.",
        "627 + 5 = 632.",
        "Die Lösung ist 632.",
      ],
    ],
    [
      "3 - 8",
      undefined,
      [
        "8 − 3 = 5.",
        "Du nimmst mehr weg, als da ist. Darum kommt ein Minus davor.",
        "Die Lösung ist -5.",
      ],
    ],
    [
      "0,5 + 0,7",
      undefined,
      [
        "Rechne ohne Komma: 5 + 7 = 12.",
        "Setze das Komma wieder: Es hat so viele Stellen wie in der Aufgabe.",
        "Die Lösung ist 1,2.",
      ],
    ],
    [
      "7 * 8",
      undefined,
      [
        "Kernaufgabe: 5 · 7 = 35.",
        "Dazu kommt: 3 · 7 = 21.",
        "35 + 21 = 56.",
        "Die Lösung ist 56.",
      ],
    ],
    [
      "9 * 6",
      undefined,
      [
        "Rechne mit 10: 10 · 6 = 60.",
        "Ein 6er zu viel: 60 − 6 = 54.",
        "Die Lösung ist 54.",
      ],
    ],
    [
      "3 * 4",
      undefined,
      ["Zähle in 4er-Schritten, 3 Mal: 4, 8, 12.", "Die Lösung ist 12."],
    ],
    [
      "7 * 10",
      undefined,
      ["Mal 10 heißt: eine Null anhängen.", "Die Lösung ist 70."],
    ],
    [
      "12 * 5",
      undefined,
      [
        "Zerlege 12 in 10 und 2.",
        "10 · 5 = 50 und 2 · 5 = 10.",
        "50 + 10 = 60.",
        "Die Lösung ist 60.",
      ],
    ],
    [
      "56 : 8",
      undefined,
      [
        "Umkehraufgabe: 56 : 8 = ?, weil ? · 8 = 56.",
        "8er-Reihe: 8 · 7 = 56.",
        "Die Lösung ist 7.",
      ],
    ],
    [
      "144 : 12",
      undefined,
      [
        "Umkehraufgabe: 144 : 12 = ?, weil ? · 12 = 144.",
        "Probe: 12 · 12 = 144.",
        "Die Lösung ist 12.",
      ],
    ],
    [
      "7 + 5",
      "left",
      [
        "Drehe die Aufgabe um: 12 − 5 = 7.",
        "Probe: 7 + 5 = 12.",
        "Die Lösung ist 7.",
      ],
    ],
    [
      "9 - 4",
      "right",
      [
        "Drehe die Aufgabe um: 9 − 5 = 4.",
        "Probe: 9 − 4 = 5.",
        "Die Lösung ist 4.",
      ],
    ],
    [
      "6 * 7",
      "left",
      [
        "Drehe die Aufgabe um: 42 : 7 = 6.",
        "Probe: 6 · 7 = 42.",
        "Die Lösung ist 6.",
      ],
    ],
  ];

  for (const [source, gap, expected] of cases)
    it(`${source}${gap ? ` (Lücke ${gap})` : ""}`, () => {
      expect(mentalMathSolutionSteps(task(source, gap))).toEqual(expected);
    });

  it("liefert für jede Aufgabe 1 bis 4 Schritte mit dem Ergebnis am Ende", () => {
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
      expect(steps.length).toBeGreaterThanOrEqual(1);
      expect(steps.length).toBeLessThanOrEqual(4);
      expect(steps.at(-1)).toBe(
        `Die Lösung ist ${displayMathNumber(t.answer)}.`,
      );
    }
  });
});
