import { describe, expect, it } from "vitest";
import { initialGameSettings } from "../hooks/use-game-settings";
import { preparedSettingsOf } from "./prepared-settings";

describe("preparedSettingsOf", () => {
  it("nimmt Modus und Raumoptionen mit, aber keine Mathe-Einstellungen", () => {
    const prepared = preparedSettingsOf({
      settings: {
        ...initialGameSettings(),
        gameMode: "STATION",
        stationCount: 6,
        tts: true,
        mathMax: 100,
      },
      wordStoreTransfer: "errors",
      vocabularyTransfer: "none",
      roundTag: "  Unit 3 ",
      classId: "klasse-7b",
    });
    expect(prepared.options).toMatchObject({
      gameMode: "STATION",
      stationCount: 6,
      tts: true,
      battleInk: true,
    });
    expect(prepared.options).not.toHaveProperty("mathMax");
    expect(prepared).toMatchObject({
      wordStoreTransfer: "errors",
      vocabularyTransfer: "none",
      roundTag: "Unit 3",
      classId: "klasse-7b",
    });
  });
});
