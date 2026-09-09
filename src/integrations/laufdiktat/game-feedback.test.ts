import { describe, expect, it } from "vitest";
import { battleChargeGain, speedPoints } from "../../domain/live-game-feedback";
import { compareLiveVersions } from "./version-compatibility";

describe("original game rules", () => {
  it("only helps catch up when at least half the participants are ahead", () => {
    expect(battleChargeGain({ Mia: 1, A: 2, B: 0, C: 0 }, "Mia", 1)).toBe(25);
    expect(battleChargeGain({ Mia: 1, A: 2, B: 2, C: 0 }, "Mia", 1)).toBe(34);
    expect(battleChargeGain({}, "Mia", 1)).toBe(25);
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
