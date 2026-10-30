import { describe, expect, it } from "vitest";
import {
  LOCK_IDLE_LIMIT_MS,
  MAX_PIN_ATTEMPTS,
  NO_PIN_ATTEMPTS,
  PIN_LOCKOUT_MS,
  describePinWait,
  isLocked,
  isValidPin,
  msUntilLock,
  pinAttemptsLeft,
  pinWaitMs,
  recordWrongPin,
  resetPinAttempts,
  sanitizePinInput,
  type PinAttempts,
} from "./teacher-lock";

const T0 = Date.parse("2026-10-27T08:00:00.000Z");
const MINUTE = 60_000;

describe("PIN", () => {
  it("verlangt genau 6 Ziffern", () => {
    expect(isValidPin("123456")).toBe(true);
    expect(isValidPin("12345")).toBe(false);
    expect(isValidPin("1234567")).toBe(false);
    expect(isValidPin("12345a")).toBe(false);
    expect(isValidPin("١٢٣٤٥٦")).toBe(false);
    expect(isValidPin("")).toBe(false);
  });

  it("behält bei der Eingabe nur Ziffern, höchstens 6", () => {
    expect(sanitizePinInput("12 34-56")).toBe("123456");
    expect(sanitizePinInput("12345678")).toBe("123456");
    expect(sanitizePinInput("abc")).toBe("");
  });
});

describe("Sperre", () => {
  const base = { pinSet: true, unlockedAt: T0, lastActivityAt: null };

  it("ist ohne PIN nie gesperrt", () => {
    expect(
      isLocked({
        pinSet: false,
        unlockedAt: null,
        lastActivityAt: null,
        now: T0,
      }),
    ).toBe(false);
  });

  it("sperrt nach dem Start, solange nicht entsperrt wurde", () => {
    expect(
      isLocked({
        pinSet: true,
        unlockedAt: null,
        lastActivityAt: null,
        now: T0,
      }),
    ).toBe(true);
  });

  it("bleibt nach dem Entsperren offen und sperrt nach 15 Minuten ohne Nutzung", () => {
    expect(isLocked({ ...base, now: T0 + 14 * MINUTE })).toBe(false);
    expect(isLocked({ ...base, now: T0 + LOCK_IDLE_LIMIT_MS - 1 })).toBe(false);
    expect(isLocked({ ...base, now: T0 + LOCK_IDLE_LIMIT_MS })).toBe(true);
  });

  it("rechnet die Leerlaufzeit ab der letzten Nutzung", () => {
    const active = { ...base, lastActivityAt: T0 + 10 * MINUTE };
    expect(isLocked({ ...active, now: T0 + 24 * MINUTE })).toBe(false);
    expect(isLocked({ ...active, now: T0 + 25 * MINUTE })).toBe(true);
  });

  it("sperrt, wenn die Uhr deutlich zurückgestellt wurde", () => {
    expect(isLocked({ ...base, now: T0 - 30_000 })).toBe(false);
    expect(isLocked({ ...base, now: T0 - 5 * MINUTE })).toBe(true);
  });

  it("nennt die Restzeit bis zur Sperre", () => {
    expect(msUntilLock({ ...base, now: T0 + 5 * MINUTE })).toBe(10 * MINUTE);
    expect(msUntilLock({ ...base, now: T0 + 20 * MINUTE })).toBe(0);
    expect(
      msUntilLock({
        pinSet: true,
        unlockedAt: null,
        lastActivityAt: null,
        now: T0,
      }),
    ).toBe(0);
  });
});

describe("Wartezeit nach falscher PIN", () => {
  function wrongTimes(count: number, start: PinAttempts = NO_PIN_ATTEMPTS) {
    let attempts = start;
    for (let i = 0; i < count; i += 1) attempts = recordWrongPin(attempts, T0);
    return attempts;
  }

  it("erlaubt 5 falsche Eingaben und sperrt dann für eine Minute", () => {
    const four = wrongTimes(MAX_PIN_ATTEMPTS - 1);
    expect(four).toEqual({ failures: 4, lockedUntil: null });
    expect(pinAttemptsLeft(four)).toBe(1);
    expect(pinWaitMs(four, T0)).toBe(0);

    const five = recordWrongPin(four, T0);
    expect(five.lockedUntil).toBe(T0 + PIN_LOCKOUT_MS);
    expect(pinWaitMs(five, T0)).toBe(PIN_LOCKOUT_MS);
    expect(pinWaitMs(five, T0 + 20_000)).toBe(40_000);
    expect(pinWaitMs(five, T0 + PIN_LOCKOUT_MS - 1)).toBe(1);
    expect(pinWaitMs(five, T0 + PIN_LOCKOUT_MS)).toBe(0);
  });

  it("zählt während der Wartezeit nichts mehr", () => {
    const locked = wrongTimes(MAX_PIN_ATTEMPTS);
    expect(recordWrongPin(locked, T0 + 10_000)).toBe(locked);
  });

  it("gibt nach der Wartezeit wieder 5 Versuche", () => {
    const locked = wrongTimes(MAX_PIN_ATTEMPTS);
    const later = T0 + PIN_LOCKOUT_MS + 1;
    let attempts = locked;
    for (let i = 0; i < MAX_PIN_ATTEMPTS - 1; i += 1) {
      attempts = recordWrongPin(attempts, later);
      expect(pinWaitMs(attempts, later)).toBe(0);
    }
    expect(pinAttemptsLeft(attempts)).toBe(1);
    expect(pinWaitMs(recordWrongPin(attempts, later), later)).toBe(
      PIN_LOCKOUT_MS,
    );
  });

  it("setzt den Zähler mit der richtigen PIN zurück", () => {
    expect(resetPinAttempts()).toEqual(NO_PIN_ATTEMPTS);
    expect(pinAttemptsLeft(resetPinAttempts())).toBe(MAX_PIN_ATTEMPTS);
  });

  it("wartet nie länger als eine Minute, auch wenn die Uhr zurückgestellt wurde", () => {
    const locked = wrongTimes(MAX_PIN_ATTEMPTS);
    expect(pinWaitMs(locked, T0 - 60 * MINUTE)).toBe(PIN_LOCKOUT_MS);
  });

  it("beschreibt die Restzeit in Sekunden und rundet auf", () => {
    expect(describePinWait(PIN_LOCKOUT_MS)).toBe("1 Minute");
    expect(describePinWait(45_000)).toBe("45 Sekunden");
    expect(describePinWait(44_100)).toBe("45 Sekunden");
    expect(describePinWait(1)).toBe("1 Sekunde");
  });
});
