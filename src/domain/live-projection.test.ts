import { describe, expect, it } from "vitest";
import { summarizeLiveProjection } from "./live-projection";

describe("summarizeLiveProjection", () => {
  it("nennt nur Zahlen für den ganzen Raum", () => {
    const summary = summarizeLiveProjection({
      active: 12,
      finished: 12,
      overall: 63.4,
    });
    expect(summary).toEqual({
      finished: 12,
      total: 24,
      overall: 63,
      label: "12 von 24 fertig",
      mistakes: [],
    });
    // Keine Namen, Fehlerzahlen je Kind oder Hilfe-Hinweise im Ergebnis.
    expect(Object.keys(summary).sort()).toEqual([
      "finished",
      "label",
      "mistakes",
      "overall",
      "total",
    ]);
  });

  it("nennt die häufigsten Fehlerwörter der Klasse, höchstens fünf, ohne Namen", () => {
    const summary = summarizeLiveProjection({
      active: 5,
      finished: 0,
      overall: 20,
      mistakes: [
        { word: "Vogel", count: 2 },
        { word: "Pilze", count: 7 },
        { word: "Ahorn", count: 2 },
        { word: "Wald", count: 0 },
        { word: "Fuchs", count: 3 },
        { word: "Igel", count: 1 },
        { word: "Dach", count: 4 },
        { word: "Nuss", count: Number.NaN },
      ],
    });
    // Häufigstes zuerst, bei Gleichstand alphabetisch; 0 und NaN entfallen.
    expect(summary.mistakes).toEqual([
      { word: "Pilze", count: 7 },
      { word: "Dach", count: 4 },
      { word: "Fuchs", count: 3 },
      { word: "Ahorn", count: 2 },
      { word: "Vogel", count: 2 },
    ]);
  });

  it("ändert die übergebene Liste nicht und kommt ohne Fehler aus", () => {
    const mistakes = [
      { word: "b", count: 1 },
      { word: "a", count: 2 },
    ];
    summarizeLiveProjection({ active: 1, finished: 0, overall: 0, mistakes });
    expect(mistakes.map((entry) => entry.word)).toEqual(["b", "a"]);
    expect(
      summarizeLiveProjection({ active: 1, finished: 0, overall: 0 }).mistakes,
    ).toEqual([]);
  });

  it("sagt, wenn noch niemand mitspielt", () => {
    expect(
      summarizeLiveProjection({ active: 0, finished: 0, overall: 0 }).label,
    ).toBe("Noch niemand in der Runde");
  });

  it("begrenzt ungültige Zahlen", () => {
    expect(
      summarizeLiveProjection({
        active: -3,
        finished: Number.NaN,
        overall: 180,
      }),
    ).toMatchObject({ finished: 0, total: 0, overall: 100 });
    expect(
      summarizeLiveProjection({ active: 0, finished: 5, overall: -4 }),
    ).toMatchObject({ total: 5, overall: 0, label: "5 von 5 fertig" });
  });
});
