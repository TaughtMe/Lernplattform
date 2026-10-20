// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { parseLiveSession } from "../../../../src/integrations/laufdiktat/live-session";
import { buildTeacherRoomConfig } from "../../../../src/integrations/laufdiktat/teacher-session";
import { useContentRestore } from "./use-content-restore";

/** Abdruck eines Klassenstempels: 43 Zeichen aus dem URL-sicheren Alphabet. */
const SEAL = "a".repeat(43);

function setup() {
  const calls = {
    setContentMode: vi.fn(),
    setSources: vi.fn(),
    loadPairsFromTable: vi.fn(),
    patchSettings: vi.fn(),
    setVocabularyTransfer: vi.fn(),
    setWordStoreTransfer: vi.fn(),
    setRoundTag: vi.fn(),
    setRestoredClassSeal: vi.fn(),
    setDirection: vi.fn(),
    setVocabularyCaseSensitive: vi.fn(),
  };
  const { result } = renderHook(() => useContentRestore(calls));
  return {
    apply: result.current.applyRestoredContent,
    prepare: result.current.applyPreparedSettings,
    calls,
  };
}

function restored(options: Parameters<typeof buildTeacherRoomConfig>[0]) {
  return parseLiveSession(
    buildTeacherRoomConfig(options),
    "lobby",
    "teacher-restore",
  );
}

const BASE = {
  contentMode: "text" as const,
  source: "Der Hund bellt.\nDie Katze miaut.",
  vocabularyDirection: "left-to-right" as const,
  vocabularyTransfer: "none" as const,
  wordStoreTransfer: "errors" as const,
  vocabularyTag: "",
  gameMode: "UEBUNG" as const,
  shuffleWords: true,
  repeatWrongAnswers: false,
  isTtsEnabled: true,
  uebungMaxAttempts: 4,
  uebungAssistanceEnabled: false,
  showStars: false,
  strictTypingMode: true,
  showTaskAfterErrors: false,
  stationCount: 14,
  stationShuffle: false,
  battleOptions: { ink: false, flicker: true },
};

describe("useContentRestore", () => {
  it("holt Text und Optionen zurück in den Editor", () => {
    const { apply, calls } = setup();
    apply(restored({ ...BASE, classSeal: SEAL }));
    expect(calls.setContentMode).toHaveBeenCalledWith("text");
    const update = calls.setSources.mock.calls[0]![0] as (
      current: Record<string, string>,
    ) => Record<string, string>;
    const next = update({ text: "alt", vocabulary: "v", math: "m" });
    // Gemischte Räume kommen mit ihrer Reihenfolge zurück; die Zeilen sind dieselben.
    expect(next["text"]?.split("\n").sort()).toEqual([
      "Der Hund bellt.",
      "Die Katze miaut.",
    ]);
    expect(next).toMatchObject({ vocabulary: "v", math: "m" });
    expect(calls.loadPairsFromTable).not.toHaveBeenCalled();
    expect(calls.patchSettings).toHaveBeenCalledWith({
      gameMode: "UEBUNG",
      shuffleWords: true,
      stationShuffle: false,
      repeatWrongAnswers: false,
      assistance: false,
      attempts: 4,
      tts: true,
      showStars: false,
      strictTyping: true,
      taskHelp: false,
      stationCount: 14,
      battleInk: false,
      battleFlicker: true,
    });
    expect(calls.setVocabularyTransfer).toHaveBeenCalledWith("none");
    expect(calls.setWordStoreTransfer).toHaveBeenCalledWith("errors");
    expect(calls.setRoundTag).toHaveBeenCalledWith("");
    expect(calls.setRestoredClassSeal).toHaveBeenCalledWith(SEAL);
  });

  it("macht aus einem Stationsraum den Modus Stationen", () => {
    const { apply, calls } = setup();
    apply(restored({ ...BASE, gameMode: "STATION" }));
    expect(calls.patchSettings).toHaveBeenCalledWith(
      expect.objectContaining({ gameMode: "STATION" }),
    );
  });

  it("erkennt Vokabeln, lädt die Paare und merkt den Tag der Runde", () => {
    const { apply, calls } = setup();
    apply(
      restored({
        ...BASE,
        contentMode: "vocabulary",
        source: "dog;Hund\ncat;Katze",
        vocabularyTransfer: "all",
        vocabularyTag: "Tiere",
      }),
    );
    expect(calls.setContentMode).toHaveBeenCalledWith("vocabulary");
    expect(calls.loadPairsFromTable).toHaveBeenCalledTimes(1);
    expect(calls.loadPairsFromTable.mock.calls[0]![0]).toContain(";");
    expect(calls.setVocabularyTransfer).toHaveBeenCalledWith("all");
    expect(calls.setRoundTag).toHaveBeenCalledWith("Tiere");
  });

  it("erkennt Mathe-Aufgaben und nimmt den Aufgabentext", () => {
    const { apply, calls } = setup();
    apply(
      restored({
        ...BASE,
        contentMode: "math",
        source: "1 + 2\n3 + 4",
      }),
    );
    expect(calls.setContentMode).toHaveBeenCalledWith("math");
    const update = calls.setSources.mock.calls[0]![0] as (
      current: Record<string, string>,
    ) => Record<string, string>;
    expect(update({ text: "", vocabulary: "", math: "" })["math"]).toContain(
      "1 + 2",
    );
    expect(calls.loadPairsFromTable).not.toHaveBeenCalled();
  });

  it("holt Modus und Optionen einer Vorbereitung, ohne Ungenanntes zu ändern", () => {
    const { prepare, calls } = setup();
    prepare({
      gameMode: "BATTLE",
      battleInk: false,
      direction: "mixed",
      caseSensitive: true,
      vocabularyTransfer: "all",
      vocabularyTag: "Unit 4",
    });
    expect(calls.patchSettings).toHaveBeenCalledWith({
      gameMode: "BATTLE",
      battleInk: false,
    });
    expect(calls.setDirection).toHaveBeenCalledWith("mixed");
    expect(calls.setVocabularyCaseSensitive).toHaveBeenCalledWith(true);
    expect(calls.setVocabularyTransfer).toHaveBeenCalledWith("all");
    expect(calls.setRoundTag).toHaveBeenCalledWith("Unit 4");
    expect(calls.setWordStoreTransfer).not.toHaveBeenCalled();

    const text = setup();
    text.prepare({ gameMode: "LAUFDIKTAT", wordStoreTransfer: "all" });
    expect(text.calls.setWordStoreTransfer).toHaveBeenCalledWith("all");
    expect(text.calls.setDirection).not.toHaveBeenCalled();
    expect(text.calls.setRoundTag).not.toHaveBeenCalled();
  });
});
