import { describe, expect, it } from "vitest";
import type { LearningWordProgress } from "./learning-word-progress";
import {
  headlineForBox,
  isNewBest,
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
  it("takes the highest stage with a round", () => {
    const summary = summarizeWordBox("box", [
      round("a", 1, 100, 1),
      round("b", 4, 50, 2),
    ]);
    expect(headlineForBox(summary)).toEqual({ stage: 4, bestPercent: 50 });
  });

  it("is empty without rounds", () => {
    expect(headlineForBox(summarizeWordBox("box", []))).toBeUndefined();
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

describe("isNewBest", () => {
  const earlier = [
    round("a", 1, 80, 1),
    round("b", 2, 100, 2),
    round("c", 1, 60, 3),
  ];

  it("needs a higher value than every earlier round of this box and stage", () => {
    expect(isNewBest("box", 1, 90, earlier)).toBe(true);
    expect(isNewBest("box", 1, 80, earlier)).toBe(false);
    expect(isNewBest("box", 1, 50, earlier)).toBe(false);
  });

  it("is false without earlier rounds in this box and stage", () => {
    expect(isNewBest("box", 3, 100, earlier)).toBe(false);
    expect(isNewBest("other", 1, 100, earlier)).toBe(false);
    expect(isNewBest("box", 1, 100, [])).toBe(false);
  });
});
