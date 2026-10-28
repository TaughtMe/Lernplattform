import { describe, expect, it } from "vitest";
import {
  buildMathPracticeOptions,
  buildMathWords,
  buildTeacherRoomConfig,
  buildTeacherWords,
  generateMentalMathSource,
  generateSingleMathLine,
  mathPracticeOperations,
  type TeacherMathSettings,
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

  it("offers the task after errors only for math and lets the teacher switch it off", () => {
    const base = {
      source: "9 + 6",
      vocabularyDirection: "left-to-right" as const,
      gameMode: "UEBUNG" as const,
      shuffleWords: false,
      repeatWrongAnswers: false,
      vocabularyTransfer: "none" as const,
    };
    expect(
      buildTeacherRoomConfig({ ...base, contentMode: "math" })
        .showTaskAfterErrors,
    ).toBe(true);
    expect(
      buildTeacherRoomConfig({
        ...base,
        contentMode: "math",
        showTaskAfterErrors: false,
      }).showTaskAfterErrors,
    ).toBe(false);
    expect(
      buildTeacherRoomConfig({ ...base, contentMode: "text" })
        .showTaskAfterErrors,
    ).toBe(false);
  });

  it("builds the upstream classic Laufdiktat without assistance", () => {
    const config = buildTeacherRoomConfig({
      contentMode: "text",
      source: "Der Schulweg ist kurz.",
      vocabularyDirection: "left-to-right",
      gameMode: "LAUFDIKTAT",
      shuffleWords: false,
      repeatWrongAnswers: true,
    });

    expect(config).toMatchObject({
      gameMode: "LAUFDIKTAT",
      stationMode: false,
      uebungMaxAttempts: 1,
      uebungAssistanceEnabled: false,
      repeatWrongAnswers: false,
    });
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

  it("übergibt die Wortspeicher-Wahl nur bei Texten, Standard „errors“", () => {
    const base = {
      vocabularyDirection: "left-to-right" as const,
      gameMode: "UEBUNG" as const,
      shuffleWords: false,
      repeatWrongAnswers: true,
    };
    expect(
      buildTeacherRoomConfig({
        ...base,
        contentMode: "text",
        source: "Ein Satz.",
      }).wordStoreTransfer,
    ).toBe("errors");
    expect(
      buildTeacherRoomConfig({
        ...base,
        contentMode: "text",
        source: "Ein Satz.",
        wordStoreTransfer: "all",
      }).wordStoreTransfer,
    ).toBe("all");
    expect(
      buildTeacherRoomConfig({
        ...base,
        contentMode: "vocabulary",
        source: "house;Haus",
        wordStoreTransfer: "all",
      }).wordStoreTransfer,
    ).toBe("none");
    expect(
      buildTeacherRoomConfig({
        ...base,
        contentMode: "math",
        source: "1 + 1",
        wordStoreTransfer: "all",
      }).wordStoreTransfer,
    ).toBe("none");
  });

  it("schaltet Tempo-Punkte nur auf Wunsch ein und nie bei Stationen", () => {
    const base = {
      contentMode: "text" as const,
      source: "Ein Wort.",
      vocabularyDirection: "left-to-right" as const,
      shuffleWords: false,
      repeatWrongAnswers: false,
    };
    expect(
      buildTeacherRoomConfig({ ...base, gameMode: "LAUFDIKTAT" })
        .showTempoPoints,
    ).toBe(false);
    expect(
      buildTeacherRoomConfig({
        ...base,
        gameMode: "BATTLE",
        showTempoPoints: true,
      }).showTempoPoints,
    ).toBe(true);
    expect(
      buildTeacherRoomConfig({
        ...base,
        gameMode: "STATION",
        showTempoPoints: true,
      }).showTempoPoints,
    ).toBe(false);
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

describe("Kopfrechnen der Lehrkraft", () => {
  const settings: TeacherMathSettings = {
    min: 1,
    max: 9,
    operations: ["+", "-", "*", "/"],
    allowNegativeResults: true,
    excludeZeroOperand: true,
    excludeZeroResult: false,
    tables: [2, 3],
    gap: true,
  };

  it("übersetzt Operatoren und fällt ohne Auswahl auf Addition zurück", () => {
    expect(mathPracticeOperations(["+", "-", "*", "/"])).toEqual([
      "add",
      "subtract",
      "multiply",
      "divide",
    ]);
    expect(mathPracticeOperations([])).toEqual(["add"]);
  });

  it("baut die Übungsoptionen mit fester Anzahl 10", () => {
    expect(buildMathPracticeOptions(settings)).toEqual({
      operations: ["add", "subtract", "multiply", "divide"],
      minValue: 1,
      maxValue: 9,
      count: 10,
      allowNegativeResults: true,
      excludeZeroOperand: true,
      excludeZeroResult: false,
      multiplicationTables: [2, 3],
      gapMode: true,
    });
  });

  it("erzeugt genau eine auswertbare Zeile", () => {
    const line = generateSingleMathLine({
      ...settings,
      operations: [],
      gap: false,
      tables: [],
    });
    expect(line).not.toContain("\n");
    expect(line.length).toBeGreaterThan(0);
  });

  it("macht ohne Lückenmodus Ausdruck und Ergebnis, ungültige Zeilen entfallen", () => {
    expect(buildMathWords(["3+4", "kein Term", "10 - 2"], false, [])).toEqual([
      {
        id: "math-0-expression",
        kind: "math",
        prompt: "3 + 4",
        targetWord: "7",
      },
      {
        id: "math-2-expression",
        kind: "math",
        prompt: "10 − 2",
        targetWord: "8",
      },
    ]);
  });

  it("verdeckt im Lückenmodus vorgabemäßig die letzte Zahl", () => {
    const [word] = buildMathWords(["3 + 4"], true, []);
    expect(word).toMatchObject({
      id: "math-0-gap-1",
      targetWord: "4",
      prompt: "3 + _ = 7",
    });
  });

  it("verdeckt mit Lückenindex hinter der letzten Zahl das Ergebnis", () => {
    const [word] = buildMathWords(["3 + 4"], true, [2]);
    expect(word).toMatchObject({
      id: "math-0-gap-2",
      targetWord: "7",
      prompt: "3 + 4 = _",
    });
    const [first] = buildMathWords(["3 + 4"], true, [0]);
    expect(first).toMatchObject({ id: "math-0-gap-0", targetWord: "3" });
  });

  it("kennzeichnet LaTeX-Zeilen", () => {
    const [word] = buildMathWords(["\\frac{1}{2}"], false, []);
    expect(word).toMatchObject({ isLatex: true, targetWord: "0.5" });
  });
});
