import { describe, expect, it } from "vitest";
import {
  applyRunningDictationSectionEdits,
  buildRunningDictationSections,
  DEFAULT_TEXT_SPLIT_CONFIG,
  moveRunningDictationSection,
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
