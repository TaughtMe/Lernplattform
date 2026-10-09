import { describe, expect, it } from "vitest";
import { describeLetterDiff, diffLetters } from "./letter-diff";

const kinds = (expected: string, actual: string) =>
  diffLetters(expected, actual).map((entry) => entry.kind);

describe("diffLetters", () => {
  it("marks identical words as all equal", () => {
    expect(kinds("Sonne", "Sonne")).toEqual(Array(5).fill("gleich"));
    expect(describeLetterDiff(diffLetters("Sonne", "Sonne"))).toEqual([]);
  });

  it("finds one wrong letter", () => {
    const diff = diffLetters("Sonne", "Somne");
    expect(diff.filter((entry) => entry.kind !== "gleich")).toEqual([
      { kind: "falsch", expected: "n", actual: "m", position: 3 },
    ]);
    expect(describeLetterDiff(diff)).toEqual(["3. Buchstabe: m statt n"]);
  });

  it("finds a missing letter", () => {
    const diff = diffLetters("Sonne", "Sone");
    expect(diff.filter((entry) => entry.kind === "fehlt")).toHaveLength(1);
    expect(describeLetterDiff(diff)).toHaveLength(1);
    expect(describeLetterDiff(diff)[0]).toMatch(/fehlt: n$/);
  });

  it("finds an additional letter", () => {
    const diff = diffLetters("Sonne", "Sonnne");
    expect(diff.filter((entry) => entry.kind === "zuviel")).toHaveLength(1);
    expect(describeLetterDiff(diff)[0]).toMatch(/zu viel: n$/);
  });

  it("handles umlauts and ß as single letters", () => {
    const strasse = kinds("Straße", "Strasse");
    expect(strasse).toHaveLength(7);
    expect(strasse.filter((kind) => kind === "gleich")).toHaveLength(5);
    expect(strasse).toContain("falsch");
    expect(strasse).toContain("zuviel");
    const diff = diffLetters("Bär", "Ber");
    expect(describeLetterDiff(diff)).toEqual(["2. Buchstabe: e statt ä"]);
  });

  it("treats decomposed umlauts like composed ones", () => {
    expect(kinds("Bär", "Bär")).toEqual(["gleich", "gleich", "gleich"]);
  });

  it("describes capitalisation slips", () => {
    expect(describeLetterDiff(diffLetters("Hund", "hund"))).toEqual([
      "1. Buchstabe: klein statt groß",
    ]);
    expect(describeLetterDiff(diffLetters("hund", "Hund"))).toEqual([
      "1. Buchstabe: groß statt klein",
    ]);
  });

  it("marks every letter missing for an empty input", () => {
    expect(kinds("Rad", "")).toEqual(["fehlt", "fehlt", "fehlt"]);
    expect(kinds("Rad", "   ")).toEqual(["fehlt", "fehlt", "fehlt"]);
  });

  it("marks every letter additional for an empty target", () => {
    expect(kinds("", "ab")).toEqual(["zuviel", "zuviel"]);
  });

  it("keeps the order of the target word", () => {
    const diff = diffLetters("Rat", "Rad");
    expect(diff.map((entry) => entry.expected ?? entry.actual)).toEqual([
      "R",
      "a",
      "t",
    ]);
  });
});
