import { describe, expect, it } from "vitest";
import {
  buildRunningDictationHint,
  buildVocabularyItems,
  checkRunningDictationAnswer,
  computeRunningDictationStars,
  parseRunningDictationText,
  parseVocabularyTable,
} from "./running-dictation";

describe("native running dictation core", () => {
  it("ports deterministic hints for words and sentences", () => {
    expect(buildRunningDictationHint("Haus", 0)).toBe("_ _ _ _");
    expect(buildRunningDictationHint("Satz zwei", 0)).toBe("____ ____");
    expect(buildRunningDictationHint("Haus", 0.5)).toBe(
      buildRunningDictationHint("Haus", 0.5),
    );
    expect(buildRunningDictationHint("Satz zwei", 1)).toBe("Satz zwei");
    expect(buildRunningDictationHint("Haus", 2)).toBe("H a u s");
  });

  it("splits text into stable dictation sections", () => {
    expect(
      parseRunningDictationText("Hallo.\nWie geht es dir?").map(
        (item) => item.target,
      ),
    ).toEqual(["Hallo.", "Wie geht es dir?"]);
    expect(parseRunningDictationText("   ")).toEqual([]);
    expect(parseRunningDictationText("Ein Satz ohne Punkt")[0]?.target).toBe(
      "Ein Satz ohne Punkt",
    );
  });

  it("parses vocabulary, alternatives and mixed directions", () => {
    const pairs = parseVocabularyTable("Haus;home|house\nBaum;tree");
    const items = buildVocabularyItems(pairs, "mixed");
    expect(items.map((item) => item.prompt)).toEqual(["Haus", "tree"]);
    expect(checkRunningDictationAnswer(items[0]!, "HOUSE")).toBe(true);
    expect(checkRunningDictationAnswer(items[0]!, "Baum")).toBe(false);
    expect(checkRunningDictationAnswer(items[0]!, "")).toBe(false);
    expect(checkRunningDictationAnswer(items[0]!, "Home", true)).toBe(false);
    expect(
      buildVocabularyItems(pairs, "right-to-left").map((item) => item.prompt),
    ).toEqual(["home", "tree"]);
    expect(parseVocabularyTable("ungültig\nHaus\thome")).toHaveLength(1);
  });

  it("checks text exactly after trimming", () => {
    const [item] = parseRunningDictationText("Das Haus.");
    expect(checkRunningDictationAnswer(item!, "  Das Haus.  ")).toBe(true);
    expect(checkRunningDictationAnswer(item!, "das haus.")).toBe(false);
  });

  it("keeps the original five-star thresholds", () => {
    expect(computeRunningDictationStars(0, 5)).toBe(5);
    expect(computeRunningDictationStars(1, 10)).toBe(4);
    expect(computeRunningDictationStars(2, 10)).toBe(3);
    expect(computeRunningDictationStars(2, 5)).toBe(2);
    expect(computeRunningDictationStars(8, 10)).toBe(1);
    expect(computeRunningDictationStars(1, 0)).toBe(5);
  });
});
