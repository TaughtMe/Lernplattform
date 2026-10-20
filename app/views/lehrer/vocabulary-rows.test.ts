import { describe, expect, it } from "vitest";
import {
  completePairs,
  pasteRows,
  rowsFromSource,
  setCell,
  sourceFromRows,
  swapRows,
} from "./vocabulary-rows";

describe("Vokabeltabelle", () => {
  it("liest und schreibt das Format der Ablage", () => {
    const rows = rowsFromSource(
      "school;Schule;Unit 3\r\nohne Trenner\ngo\tgehen",
    );
    expect(rows).toEqual([
      { a: "school", b: "Schule", tag: "Unit 3" },
      { a: "go", b: "gehen", tag: "" },
    ]);
    expect(sourceFromRows(rows)).toBe("school;Schule;Unit 3\ngo;gehen");
    // Ein Semikolon in der Zelle erzwingt Tab als Trenner.
    expect(sourceFromRows([{ a: "a;b", b: "c", tag: "" }])).toBe("a;b\tc");
    expect(sourceFromRows([{ a: "", b: "", tag: "" }])).toBe("");
  });

  it("legt beim Tippen in der letzten Zeile eine neue an", () => {
    const rows = setCell([], 0, "a", "go");
    expect(rows).toEqual([{ a: "go", b: "", tag: "" }]);
    expect(completePairs(rows)).toBe(0);
    expect(completePairs(setCell(rows, 0, "b", "gehen"))).toBe(1);
  });

  it("fügt kopierte Listen ein und tauscht Spalten", () => {
    const base = [{ a: "x", b: "y", tag: "" }];
    expect(pasteRows(base, 0, "nur ein Wort")).toBeNull();
    expect(pasteRows(base, 1, "red\trot\nblue;blau;Farben")).toEqual([
      { a: "x", b: "y", tag: "" },
      { a: "red", b: "rot", tag: "" },
      { a: "blue", b: "blau", tag: "Farben" },
    ]);
    expect(swapRows(base)).toEqual([{ a: "y", b: "x", tag: "" }]);
  });
});
