import { describe, expect, it } from "vitest";
import { localDayKey } from "./local-day";

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
