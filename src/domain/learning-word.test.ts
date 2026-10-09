import { describe, expect, it } from "vitest";
import {
  buildLearningWordLengthPattern,
  buildLearningWordPattern,
  chunkLearningWords,
  evaluateLearningWordBlock,
  parseLearningWords,
  selectLearningWordRound,
  updateLearningWordStage,
} from "./learning-word";

describe("learning-word domain", () => {
  it("parses lines and separators without case-insensitive duplicates", () => {
    expect(parseLearningWords("Schule\n lernen;SCHULE, Freude ")).toEqual([
      "Schule",
      "lernen",
      "Freude",
    ]);
  });

  it("builds increasingly sparse patterns while preserving word boundaries", () => {
    const stageTwo = buildLearningWordPattern("Schulweg", 2);
    const stageThree = buildLearningWordPattern("Schulweg", 3);
    expect(stageTwo).toHaveLength(8);
    expect(stageThree).toHaveLength(8);
    expect(stageThree.split("_").length).toBeGreaterThanOrEqual(
      stageTwo.split("_").length,
    );
    expect(buildLearningWordLengthPattern("Eis-bär")).toBe("_ _ _ - _ _ _");
  });

  it("advances only a clean retrieval and lowers a stage after repeated errors", () => {
    expect(
      updateLearningWordStage(3, {
        correct: true,
        usedHelp: false,
        incorrectAttempts: 0,
      }),
    ).toBe(4);
    expect(
      updateLearningWordStage(3, {
        correct: true,
        usedHelp: true,
        incorrectAttempts: 0,
      }),
    ).toBe(3);
    expect(
      updateLearningWordStage(3, {
        correct: true,
        usedHelp: false,
        incorrectAttempts: 2,
      }),
    ).toBe(2);
    expect(
      updateLearningWordStage(1, {
        correct: false,
        usedHelp: false,
        incorrectAttempts: 4,
      }),
    ).toBe(1);
  });

  it("creates blocks in the selected size", () => {
    expect(chunkLearningWords(["a", "b", "c", "d", "e"], 2)).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e"],
    ]);
  });

  it("selects a manageable round across the full word bank", () => {
    const words = Array.from({ length: 100 }, (_, index) => `Wort${index + 1}`);
    const round = selectLearningWordRound(words, 10);
    expect(round).toHaveLength(10);
    expect(round[0]).toBe("Wort1");
    expect(round.at(-1)).toBe("Wort91");
    expect(selectLearningWordRound(words, "all")).toEqual(words);
  });

  it("climbs and drops through stage six", () => {
    expect(
      updateLearningWordStage(5, {
        correct: true,
        usedHelp: false,
        incorrectAttempts: 0,
      }),
    ).toBe(6);
    expect(
      updateLearningWordStage(6, {
        correct: true,
        usedHelp: false,
        incorrectAttempts: 0,
      }),
    ).toBe(6);
    expect(
      updateLearningWordStage(6, {
        correct: false,
        usedHelp: false,
        incorrectAttempts: 2,
      }),
    ).toBe(5);
  });
});

describe("evaluateLearningWordBlock", () => {
  const block = ["Schule", "Freude", "Sonne"];

  it("marks every word right regardless of order", () => {
    const result = evaluateLearningWordBlock(block, "Sonne\nSchule\nFreude");
    expect(result.allCorrect).toBe(true);
    expect(result.words.map((entry) => entry.correct)).toEqual([
      true,
      true,
      true,
    ]);
    expect(result.extra).toEqual([]);
  });

  it("scores each word on its own", () => {
    const result = evaluateLearningWordBlock(block, "Schule\nFreude\nSone");
    expect(result.allCorrect).toBe(false);
    expect(result.words.map((entry) => entry.correct)).toEqual([
      true,
      true,
      false,
    ]);
    expect(result.words[2]!.result).toMatchObject({
      kind: "falsch",
      nearMiss: true,
      actual: "Sone",
    });
  });

  it("counts a doubled input word only once", () => {
    const result = evaluateLearningWordBlock(
      ["Schule", "Sonne"],
      "Schule, Schule",
    );
    expect(result.words.map((entry) => entry.correct)).toEqual([true, false]);
    expect(result.words[1]!.result.kind).toBe("fehlt");
    expect(result.extra).toEqual([]);
  });

  it("keeps additional words visible without penalty", () => {
    const result = evaluateLearningWordBlock(["Schule"], "Schule\nHaus");
    expect(result.allCorrect).toBe(true);
    expect(result.extra).toEqual(["Haus"]);
  });

  it("recognises a capitalisation slip", () => {
    const result = evaluateLearningWordBlock(
      ["Schule", "Sonne"],
      "schule\nSonne",
    );
    expect(result.words[0]).toMatchObject({
      correct: false,
      result: { kind: "gross-klein" },
    });
    expect(result.words[1]!.correct).toBe(true);
  });

  it("treats empty input as missing words", () => {
    const result = evaluateLearningWordBlock(["Schule"], "  ");
    expect(result.allCorrect).toBe(false);
    expect(result.words[0]!.result.kind).toBe("fehlt");
  });
});
