import { describe, expect, it } from "vitest";
import {
  buildMathPracticeOptions,
  buildTeacherRoomConfig,
} from "../../../../src/integrations/laufdiktat/teacher-session";
import { initialGameSettings } from "../hooks/use-game-settings";
import { buildLiveRoomConfig } from "./room-config";

const WORDS = [
  { id: "w1", kind: "text" as const, targetWord: "Hund" },
  { id: "w2", kind: "text" as const, targetWord: "Katze" },
];

const BASE = {
  contentMode: "text" as const,
  source: "Hund Katze",
  direction: "left-to-right" as const,
  vocabularyTransfer: "none" as const,
  wordStoreTransfer: "errors" as const,
  vocabularyTag: "",
  classSeal: undefined,
  settings: initialGameSettings(),
  words: WORDS,
};

describe("buildLiveRoomConfig", () => {
  it("übersetzt die Optionen wie die bisherige Zuordnung im Hook", () => {
    const settings = {
      ...initialGameSettings(),
      gameMode: "BATTLE" as const,
      shuffleWords: true,
      repeatWrongAnswers: false,
      tts: true,
      attempts: 5,
      assistance: false,
      showStars: false,
      strictTyping: true,
      taskHelp: false,
      stationCount: 12,
      stationShuffle: false,
      battleInk: false,
      battleFlicker: false,
    };
    expect(
      buildLiveRoomConfig({
        ...BASE,
        settings,
        vocabularyTag: "Tiere",
        classSeal: "fp-1",
      }),
    ).toEqual(
      buildTeacherRoomConfig({
        contentMode: "text",
        source: "Hund Katze",
        vocabularyDirection: "left-to-right",
        vocabularyTransfer: "none",
        wordStoreTransfer: "errors",
        vocabularyTag: "Tiere",
        classSeal: "fp-1",
        gameMode: "BATTLE",
        shuffleWords: true,
        repeatWrongAnswers: false,
        isTtsEnabled: true,
        uebungMaxAttempts: 5,
        uebungAssistanceEnabled: false,
        showStars: false,
        strictTypingMode: true,
        showTaskAfterErrors: false,
        stationCount: 12,
        stationShuffle: false,
        battleOptions: { ink: false, flicker: false },
        wordsOverride: WORDS,
      }),
    );
  });

  it("nimmt Mathe-Optionen nur im Mathe-Modus mit", () => {
    const settings = {
      ...initialGameSettings(),
      mathMin: 2,
      mathMax: 9,
      mathOps: ["+" as const, "*" as const],
      mathAllowNegative: true,
      mathExcludeZeroOperand: true,
      mathExcludeZeroResult: true,
      mathTables: [3, 4],
      mathGap: true,
    };
    const math = buildLiveRoomConfig({
      ...BASE,
      contentMode: "math",
      settings,
    });
    expect(math).toEqual(
      buildTeacherRoomConfig({
        contentMode: "math",
        source: "Hund Katze",
        vocabularyDirection: "left-to-right",
        vocabularyTransfer: "none",
        wordStoreTransfer: "errors",
        vocabularyTag: "",
        gameMode: "LAUFDIKTAT",
        shuffleWords: false,
        repeatWrongAnswers: true,
        isTtsEnabled: false,
        uebungMaxAttempts: 3,
        uebungAssistanceEnabled: true,
        showStars: true,
        strictTypingMode: false,
        showTaskAfterErrors: true,
        stationCount: 20,
        stationShuffle: true,
        battleOptions: { ink: true, flicker: true },
        wordsOverride: WORDS,
        mathPracticeOptions: buildMathPracticeOptions({
          min: 2,
          max: 9,
          operations: ["+", "*"],
          allowNegativeResults: true,
          excludeZeroOperand: true,
          excludeZeroResult: true,
          tables: [3, 4],
          gap: true,
        }),
      }),
    );
    expect(
      buildLiveRoomConfig({ ...BASE, contentMode: "text", settings }),
    ).not.toHaveProperty("mathPracticeOptions");
  });

  it("lässt den Klassenstempel ohne Klasse weg", () => {
    const without = buildLiveRoomConfig(BASE);
    const withSeal = buildLiveRoomConfig({ ...BASE, classSeal: "fp-1" });
    expect(JSON.stringify(without)).not.toContain("fp-1");
    expect(JSON.stringify(withSeal)).toContain("fp-1");
  });
});
