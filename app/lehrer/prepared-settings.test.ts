import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCAL_DATA_AREAS } from "../../src/storage/local-data-boundaries";
import { createTeacherContentLibraryRepository } from "../../src/storage/teacher-class-settings";
import { initialGameSettings } from "./live/hooks/use-game-settings";
import {
  gameSettingsPatchOf,
  preparedSettingsOf,
  savePreparedSettings,
  TEACHER_DATA_EVENT,
  type LivePreparation,
} from "./prepared-settings";

const live = (over: Partial<LivePreparation> = {}): LivePreparation => ({
  contentMode: "text",
  settings: initialGameSettings(),
  direction: "left-to-right",
  caseSensitive: false,
  vocabularyTransfer: "none",
  roundTag: "",
  wordStoreTransfer: "errors",
  ...over,
});

afterEach(async () => {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(LOCAL_DATA_AREAS.teacher);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
});

describe("preparedSettingsOf", () => {
  it("nimmt Modus und Spieloptionen, Mathe nur bei Mathe", () => {
    const text = preparedSettingsOf(
      live({
        settings: { ...initialGameSettings(), gameMode: "BATTLE", tts: true },
      }),
    );
    expect(text).toMatchObject({
      gameMode: "BATTLE",
      tts: true,
      stationCount: 20,
      wordStoreTransfer: "errors",
    });
    expect(text).not.toHaveProperty("mathGap");
    expect(text).not.toHaveProperty("direction");

    const math = preparedSettingsOf(
      live({
        contentMode: "math",
        settings: { ...initialGameSettings(), mathGap: true, mathTables: [6] },
      }),
    );
    expect(math).toMatchObject({ mathGap: true, mathTables: [6] });
    expect(math).not.toHaveProperty("wordStoreTransfer");
  });

  it("nimmt bei Vokabeln Richtung, LernBox und Tag", () => {
    expect(
      preparedSettingsOf(
        live({
          contentMode: "vocabulary",
          direction: "mixed",
          caseSensitive: true,
          vocabularyTransfer: "all",
          roundTag: "  Unit 4  ",
        }),
      ),
    ).toMatchObject({
      direction: "mixed",
      caseSensitive: true,
      vocabularyTransfer: "all",
      vocabularyTag: "Unit 4",
    });
  });

  it("lässt Werte außerhalb der Grenzen weg", () => {
    const prepared = preparedSettingsOf(
      live({
        settings: { ...initialGameSettings(), stationCount: 0, attempts: 2.5 },
      }),
    );
    expect(prepared).not.toHaveProperty("stationCount");
    expect(prepared).not.toHaveProperty("attempts");
    expect(prepared.gameMode).toBe("LAUFDIKTAT");
  });
});

describe("gameSettingsPatchOf", () => {
  it("übernimmt nur gespeicherte Optionen", () => {
    expect(
      gameSettingsPatchOf({
        gameMode: "STATION",
        stationCount: 6,
        mathOps: ["*"],
        direction: "mixed",
      }),
    ).toEqual({ gameMode: "STATION", stationCount: 6, mathOps: ["*"] });
  });

  it("stellt die Optionen einer Vorbereitung wieder her", () => {
    const settings = { ...initialGameSettings(), gameMode: "UEBUNG" as const };
    const patch = gameSettingsPatchOf(
      preparedSettingsOf(live({ contentMode: "math", settings })),
    );
    expect({ ...initialGameSettings(), ...patch }).toEqual(settings);
  });
});

describe("savePreparedSettings", () => {
  it("speichert die Vorbereitung und meldet die Änderung", async () => {
    const library = createTeacherContentLibraryRepository();
    await library.put({
      id: "x",
      revision: 1,
      title: "Herbst im Wald",
      source: "Die Blätter fallen.",
      promptLocale: "en",
      answerLocale: "de",
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-01T08:00:00.000Z",
      kind: "text",
      lastUsedAt: "2026-10-02T08:00:00.000Z",
    });
    const changed = vi.fn();
    window.addEventListener(TEACHER_DATA_EVENT, changed);
    await expect(
      savePreparedSettings(
        "x",
        { gameMode: "STATION", stationCount: 5 },
        "2026-10-03T08:00:00.000Z",
      ),
    ).resolves.toBe(true);
    window.removeEventListener(TEACHER_DATA_EVENT, changed);
    expect(changed).toHaveBeenCalledOnce();
    expect(await library.get("x")).toMatchObject({
      preparedAt: "2026-10-03T08:00:00.000Z",
      prepared: { gameMode: "STATION", stationCount: 5 },
    });
    await expect(
      savePreparedSettings("fehlt", { gameMode: "LAUFDIKTAT" }),
    ).resolves.toBe(false);
  });
});
