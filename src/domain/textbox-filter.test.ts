import { describe, expect, it } from "vitest";
import {
  EMPTY_TEXTBOX_FILTER,
  activeFilterChips,
  matchesTextboxFilter,
  phenomenaInLibrary,
  removeFilterChip,
  type TextboxFilter,
} from "./textbox-filter";
import { TEXTBOX_TEXTS } from "./textbox-library";
import type { TextboxText } from "./textbox-text";

function entry(overrides: Partial<TextboxText>): TextboxText {
  return { ...TEXTBOX_TEXTS[0]!, ...overrides };
}

const ski = entry({
  title: "Im Schnee",
  difficulty: "mittel",
  phenomena: ["gross-klein"],
});
const ss = entry({
  title: "Das Fußballspiel",
  difficulty: "leicht",
  phenomena: ["s-ss-sz", "zusammensetzungen"],
});
const plain = (overrides: Partial<TextboxFilter>): TextboxFilter => ({
  ...EMPTY_TEXTBOX_FILTER,
  ...overrides,
});

describe("matchesTextboxFilter", () => {
  it("lässt ohne Filter alles durch", () => {
    expect(matchesTextboxFilter(ski, "neu", EMPTY_TEXTBOX_FILTER)).toBe(true);
  });

  it("sucht getrimmt und ohne Groß-/Kleinschreibung im Titel", () => {
    expect(
      matchesTextboxFilter(ski, "neu", plain({ query: "  SCHNEE " })),
    ).toBe(true);
    expect(matchesTextboxFilter(ski, "neu", plain({ query: "hund" }))).toBe(
      false,
    );
  });

  it("sucht auch in der Bezeichnung eines Schwerpunkts", () => {
    expect(matchesTextboxFilter(ss, "neu", plain({ query: "ss" }))).toBe(true);
    expect(matchesTextboxFilter(ski, "neu", plain({ query: "ss" }))).toBe(
      false,
    );
    expect(
      matchesTextboxFilter(
        entry({ title: "Der Fuss", phenomena: ["ie"] }),
        "neu",
        plain({ query: "ss" }),
      ),
    ).toBe(true);
  });

  it("filtert genau eine Stufe", () => {
    expect(
      matchesTextboxFilter(ski, "neu", plain({ difficulty: "mittel" })),
    ).toBe(true);
    expect(
      matchesTextboxFilter(ski, "neu", plain({ difficulty: "leicht" })),
    ).toBe(false);
  });

  it("verbindet Stände mit ODER", () => {
    const filter = plain({ stands: ["neu", "gemeistert"] });
    expect(matchesTextboxFilter(ski, "neu", filter)).toBe(true);
    expect(matchesTextboxFilter(ski, "gemeistert", filter)).toBe(true);
    expect(matchesTextboxFilter(ski, "begonnen", filter)).toBe(false);
  });

  it("verbindet Schwerpunkte mit ODER und die Gruppen mit UND", () => {
    const phenomena = plain({ phenomena: ["gross-klein", "s-ss-sz"] });
    expect(matchesTextboxFilter(ski, "neu", phenomena)).toBe(true);
    expect(matchesTextboxFilter(ss, "neu", phenomena)).toBe(true);
    const both = plain({ ...phenomena, difficulty: "leicht" });
    expect(matchesTextboxFilter(ski, "neu", both)).toBe(false);
    expect(matchesTextboxFilter(ss, "neu", both)).toBe(true);
    expect(
      matchesTextboxFilter(ss, "begonnen", { ...both, stands: ["neu"] }),
    ).toBe(false);
  });
});

describe("activeFilterChips und removeFilterChip", () => {
  const filter = plain({
    difficulty: "leicht",
    stands: ["begonnen", "neu"],
    phenomena: ["ie", "dehnungs-h"],
  });

  it("ordnet Stufe, Stand, Schwerpunkte", () => {
    expect(
      activeFilterChips(filter).map((c) => [c.key, c.value, c.label]),
    ).toEqual([
      ["stufe", "leicht", "Leicht"],
      ["stand", "begonnen", "Begonnen"],
      ["stand", "neu", "Neu"],
      ["schwerpunkt", "ie", "Wörter mit ie"],
      ["schwerpunkt", "dehnungs-h", "Dehnungs-h"],
    ]);
    expect(activeFilterChips(EMPTY_TEXTBOX_FILTER)).toEqual([]);
  });

  it("entfernt genau einen Filter", () => {
    expect(
      removeFilterChip(filter, "stufe", "leicht").difficulty,
    ).toBeUndefined();
    expect(removeFilterChip(filter, "stand", "neu").stands).toEqual([
      "begonnen",
    ]);
    expect(removeFilterChip(filter, "schwerpunkt", "ie").phenomena).toEqual([
      "dehnungs-h",
    ]);
    expect(removeFilterChip(filter, "stand", "neu").difficulty).toBe("leicht");
  });
});

describe("phenomenaInLibrary", () => {
  it("zählt nur vorhandene Schwerpunkte in der Reihenfolge der Liste", () => {
    const list = phenomenaInLibrary([ski, ss, ss]);
    expect(list).toEqual([
      { id: "s-ss-sz", label: "s, ss und ß", count: 2 },
      { id: "gross-klein", label: "Groß- und Kleinschreibung", count: 1 },
      { id: "zusammensetzungen", label: "Zusammengesetzte Wörter", count: 2 },
    ]);
  });

  it("umfasst für die ganze Bibliothek mindestens einen Schwerpunkt", () => {
    expect(phenomenaInLibrary(TEXTBOX_TEXTS).length).toBeGreaterThan(0);
  });
});
