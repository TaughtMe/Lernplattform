import * as z from "zod";
import { afterEach, describe, expect, it } from "vitest";
import { buildRoundSnapshot } from "../domain/round-snapshot";
import { STUDENT_LOCAL_KEYS } from "./clear-student-data";
import {
  ROUND_SNAPSHOT_KEYS,
  clearRoundSnapshot,
  loadRoundSnapshot,
  saveRoundSnapshot,
} from "./round-snapshot";

const schema = z.object({ index: z.number().int() });

function build(index = 3) {
  return buildRoundSnapshot({
    module: "laufdiktat",
    roundId: "r-1",
    startedAt: new Date().toISOString(),
    now: new Date(),
    done: index,
    total: 10,
    state: { index },
  });
}

afterEach(() => localStorage.clear());

describe("Zwischenstand im localStorage", () => {
  it("speichert, liest und löscht je Modul", () => {
    expect(saveRoundSnapshot(build())).toBe(true);
    expect(localStorage.getItem(ROUND_SNAPSHOT_KEYS.laufdiktat)).not.toBeNull();
    expect(loadRoundSnapshot("laufdiktat", schema)?.state).toEqual({
      index: 3,
    });
    // Ein anderes Modul sieht den Eintrag nicht.
    expect(loadRoundSnapshot("lernbox", schema)).toBeNull();
    clearRoundSnapshot("laufdiktat");
    expect(loadRoundSnapshot("laufdiktat", schema)).toBeNull();
  });

  it("liest Kaputtes als „kein Zwischenstand“", () => {
    localStorage.setItem(ROUND_SNAPSHOT_KEYS.laufdiktat, "{kaputt");
    expect(loadRoundSnapshot("laufdiktat", schema)).toBeNull();
  });

  it("überlebt einen gesperrten Speicher", () => {
    const blocked = () => {
      throw new Error("gesperrt");
    };
    expect(saveRoundSnapshot(build(), blocked)).toBe(false);
    expect(
      loadRoundSnapshot("laufdiktat", schema, { getStorage: blocked }),
    ).toBeNull();
    expect(() => clearRoundSnapshot("laufdiktat", blocked)).not.toThrow();
  });

  it("meldet einen vollen Speicher, ohne zu werfen", () => {
    const full = () => ({
      getItem: () => null,
      removeItem: () => undefined,
      setItem: () => {
        throw new DOMException("voll", "QuotaExceededError");
      },
    });
    expect(saveRoundSnapshot(build(), full)).toBe(false);
  });

  it("steht in der Liste der Schülerschlüssel (Gerätelöschen, Gastmodus)", () => {
    for (const key of Object.values(ROUND_SNAPSHOT_KEYS)) {
      expect(STUDENT_LOCAL_KEYS).toContain(key);
    }
  });
});
