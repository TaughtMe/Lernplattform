import { describe, expect, it } from "vitest";
import {
  applyRunningDictationSectionEdits,
  buildMarkerPieces,
  buildRunningDictationSections,
  DEFAULT_TEXT_SPLIT_CONFIG,
  displayRunningDictationSections,
  moveRunningDictationSection,
  tokenizeMarkerText,
} from "./running-dictation-sections";

describe("running dictation section editor", () => {
  it("splits punctuation and lines without splitting decimal numbers", () => {
    expect(
      buildRunningDictationSections(
        "Preis 3.50 Euro.\nWeiter!",
        DEFAULT_TEXT_SPLIT_CONFIG,
      ).map(({ text }) => text),
    ).toEqual(["Preis 3.50 Euro.", "Weiter!"]);
  });

  it("supports literal custom delimiters with longest match", () => {
    const sections = buildRunningDictationSections("eins|||zwei||drei", {
      ...DEFAULT_TEXT_SPLIT_CONFIG,
      punctuation: [],
      newlineEnabled: false,
      customDelimiters: [
        { id: "short", value: "||" },
        { id: "long", value: "|||" },
      ],
    });
    expect(sections.map(({ text }) => text)).toEqual(["eins", "zwei", "drei"]);
  });

  it("keeps a selected manual range together and supports split points", () => {
    const source = "Eins. Zwei. Drei.";
    const sections = buildRunningDictationSections(
      source,
      DEFAULT_TEXT_SPLIT_CONFIG,
      [
        { id: "range", type: "section", start: 0, end: 11 },
        { id: "split", type: "split", start: 17, end: 17 },
      ],
    );
    expect(sections[0]).toMatchObject({
      text: "Eins. Zwei.",
      source: "manual",
    });
  });

  it("excludes and reorders without mutating the source sections", () => {
    const sections = buildRunningDictationSections(
      "Eins. Zwei. Drei.",
      DEFAULT_TEXT_SPLIT_CONFIG,
    );
    expect(
      applyRunningDictationSectionEdits(
        sections,
        [sections[1]!.id],
        [sections[2]!.id, sections[0]!.id],
      ).map(({ text }) => text),
    ).toEqual(["Drei.", "Eins."]);
    expect(sections).toHaveLength(3);
  });

  it("moves items without mutation and rejects invalid positions", () => {
    const original = ["a", "b", "c"];
    expect(moveRunningDictationSection(original, 0, 2)).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(moveRunningDictationSection(original, -1, 2)).toBe(original);
    expect(original).toEqual(["a", "b", "c"]);
  });
});

describe("Markierungsansicht", () => {
  const text = "Eins. Zwei! Drei";
  const sections = buildRunningDictationSections(
    text,
    DEFAULT_TEXT_SPLIT_CONFIG,
  );

  it("zeigt Abschnitte nach Rang, unbekannte bleiben hinten in Reihenfolge", () => {
    const [a, b, c] = sections;
    expect(
      displayRunningDictationSections(sections, [c!.id, a!.id]).map(
        ({ id }) => id,
      ),
    ).toEqual([c!.id, a!.id, b!.id]);
    expect(
      displayRunningDictationSections(sections).map(({ id }) => id),
    ).toEqual(sections.map(({ id }) => id));
    expect(displayRunningDictationSections(sections, [a!.id])).toHaveLength(3);
  });

  it("baut lückenlose Stücke, die den Rohtext wieder ergeben", () => {
    const pieces = buildMarkerPieces(text, sections);
    expect(pieces.map(({ text: piece }) => piece).join("")).toBe(text);
    expect(pieces.some(({ kind }) => kind === "gap")).toBe(true);
  });

  it("zählt nur automatische Abschnitte für autoIndex", () => {
    const manual = buildRunningDictationSections(
      "abc def ghi",
      { ...DEFAULT_TEXT_SPLIT_CONFIG, newlineEnabled: false },
      [{ id: "m", type: "section", start: 4, end: 7 }],
    );
    const pieces = buildMarkerPieces("abc def ghi", manual);
    expect(pieces.map(({ kind }) => kind)).toContain("manual");
    expect(pieces.map(({ text: piece }) => piece).join("")).toBe("abc def ghi");
    const autos = pieces.filter(({ kind }) => kind === "auto");
    expect(autos.map(({ autoIndex }) => autoIndex)).toEqual(
      autos.map((_, index) => index),
    );
  });

  it("liefert für leere Abschnitte den ganzen Text als Lücke", () => {
    expect(buildMarkerPieces("xyz", [])).toEqual([
      { text: "xyz", start: 0, kind: "gap", autoIndex: 0 },
    ]);
    expect(buildMarkerPieces("", [])).toEqual([]);
  });

  it("zerlegt Text in Wörter, Zahlen und Zwischenstücke mit Basisversatz", () => {
    expect(tokenizeMarkerText(", Äpfel 12!", 10)).toEqual([
      { text: ", ", start: 10, end: 12, isWord: false },
      { text: "Äpfel", start: 12, end: 17, isWord: true },
      { text: " ", start: 17, end: 18, isWord: false },
      { text: "12", start: 18, end: 20, isWord: true },
      { text: "!", start: 20, end: 21, isWord: false },
    ]);
    expect(tokenizeMarkerText("", 0)).toEqual([]);
  });
});
