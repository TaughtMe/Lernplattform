import { describe, expect, it } from "vitest";
import { localDayKey, nextLocalDayStart } from "./local-day";

describe("localDayKey", () => {
  it("bildet den lokalen Kalendertag mit führenden Nullen", () => {
    expect(localDayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(localDayKey(new Date(2026, 11, 31, 0, 0))).toBe("2026-12-31");
  });

  it("nimmt Zeichenketten und Zeitstempel an", () => {
    const date = new Date(2026, 9, 19, 12);
    expect(localDayKey(date.toISOString())).toBe("2026-10-19");
    expect(localDayKey(date.getTime())).toBe("2026-10-19");
  });
});

describe("nextLocalDayStart", () => {
  it("liefert den Beginn des nächsten lokalen Tages", () => {
    expect(nextLocalDayStart(new Date(2026, 9, 21, 15, 30).toISOString())).toBe(
      new Date(2026, 9, 22, 0, 0).toISOString(),
    );
  });

  it("gilt auch kurz nach Mitternacht und kurz davor", () => {
    const next = new Date(2026, 9, 22, 0, 0).toISOString();
    expect(nextLocalDayStart(new Date(2026, 9, 21, 0, 0, 1))).toBe(next);
    expect(nextLocalDayStart(new Date(2026, 9, 21, 23, 59, 59))).toBe(next);
  });

  it("springt über Monats- und Jahresgrenzen", () => {
    expect(nextLocalDayStart(new Date(2026, 11, 31, 12))).toBe(
      new Date(2027, 0, 1, 0, 0).toISOString(),
    );
  });
});
