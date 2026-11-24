import { describe, expect, it } from "vitest";
import { evaluateMentalMathExpression } from "../../src/domain/mental-math";
import { getLearningWordCollection } from "../../src/domain/german-learning-content";
import {
  DEFAULT_QUICK_GRADE,
  gradePresetId,
  isQuickStartId,
  QUICK_GRADES,
  quickGradeHint,
  quickPresets,
  resolveQuickStart,
} from "./quick-start";

const lines = (source: string) => source.split("\n").filter(Boolean);

describe("Schnellstart: Kopfrechnen live", () => {
  it("kennt jeden Jahrgang und hat eine Vorgabe", () => {
    expect(QUICK_GRADES).toContain(DEFAULT_QUICK_GRADE);
    for (const grade of QUICK_GRADES) {
      const quick = resolveQuickStart(gradePresetId(grade));
      expect(quick?.contentMode).toBe("math");
      expect(lines(quick?.source ?? "")).toHaveLength(10);
      expect(quickGradeHint(grade)).not.toBe("");
    }
  });

  it("hält Jahrgang 1 im Zahlenraum bis 20 mit Plus und Minus", () => {
    const quick = resolveQuickStart(gradePresetId(1))!;
    expect(quick.settings).toMatchObject({
      gameMode: "LAUFDIKTAT",
      mathMax: 20,
      mathOps: ["+", "-"],
      mathAllowNegative: false,
    });
    for (const line of lines(quick.source)) {
      expect(line).not.toMatch(/[·:]/u);
      const value = evaluateMentalMathExpression(line);
      expect(value).not.toBeNull();
      expect(value!).toBeGreaterThanOrEqual(0);
      expect(value!).toBeLessThanOrEqual(20);
    }
  });

  it("Jahrgang 3 nimmt Mal und Geteilt dazu, ohne Null als Faktor", () => {
    const quick = resolveQuickStart(gradePresetId(3))!;
    expect(quick.settings.mathOps).toEqual(["+", "-", "*", "/"]);
    expect(quick.settings.mathExcludeZeroOperand).toBe(true);
  });

  it("Einmaleins und Plus/Minus bis 1000 setzen ihre Regeln", () => {
    const einmaleins = resolveQuickStart("einmaleins")!;
    expect(einmaleins.settings.mathOps).toEqual(["*"]);
    expect(einmaleins.settings.mathTables).toContain(7);
    expect(lines(einmaleins.source).every((line) => line.includes("·"))).toBe(
      true,
    );
    expect(resolveQuickStart("plus-minus-1000")!.settings).toMatchObject({
      mathMax: 1000,
      mathOps: ["+", "-"],
    });
  });
});

describe("Schnellstart: Wortbox", () => {
  const wordBoxes = quickPresets().filter(({ group }) => group === "words");

  it("bietet nur berichtigte Regel-Wortboxen an", () => {
    const ids = wordBoxes.map(({ id }) => id);
    expect(ids).toContain("wortbox-double-consonants");
    expect(ids).not.toContain("wortbox-s-ss-sz");
    expect(ids).not.toContain("wortbox-memory-words");
    expect(isQuickStartId("wortbox-s-ss-sz")).toBe(false);
  });

  it("zieht zehn verschiedene Wörter der Wortbox als Text", () => {
    const quick = resolveQuickStart("wortbox-double-consonants", () => 0.3)!;
    expect(quick).toMatchObject({
      contentMode: "text",
      title: "Wortbox Doppelkonsonanten",
      settings: { gameMode: "LAUFDIKTAT" },
    });
    const picked = lines(quick.source);
    const box = getLearningWordCollection("double-consonants")!.words;
    expect(picked).toHaveLength(10);
    expect(new Set(picked).size).toBe(10);
    expect(picked.every((word) => box.includes(word))).toBe(true);
  });

  it("jede angebotene Wortbox liefert genug Wörter", () => {
    for (const { id } of wordBoxes) {
      expect(lines(resolveQuickStart(id)!.source)).toHaveLength(10);
    }
  });
});

describe("Schnellstart: Kennungen", () => {
  it("lehnt Unbekanntes ab", () => {
    for (const id of ["", "kopfrechnen-0", "kopfrechnen-7", "wortbox-x", "x"]) {
      expect(isQuickStartId(id)).toBe(false);
      expect(resolveQuickStart(id)).toBeNull();
    }
  });
});
