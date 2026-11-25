import { describe, expect, it } from "vitest";
import {
  LIVE_PROJECTION_MIN_PARTICIPANTS_FOR_MISTAKES,
  summarizeLiveProjection,
} from "./live-projection";

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
      participants: 24,
      mistakesAllowed: true,
      goal: { solved: 0, target: 0, percent: 0 },
      roundDone: false,
      correctShare: null,
      topMistake: null,
    });
    // Keine Namen, Fehlerzahlen je Kind oder Hilfe-Hinweise im Ergebnis.
    expect(Object.keys(summary).sort()).toEqual([
      "correctShare",
      "finished",
      "goal",
      "label",
      "mistakes",
      "mistakesAllowed",
      "overall",
      "participants",
      "roundDone",
      "topMistake",
      "total",
    ]);
  });

  it("nennt die häufigsten Fehlerwörter der Klasse, höchstens fünf, ohne Namen", () => {
    const summary = summarizeLiveProjection({
      active: 6,
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

  describe("Kleingruppen-Schutz (Entscheidung 65)", () => {
    const mistakes = [{ word: "Pilze", count: 4 }];

    it("zeigt Fehler erst ab sechs Kindern", () => {
      expect(LIVE_PROJECTION_MIN_PARTICIPANTS_FOR_MISTAKES).toBe(6);
      const few = summarizeLiveProjection({
        active: 3,
        finished: 2,
        overall: 50,
        mistakes,
      });
      expect(few).toMatchObject({
        participants: 5,
        mistakesAllowed: false,
        mistakes: [],
        topMistake: null,
      });
      const enough = summarizeLiveProjection({
        active: 3,
        finished: 3,
        overall: 50,
        mistakes,
      });
      expect(enough).toMatchObject({
        mistakesAllowed: true,
        mistakes,
        topMistake: { word: "Pilze", count: 4 },
      });
    });

    it("zählt die Kinder der Liste, wenn sie angegeben ist", () => {
      const students = Array.from({ length: 4 }, () => ({
        progress: 1,
        total: 8,
        mistakes: 1,
      }));
      expect(
        summarizeLiveProjection({
          active: 8,
          finished: 0,
          overall: 10,
          mistakes,
          students,
        }),
      ).toMatchObject({ participants: 4, mistakes: [] });
    });
  });

  describe("Klassenziel und Rundenende (M24-1)", () => {
    const students = [
      { progress: 8, total: 8, mistakes: 2 },
      { progress: 4, total: 8, mistakes: 0 },
      { progress: 99, total: 8, mistakes: 2 },
    ];

    it("summiert richtige Antworten aller, ohne ein Kind zu nennen", () => {
      const summary = summarizeLiveProjection({
        active: 1,
        finished: 2,
        overall: 80,
        students,
      });
      expect(summary.goal).toEqual({ solved: 20, target: 24, percent: 83 });
      expect(summary.roundDone).toBe(false);
      // Unter sechs Kindern kein Anteil richtig (Entscheidung 65).
      expect(summary.correctShare).toBeNull();
    });

    it("nennt den Anteil richtig erst ab sechs Kindern und nur mit geprüften Antworten", () => {
      const six = Array.from({ length: 6 }, () => ({
        progress: 8,
        total: 8,
        mistakes: 2,
      }));
      const base = { active: 0, finished: 6, overall: 100, students: six };
      expect(summarizeLiveProjection(base).correctShare).toBe(80);
      expect(
        summarizeLiveProjection({ ...base, answersChecked: false })
          .correctShare,
      ).toBeNull();
    });

    it("meldet das Rundenende, wenn alle fertig sind oder der Raum endet", () => {
      expect(
        summarizeLiveProjection({
          active: 0,
          finished: 3,
          overall: 100,
          students,
        }).roundDone,
      ).toBe(true);
      expect(
        summarizeLiveProjection({
          active: 1,
          finished: 2,
          overall: 80,
          students,
          ended: true,
        }).roundDone,
      ).toBe(true);
      expect(
        summarizeLiveProjection({
          active: 0,
          finished: 0,
          overall: 0,
          students: [],
          ended: true,
        }).roundDone,
      ).toBe(false);
    });
  });
});
