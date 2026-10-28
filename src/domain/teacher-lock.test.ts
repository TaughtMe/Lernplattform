import { describe, expect, it } from "vitest";
import {
  LOCK_IDLE_LIMIT_MS,
  isLocked,
  isValidPin,
  msUntilLock,
  sanitizePinInput,
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
