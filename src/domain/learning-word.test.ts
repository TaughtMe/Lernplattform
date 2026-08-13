import { describe, expect, it } from "vitest";
import {
  buildLearningWordLengthPattern,
  buildLearningWordPattern,
  chunkLearningWords,
  evaluateLearningWords,
  parseLearningWords,
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

  it("checks stage-five blocks without requiring an order", () => {
    expect(
      evaluateLearningWords(["Schule", "Freude"], "Freude\nSchule").correct,
    ).toBe(true);
    expect(evaluateLearningWords(["Schule"], "schule").correct).toBe(false);
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
});
