import { describe, expect, it } from "vitest";
import {
  isBlockedRunningDictationInput,
  isSuspiciousRunningDictationInsert,
  pickRunningDictationBattleCandidates,
  sanitizeStrictMathAnswer,
} from "./running-dictation-input";

describe("strict running dictation input", () => {
  it("blocks paste, drop and replacement but permits normal typing", () => {
    expect(isBlockedRunningDictationInput("insertFromPaste")).toBe(true);
    expect(isBlockedRunningDictationInput("insertFromDrop")).toBe(true);
    expect(isBlockedRunningDictationInput("insertReplacementText")).toBe(true);
    expect(isBlockedRunningDictationInput("insertText")).toBe(false);
    expect(isSuspiciousRunningDictationInsert("a", "abc")).toBe(true);
    expect(isSuspiciousRunningDictationInsert("a", "ä")).toBe(false);
  });

  it("keeps only safe math answer characters", () => {
    expect(sanitizeStrictMathAnswer("-12,5abc+")).toBe("-12,5");
  });
});

describe("fair battle targets", () => {
  it("targets the nearest pupils ahead and limits the list", () => {
    expect(
      pickRunningDictationBattleCandidates(
        { Ich: 2, A: 5, B: 3, C: 7, D: 8 },
        "Ich",
        2,
      ),
    ).toEqual([
      { name: "B", index: 3 },
      { name: "A", index: 5 },
      { name: "C", index: 7 },
    ]);
  });

  it("lets joint leaders target each other", () => {
    expect(
      pickRunningDictationBattleCandidates({ Ich: 5, A: 5, B: 3 }, "Ich", 5),
    ).toEqual([
      { name: "A", index: 5 },
      { name: "B", index: 3 },
    ]);
  });
});
