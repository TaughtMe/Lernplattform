import { describe, expect, it } from "vitest";
import {
  buildTeacherRoomConfig,
  buildTeacherWords,
  generateMentalMathSource,
} from "./teacher-session";

describe("teacher live session builder", () => {
  it("turns a text into native dictation items", () => {
    const words = buildTeacherWords(
      "text",
      "Guten Morgen. Wie geht es?",
      "left-to-right",
    );
    expect(words.map((word) => word.targetWord)).toEqual([
      "Guten Morgen.",
      "Wie geht es?",
    ]);
  });

  it("preserves vocabulary alternatives and direction", () => {
    const [word] = buildTeacherWords(
      "vocabulary",
      "Haus;home|house",
      "left-to-right",
    );
    expect(word).toMatchObject({
      prompt: "Haus",
      targetWord: "home",
      acceptedAnswers: ["house"],
      kind: "vocabulary",
    });
  });

  it("parses common mental-math notation without eval", () => {
    const words = buildTeacherWords(
      "math",
      "7 + 8\n6 · 7 = 42\n20 : 4\n8 : 0\n2 + 2 = 5",
      "left-to-right",
    );
    expect(words.map(({ prompt, targetWord }) => [prompt, targetWord])).toEqual(
      [
        ["7 + 8", "15"],
        ["6 · 7", "42"],
        ["20 : 4", "5"],
      ],
    );
  });

  it("builds a practice configuration compatible with the student client", () => {
    const config = buildTeacherRoomConfig({
      contentMode: "math",
      source: "9 + 6",
      vocabularyDirection: "left-to-right",
      gameMode: "UEBUNG",
      shuffleWords: true,
      repeatWrongAnswers: true,
      vocabularyTransfer: "none",
    });
    expect(config).toMatchObject({
      gameMode: "UEBUNG",
      stationMode: false,
      uebungMaxAttempts: 3,
      uebungAssistanceEnabled: true,
      shuffleWords: true,
      repeatWrongAnswers: true,
      vocabularyTransfer: "none",
    });
    expect(config.words).toHaveLength(1);
  });

  it("carries the teacher vocabulary-transfer choice into the room", () => {
    const config = buildTeacherRoomConfig({
      contentMode: "vocabulary",
      source: "house;Haus",
      vocabularyDirection: "left-to-right",
      vocabularyTransfer: "all",
      gameMode: "UEBUNG",
      shuffleWords: false,
      repeatWrongAnswers: true,
    });
    expect(config.vocabularyTransfer).toBe("all");
  });

  it("preserves the distinct station and battle rules from Laufdiktat", () => {
    const station = buildTeacherRoomConfig({
      contentMode: "text",
      source: "Ein Wort.",
      vocabularyDirection: "left-to-right",
      gameMode: "STATION",
      shuffleWords: true,
      repeatWrongAnswers: true,
      stationCount: 28,
      stationShuffle: true,
    });
    expect(station).toMatchObject({
      gameMode: "UEBUNG",
      stationMode: true,
      stationCount: 28,
      stationShuffle: true,
      shuffleWords: false,
      showStars: false,
    });

    const battle = buildTeacherRoomConfig({
      contentMode: "text",
      source: "Ein Wort.",
      vocabularyDirection: "left-to-right",
      gameMode: "BATTLE",
      shuffleWords: false,
      repeatWrongAnswers: false,
      battleOptions: { ink: false, flicker: true },
    });
    expect(battle).toMatchObject({
      gameMode: "BATTLE",
      stationMode: false,
      battleOptions: { ink: false, flicker: true },
    });
  });

  it("generates valid mental-math source without eval", () => {
    const source = generateMentalMathSource({
      count: 12,
      min: 1,
      max: 20,
      operations: ["+", "-", "*", "/"],
    });
    expect(source.split("\n")).toHaveLength(12);
    expect(buildTeacherWords("math", source, "left-to-right")).toHaveLength(12);
  });

  it("carries generated gap tasks into the live room", () => {
    const source = generateMentalMathSource({
      count: 8,
      min: 0,
      max: 50,
      operations: ["+", "-"],
      gapMode: true,
      excludeZeroResult: true,
    });
    expect(source).toContain("=>");
    const words = buildTeacherWords("math", source, "left-to-right");
    expect(words).toHaveLength(8);
    expect(words.every((word) => word.prompt?.includes("_"))).toBe(true);
  });
});
