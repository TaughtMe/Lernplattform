import { describe, expect, it } from "vitest";
import {
  battleChargeGain,
  nextBattleStreak,
  speedPoints,
} from "../../domain/live-game-feedback";
import { compareLiveVersions } from "./version-compatibility";

describe("original game rules", () => {
  // Entwickler, Nachtrag nach Phase 2, Nr. 7: Ladung über Genauigkeit statt
  // Tempo. Der frühere Aufholbonus hing am Platz und damit am Tempo.
  it("charges by first-try streaks, not by position or speed", () => {
    expect(battleChargeGain(0)).toBe(0);
    expect(battleChargeGain(1)).toBe(20);
    expect(battleChargeGain(2)).toBe(25);
    expect(battleChargeGain(3)).toBe(34);
    expect(battleChargeGain(9)).toBe(34);
  });
  it("resets the streak after an error but keeps the charge", () => {
    let streak = 0;
    let charge = 0;
    for (const firstTry of [true, true, false, true]) {
      streak = nextBattleStreak(streak, firstTry);
      charge += battleChargeGain(streak);
    }
    // 20 + 25, dann nach dem Fehler 0, dann wieder 20.
    expect(streak).toBe(1);
    expect(charge).toBe(65);
  });
  it("needs four first-try answers in a row for a full charge", () => {
    let streak = 0;
    let charge = 0;
    const steps: number[] = [];
    while (charge < 100) {
      streak = nextBattleStreak(streak, true);
      charge += battleChargeGain(streak);
      steps.push(charge);
    }
    expect(steps).toEqual([20, 45, 79, 113]);
  });
  it("normalizes speed by text length and handles missing duration", () => {
    expect(speedPoints(20, 10000)).toBe(200);
    expect(speedPoints(40, 20000)).toBe(200);
    expect(speedPoints(20, 0)).toBe(0);
    expect(speedPoints(0, 1000)).toBe(0);
  });
  it("compares complete version numbers and rejects unknown formats", () => {
    expect(compareLiveVersions("lernraum-0.3.0", "lernraum-0.3.0")).toBe(0);
    expect(compareLiveVersions("lernraum-0.3.0", "lernraum-0.10.0")).toBe(-1);
    expect(compareLiveVersions("lernraum-1.0.0", "lernraum-0.3.0")).toBe(1);
    expect(compareLiveVersions("unknown", "0.3.0")).toBeNull();
  });
});
