import { describe, expect, it } from "vitest";
import type { LearningWordProgress } from "./learning-word-progress";
import {
  headlineForBox,
  practicedWordsLabel,
  showsPracticedWordsOnly,
  wordsPracticedOnDay,
  recommendedStage,
  summarizeWordBox,
  summarizeWordStore,
  wordRoundSchema,
  type WordRoundRecord,
} from "./word-store-progress";

function round(
  id: string,
  stage: WordRoundRecord["stage"],
  percent: number,
  day: number,
  boxId = "box",
): WordRoundRecord {
  const at = `2026-10-${String(day).padStart(2, "0")}T10:00:00.000Z`;
  return {
    id,
    boxId,
    boxTitle: "Box",
    stage,
    startedAt: at,
    completedAt: at,
    words: [
      {
        word: "Sonne",
        firstTry: percent === 100,
        attempts: 1,
        usedHelp: false,
        firstResult: "richtig",
      },
    ],
    percent,
  };
}

function progress(
  word: string,
  stage: LearningWordProgress["stage"],
  box: LearningWordProgress["box"],
  incorrectAttempts = 0,
  attempts = 3,
): LearningWordProgress {
  return {
    id: `learning-word:${word.toLowerCase()}`,
    word,
    stage,
    box,
    dueAt: "2026-10-10T10:00:00.000Z",
    attempts,
    incorrectAttempts,
    helpUses: 0,
    lastPracticedAt: "2026-10-09T10:00:00.000Z",
  };
}

describe("wordRoundSchema", () => {
  it("accepts a valid round and rejects extras and bad values", () => {
    expect(wordRoundSchema.safeParse(round("a", 6, 80, 1)).success).toBe(true);
    expect(
      wordRoundSchema.safeParse({ ...round("a", 1, 80, 1), extra: true })
        .success,
    ).toBe(false);
    expect(wordRoundSchema.safeParse(round("a", 1, 101, 1)).success).toBe(
      false,
    );
    expect(
      wordRoundSchema.safeParse({ ...round("a", 1, 50, 1), stage: 7 }).success,
    ).toBe(false);
    expect(
      wordRoundSchema.safeParse({ ...round("a", 1, 50, 1), words: [] }).success,
    ).toBe(false);
  });
});

describe("summarizeWordBox", () => {
  it("keeps the best value when a later round is worse", () => {
    const summary = summarizeWordBox("box", [
      round("a", 1, 80, 1),
      round("b", 1, 60, 2),
    ]);
    expect(summary[1]).toMatchObject({
      rounds: 2,
      bestPercent: 80,
      lastPercent: 60,
    });
  });

  it("separates stages and boxes and sorts by completion", () => {
    const summary = summarizeWordBox("box", [
      round("b", 1, 40, 5),
      round("a", 1, 90, 2),
      round("c", 3, 70, 3),
      round("x", 1, 100, 4, "other"),
    ]);
    expect(summary[1]).toMatchObject({
      rounds: 2,
      bestPercent: 90,
      lastPercent: 40,
    });
    expect(summary[3]).toMatchObject({ rounds: 1, bestPercent: 70 });
    expect(summary[2]).toEqual({ stage: 2, rounds: 0 });
  });
});

describe("headlineForBox", () => {
  it("shows the stage and the last result of the most recent round", () => {
    const summary = summarizeWordBox("box", [
      round("a", 4, 100, 1),
      round("b", 1, 50, 2),
      round("c", 1, 80, 3),
    ]);
    expect(headlineForBox(summary)).toEqual({
      stage: 1,
      lastPercent: 80,
      practicedWords: 1,
    });
  });

  it("does not turn a best value into the headline", () => {
    const summary = summarizeWordBox("box", [
      round("a", 2, 100, 1),
      round("b", 2, 40, 2),
    ]);
    expect(headlineForBox(summary)).toMatchObject({ lastPercent: 40 });
  });

  it("is empty without rounds", () => {
    expect(headlineForBox(summarizeWordBox("box", []))).toBeUndefined();
  });
});

describe("Fehlerwörter ohne Prozentwert", () => {
  it("erkennt nur die Fehlerwörter-Wortbox", () => {
    expect(showsPracticedWordsOnly("fehler")).toBe(true);
    expect(showsPracticedWordsOnly("textbox")).toBe(false);
    expect(showsPracticedWordsOnly("faellig")).toBe(false);
  });

  it("nennt die Zahl der geübten Wörter", () => {
    expect(practicedWordsLabel(1)).toBe("1 Wort geübt");
    expect(practicedWordsLabel(8)).toBe("8 Wörter geübt");
  });

  it("leitet die Wörter der letzten Runde je Stufe ab", () => {
    const summary = summarizeWordBox("fehler", [
      { ...round("a", 3, 20, 1, "fehler"), words: round("x", 3, 0, 1).words },
    ]);
    expect(summary[3]).toMatchObject({ lastWords: 1 });
  });
});

describe("wordsPracticedOnDay", () => {
  it("summiert die Wörter der Runden des lokalen Tages", () => {
    const at = (day: number, hour: number) =>
      new Date(2026, 9, day, hour, 0).toISOString();
    const withWords = (id: string, count: number, completedAt: string) => ({
      ...round(id, 1, 100, 1),
      completedAt,
      words: Array.from({ length: count }, (_, index) => ({
        ...round("w", 1, 100, 1).words[0]!,
        word: `Wort${index}`,
      })),
    });
    const rounds = [
      withWords("gestern", 10, at(20, 23)),
      withWords("morgens", 10, at(21, 8)),
      withWords("abends", 20, at(21, 19)),
    ];
    expect(wordsPracticedOnDay(rounds, new Date(2026, 9, 21, 20, 0))).toBe(30);
    expect(wordsPracticedOnDay(rounds, new Date(2026, 9, 22, 8, 0))).toBe(0);
    expect(wordsPracticedOnDay([], new Date(2026, 9, 21, 20, 0))).toBe(0);
  });
});

describe("recommendedStage", () => {
  const words = ["Sonne", "Mond", "Stern"];

  it("picks the stage most words stand on", () => {
    expect(
      recommendedStage(words, [
        progress("Sonne", 3, 1),
        progress("Mond", 3, 1),
        progress("Stern", 2, 1),
        progress("Anderes", 6, 1),
      ]),
    ).toBe(3);
  });

  it("takes the easier stage on a tie and ignores other words", () => {
    expect(
      recommendedStage(words, [
        progress("Sonne", 4, 1),
        progress("Mond", 2, 1),
      ]),
    ).toBe(2);
    expect(
      recommendedStage(words, [progress("Anderes", 6, 1)]),
    ).toBeUndefined();
    expect(recommendedStage(words, [])).toBeUndefined();
  });
});

describe("summarizeWordStore", () => {
  it("is empty without data", () => {
    expect(summarizeWordStore([], [])).toEqual({
      trainedWords: 0,
      secureWords: 0,
      repetitions: 0,
      rounds: 0,
      byStage: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      mostErrors: [],
    });
  });

  it("counts words, secure words, repetitions and stages", () => {
    const summary = summarizeWordStore(
      [
        progress("a", 1, 1, 3, 4),
        progress("b", 6, 3, 0, 5),
        progress("c", 6, 5, 1, 6),
      ],
      [round("r", 1, 50, 1)],
    );
    expect(summary).toMatchObject({
      trainedWords: 3,
      secureWords: 2,
      repetitions: 15,
      rounds: 1,
      byStage: { 1: 1, 6: 2 },
    });
    expect(summary.mostErrors).toEqual([
      { word: "a", incorrectAttempts: 3 },
      { word: "c", incorrectAttempts: 1 },
    ]);
  });

  it("limits the most-error list to five words", () => {
    const many = ["a", "b", "c", "d", "e", "f", "g"].map((w, i) =>
      progress(w, 1, 1, i + 1),
    );
    const { mostErrors } = summarizeWordStore(many, []);
    expect(mostErrors).toHaveLength(5);
    expect(mostErrors[0]).toEqual({ word: "g", incorrectAttempts: 7 });
  });
});
