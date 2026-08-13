import { describe, expect, it } from "vitest";
import { buildTeacherRoomConfig, buildTeacherWords } from "./teacher-session";

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
    });
    expect(config).toMatchObject({
      gameMode: "UEBUNG",
      stationMode: false,
      uebungMaxAttempts: 3,
      uebungAssistanceEnabled: true,
      shuffleWords: true,
      repeatWrongAnswers: true,
    });
    expect(config.words).toHaveLength(1);
  });
});
