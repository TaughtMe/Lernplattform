import { describe, expect, it } from "vitest";
import {
  buildLearningWordLengthPattern,
  buildLearningWordPattern,
  chunkLearningWords,
  evaluateLearningWordBlock,
  LearningWordInputFormatError,
  parseLearningWordAnswer,
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

  it.each([
    "Sonne Schule Freude",
    "Sonne\tSchule\u00a0Freude",
    "Sonne, Schule; Freude",
    "Sonne\r\nSchule\nFreude",
  ])("accepts unambiguous single-word separators: %j", (input) => {
    const result = evaluateLearningWordBlock(block, input);
    expect(result.allCorrect).toBe(true);
    expect(result.extra).toEqual([]);
  });

  it("keeps case and spelling errors with whitespace-separated answers", () => {
    const result = evaluateLearningWordBlock(block, "schule Freude Sone");
    expect(result.words.map((entry) => entry.result.kind)).toEqual([
      "gross-klein",
      "richtig",
      "falsch",
    ]);
    expect(result.allCorrect).toBe(false);
  });

  it("does not remove a correct answer after a differently capitalised input", () => {
    const result = evaluateLearningWordBlock(["Schule"], "schule Schule");
    expect(result.allCorrect).toBe(true);
    expect(result.extra).toEqual(["schule"]);
  });

  it("keeps duplicates from filling a missing answer", () => {
    const result = evaluateLearningWordBlock(block, "Schule Schule Freude");
    expect(result.words.map((entry) => entry.result.kind)).toEqual([
      "richtig",
      "richtig",
      "fehlt",
    ]);
  });

  it("preserves multiword phrases and their real spelling errors", () => {
    expect(evaluateLearningWordBlock(["New York"], "New York").allCorrect).toBe(
      true,
    );
    expect(
      evaluateLearningWordBlock(["New York", "Hund"], "Hund; New York")
        .allCorrect,
    ).toBe(true);
    expect(
      evaluateLearningWordBlock(["New York", "Hund"], "New Yrok\nHund")
        .allCorrect,
    ).toBe(false);
    expect(
      evaluateLearningWordBlock(["New York", "Hund"], "New, York, Hund")
        .allCorrect,
    ).toBe(false);
  });

  it("behandelt „Artikel + Nomen“ als ein Wort, auch ohne Komma", () => {
    const block = ["das Essen", "essen", "Hund"];
    expect(parseLearningWordAnswer("das Essen essen Hund", block)).toEqual([
      "das Essen",
      "essen",
      "Hund",
    ]);
    expect(parseLearningWordAnswer("Hund, das Essen\nessen", block)).toEqual([
      "Hund",
      "das Essen",
      "essen",
    ]);
    const result = evaluateLearningWordBlock(block, "das Essen essen Hund");
    expect(result.allCorrect).toBe(true);
    expect(result.extra).toEqual([]);
  });

  it("bewertet „das Essen“ und „essen“ als zwei verschiedene Antworten", () => {
    const wrong = evaluateLearningWordBlock(
      ["das Essen", "essen"],
      "essen essen",
    );
    expect(wrong.allCorrect).toBe(false);
    expect(wrong.words.map((entry) => entry.correct)).toEqual([false, true]);
    expect(
      evaluateLearningWordBlock(["das Essen", "essen"], "essen das Essen")
        .allCorrect,
    ).toBe(true);
  });

  it("zeigt Rechtschreib- und Großschreibfehler in „das Essen“", () => {
    const result = evaluateLearningWordBlock(
      ["das Essen", "Hund"],
      "das essen Hund",
    );
    expect(result.words[0]!.result.kind).toBe("gross-klein");
    expect(
      evaluateLearningWordBlock(["das Essen", "Hund"], "das Esen Hund")
        .words[0]!.result,
    ).toMatchObject({ kind: "falsch", nearMiss: true });
  });

  it("hält einen Artikel, der selbst als Einzelwort im Block steht, getrennt", () => {
    const block = ["die", "das Essen"];
    expect(parseLearningWordAnswer("die das Essen", block)).toEqual([
      "die",
      "das Essen",
    ]);
    expect(parseLearningWordAnswer("das Essen die", block)).toEqual([
      "das Essen",
      "die",
    ]);
  });

  it("verlangt weiter Trennzeichen bei anderen mehrwortigen Begriffen", () => {
    expect(() =>
      evaluateLearningWordBlock(
        ["das Essen", "New York"],
        "das Essen New York",
      ),
    ).toThrow(LearningWordInputFormatError);
  });

  it("lässt bei „das Essen“ den ersten und letzten Buchstaben jedes Wortes stehen", () => {
    expect(buildLearningWordPattern("das Essen", 2)).toBe("d_s E_s_n");
    expect(buildLearningWordLengthPattern("das Essen")).toBe(
      "_ _ _   _ _ _ _ _",
    );
  });

  it("requests boundaries before grading an ambiguous phrase block", () => {
    expect(() =>
      evaluateLearningWordBlock(["New York", "Hund"], "New York Hund"),
    ).toThrow(LearningWordInputFormatError);
  });

  it("normalises Unicode and keeps extra words visible", () => {
    const result = evaluateLearningWordBlock(
      ["Bär", "Schule"],
      "Ba\u0308r Schule Haus",
    );
    expect(result.allCorrect).toBe(true);
    expect(result.extra).toEqual(["Haus"]);
  });

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
