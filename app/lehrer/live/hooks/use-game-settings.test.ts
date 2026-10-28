import { describe, expect, it } from "vitest";
import { gameSettingsReducer, initialGameSettings } from "./use-game-settings";

describe("gameSettingsReducer", () => {
  it("startet mit den bisherigen Standardwerten", () => {
    expect(initialGameSettings()).toEqual({
      gameMode: "LAUFDIKTAT",
      shuffleWords: false,
      stationShuffle: true,
      repeatWrongAnswers: true,
      assistance: true,
      attempts: 3,
      tts: false,
      showStars: true,
      showTempoPoints: false,
      strictTyping: false,
      taskHelp: true,
      stationCount: 20,
      battleInk: true,
      battleFlicker: true,
      mathCount: 10,
      mathMin: 0,
      mathMax: 20,
      mathOps: ["+", "-"],
      mathAllowNegative: false,
      mathExcludeZeroOperand: false,
      mathExcludeZeroResult: false,
      mathGap: false,
      mathTables: [],
    });
  });

  it("gibt jedem Aufruf frische Listen, damit nichts geteilt wird", () => {
    const first = initialGameSettings();
    const second = initialGameSettings();
    expect(first.mathOps).not.toBe(second.mathOps);
    expect(first.mathTables).not.toBe(second.mathTables);
  });

  it("setzt einen Wert direkt oder über eine Funktion des alten Wertes", () => {
    const start = initialGameSettings();
    const direct = gameSettingsReducer(start, {
      type: "set",
      key: "attempts",
      value: 5,
    });
    expect(direct.attempts).toBe(5);
    const viaFunction = gameSettingsReducer(direct, {
      type: "set",
      key: "attempts",
      value: (current) => current + 1,
    });
    expect(viaFunction.attempts).toBe(6);
    expect(start.attempts).toBe(3);
  });

  it("lässt den Zustand unverändert, wenn der Wert gleich bleibt", () => {
    const start = initialGameSettings();
    expect(
      gameSettingsReducer(start, { type: "set", key: "tts", value: false }),
    ).toBe(start);
    expect(
      gameSettingsReducer(start, {
        type: "set",
        key: "stationCount",
        value: (current) => current,
      }),
    ).toBe(start);
  });

  it("übernimmt mehrere Optionen auf einmal und lässt die übrigen stehen", () => {
    const start = initialGameSettings();
    const next = gameSettingsReducer(start, {
      type: "patch",
      patch: { gameMode: "STATION", stationCount: 12, tts: true },
    });
    expect(next).toEqual({
      ...start,
      gameMode: "STATION",
      stationCount: 12,
      tts: true,
    });
  });

  it("lässt den Zustand bei einem Patch ohne Änderung unverändert", () => {
    const start = initialGameSettings();
    expect(
      gameSettingsReducer(start, { type: "patch", patch: { attempts: 3 } }),
    ).toBe(start);
    expect(gameSettingsReducer(start, { type: "patch", patch: {} })).toBe(
      start,
    );
  });
});
