import { describe, expect, it } from "vitest";
import {
  isMirrorReadingActive,
  mirrorReadingDaysLeft,
  mirrorReadingUntil,
} from "./mirror-reading";

const now = new Date("2026-10-18T10:00:00.000Z");

describe("Spiegelschrift im Lesetext: Zeit", () => {
  it("läuft genau 7 Tage", () => {
    expect(mirrorReadingUntil(now)).toBe("2026-10-25T10:00:00.000Z");
  });

  it("ist bis zum Ablauf aktiv und genau am Ablauf aus", () => {
    const until = mirrorReadingUntil(now);
    expect(isMirrorReadingActive(until, now)).toBe(true);
    expect(
      isMirrorReadingActive(until, new Date("2026-10-25T09:59:59.999Z")),
    ).toBe(true);
    expect(isMirrorReadingActive(until, new Date(until))).toBe(false);
    expect(isMirrorReadingActive(until, new Date("2026-11-01T00:00:00Z"))).toBe(
      false,
    );
  });

  it("behandelt fehlende oder kaputte Werte als aus", () => {
    expect(isMirrorReadingActive(null, now)).toBe(false);
    expect(isMirrorReadingActive("", now)).toBe(false);
    expect(isMirrorReadingActive("kaputt", now)).toBe(false);
    expect(mirrorReadingDaysLeft("kaputt", now)).toBe(0);
  });

  it("rundet die Resttage auf", () => {
    expect(mirrorReadingDaysLeft(mirrorReadingUntil(now), now)).toBe(7);
    expect(
      mirrorReadingDaysLeft(
        mirrorReadingUntil(now),
        new Date("2026-10-18T10:00:01Z"),
      ),
    ).toBe(7);
    expect(
      mirrorReadingDaysLeft(
        mirrorReadingUntil(now),
        new Date("2026-10-24T11:00:00Z"),
      ),
    ).toBe(1);
    expect(
      mirrorReadingDaysLeft(
        mirrorReadingUntil(now),
        new Date("2026-10-26T00:00:00Z"),
      ),
    ).toBe(0);
  });

  it("rechnet über die Zeitumstellung in absoluter Zeit", () => {
    // Zeitumstellung in Deutschland am 25.10.2026: 7 Tage bleiben 168 Stunden.
    const before = new Date("2026-10-20T00:00:00.000Z");
    const until = mirrorReadingUntil(before);
    expect(Date.parse(until) - before.getTime()).toBe(7 * 24 * 3600 * 1000);
    expect(
      mirrorReadingDaysLeft(until, new Date("2026-10-26T23:00:00.000Z")),
    ).toBe(1);
  });
});
