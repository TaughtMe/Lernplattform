import { beforeEach, describe, expect, it } from "vitest";
import {
  LOCK_IDLE_LIMIT_MS,
  NO_PIN_ATTEMPTS,
  isLocked,
} from "../domain/teacher-lock";
import { createPinVerifier } from "../integrations/crypto/pin";
import {
  TEACHER_LOCK_ATTEMPTS_KEY,
  TEACHER_LOCK_KEY,
  clearPinVerifier,
  lockSessionSnapshot,
  markUnlocked,
  parsePinAttempts,
  parsePinVerifier,
  readPinAttempts,
  readPinVerifier,
  resetLockSession,
  savePinAttempts,
  savePinVerifier,
  touchLockSession,
} from "./teacher-lock";

const T0 = Date.parse("2026-10-27T08:00:00.000Z");

beforeEach(() => {
  localStorage.clear();
  resetLockSession();
});

describe("Prüfwert der PIN", () => {
  it("wird gespeichert, gelesen und gelöscht, ohne die PIN zu enthalten", async () => {
    expect(readPinVerifier()).toBeNull();
    const verifier = await createPinVerifier("482913", 1000);
    expect(savePinVerifier(verifier)).toBe(true);
    expect(readPinVerifier()).toEqual(verifier);
    expect(localStorage.getItem(TEACHER_LOCK_KEY)).not.toContain("482913");
    expect(clearPinVerifier()).toBe(true);
    expect(readPinVerifier()).toBeNull();
  });

  it("liest Kaputtes und Fremdes als „keine PIN“", () => {
    for (const raw of ["", "x", "null", '{"v":1}', '{"v":1,"salt":1}']) {
      expect(parsePinVerifier(raw), raw).toBeNull();
    }
  });
});

describe("Falsche Eingaben", () => {
  it("überstehen ein Neuladen und werden mit dem Zähler 0 gelöscht", () => {
    expect(readPinAttempts()).toEqual(NO_PIN_ATTEMPTS);
    const attempts = { failures: 0, lockedUntil: T0 + 60_000 };
    expect(savePinAttempts(attempts)).toBe(true);
    expect(readPinAttempts()).toEqual(attempts);
    expect(savePinAttempts({ failures: 0, lockedUntil: null })).toBe(true);
    expect(localStorage.getItem(TEACHER_LOCK_ATTEMPTS_KEY)).toBeNull();
  });

  it("liest Kaputtes und Fremdes als „keine falschen Eingaben“", () => {
    for (const raw of [
      "",
      "x",
      "null",
      "[]",
      '{"failures":-1,"lockedUntil":null}',
      '{"failures":1.5,"lockedUntil":null}',
      '{"failures":"2","lockedUntil":null}',
      '{"failures":1,"lockedUntil":"x"}',
      '{"failures":1}',
    ]) {
      expect(parsePinAttempts(raw), raw).toEqual(NO_PIN_ATTEMPTS);
    }
    expect(parsePinAttempts('{"failures":3,"lockedUntil":null}')).toEqual({
      failures: 3,
      lockedUntil: null,
    });
  });

  it("enden, wenn die Sperre aufgehoben wird", async () => {
    savePinAttempts({ failures: 3, lockedUntil: null });
    clearPinVerifier();
    expect(readPinAttempts()).toEqual(NO_PIN_ATTEMPTS);
  });
});

describe("Entsperrzustand", () => {
  it("beginnt gesperrt und wird durch Entsperren geöffnet", () => {
    const input = (now: number) => ({
      pinSet: true,
      ...lockSessionSnapshot(),
      now,
    });
    expect(isLocked(input(T0))).toBe(true);
    markUnlocked(T0);
    expect(isLocked(input(T0 + 1000))).toBe(false);
  });

  it("verschiebt die Sperre bei Nutzung, aber nicht über eine fällige hinweg", () => {
    markUnlocked(T0);
    const minute = 60_000;
    touchLockSession(T0 + 10 * minute);
    expect(lockSessionSnapshot().lastActivityAt).toBe(T0 + 10 * minute);

    // Nach 25 Minuten (15 nach der letzten Nutzung) ist die Sperre fällig.
    const due = T0 + 10 * minute + LOCK_IDLE_LIMIT_MS;
    touchLockSession(due);
    expect(lockSessionSnapshot().lastActivityAt).toBe(T0 + 10 * minute);
    expect(isLocked({ pinSet: true, ...lockSessionSnapshot(), now: due })).toBe(
      true,
    );
  });

  it("ignoriert Nutzung vor dem ersten Entsperren", () => {
    touchLockSession(T0);
    expect(lockSessionSnapshot()).toEqual({
      unlockedAt: null,
      lastActivityAt: null,
    });
  });
});
