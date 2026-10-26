import { beforeEach, describe, expect, it } from "vitest";
import {
  GUEST_MODE_KEY,
  GUEST_MODE_MAX_AGE_MS,
  decideGuestCleanup,
  guestModeSnapshot,
  isGuestModeExpired,
  parseGuestMode,
  readGuestMode,
  startGuestMode,
} from "./guest-mode";

const classId = "123e4567-e89b-42d3-a456-426614174001";
const started = new Date("2026-10-26T08:00:00.000Z");
const later = (ms: number) => new Date(started.getTime() + ms);
const hours = (count: number) => count * 60 * 60_000;

beforeEach(() => localStorage.clear());

describe("Gastzustand", () => {
  it("wird gespeichert und wieder gelesen", () => {
    expect(readGuestMode()).toBeNull();
    expect(startGuestMode(classId, started)).toBe(true);
    expect(readGuestMode()).toEqual({
      v: 1,
      startedAt: "2026-10-26T08:00:00.000Z",
      classId,
    });
    expect(guestModeSnapshot()).toBe(localStorage.getItem(GUEST_MODE_KEY));
  });

  it("liest Kaputtes und Fremdes als „kein Gastmodus“", () => {
    for (const raw of [
      "",
      "kein json",
      "null",
      "[]",
      '{"v":2,"startedAt":"2026-10-26T08:00:00.000Z","classId":"' +
        classId +
        '"}',
      '{"v":1,"startedAt":"gestern","classId":"' + classId + '"}',
      '{"v":1,"startedAt":"2026-10-26T08:00:00.000Z","classId":"x"}',
    ]) {
      expect(parseGuestMode(raw), raw).toBeNull();
    }
  });

  it("toleriert zusätzliche Felder", () => {
    const raw = JSON.stringify({
      v: 1,
      startedAt: started.toISOString(),
      classId,
      spaeter: true,
    });
    expect(parseGuestMode(raw)?.classId).toBe(classId);
  });

  it("meldet ein nicht schreibbares Speichern", () => {
    expect(
      startGuestMode(classId, started, () => ({
        getItem: () => null,
        setItem: () => {
          throw new Error("voll");
        },
      })),
    ).toBe(false);
  });
});

describe("Bereinigung beim App-Start", () => {
  const state = { v: 1 as const, startedAt: started.toISOString(), classId };

  it("tut ohne Gastmodus nichts", () => {
    expect(decideGuestCleanup(null, started)).toBe("none");
  });

  it("lässt einen Gastmodus bis 12 Stunden weiterlaufen", () => {
    expect(decideGuestCleanup(state, started)).toBe("keep");
    expect(decideGuestCleanup(state, later(hours(11)))).toBe("keep");
    expect(decideGuestCleanup(state, later(GUEST_MODE_MAX_AGE_MS))).toBe(
      "keep",
    );
  });

  it("beendet einen Gastmodus nach mehr als 12 Stunden", () => {
    expect(decideGuestCleanup(state, later(GUEST_MODE_MAX_AGE_MS + 1))).toBe(
      "end",
    );
    expect(decideGuestCleanup(state, later(hours(30)))).toBe("end");
  });

  it("beendet einen Gastmodus, dessen Start weit in der Zukunft liegt", () => {
    expect(isGuestModeExpired(state, later(-60_000))).toBe(false);
    expect(isGuestModeExpired(state, later(-hours(2)))).toBe(true);
  });
});
