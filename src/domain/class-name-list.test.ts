import { describe, expect, it } from "vitest";
import {
  NAME_LIST_MAX,
  NAME_MAX_LENGTH,
  parseNameList,
} from "./class-name-list";

describe("Namensliste einfügen", () => {
  it("nimmt je Zeile oder Semikolon einen Namen, Kommas trennen nicht", () => {
    expect(parseNameList("Alex\nBen; Cem\r\nMüller, Anna\n\n").names).toEqual([
      "Alex",
      "Ben",
      "Cem",
      "Müller, Anna",
    ]);
  });

  it("verbindet Tabellenspalten und fasst Leerraum zusammen", () => {
    expect(parseNameList("Anna\tMüller\n  Ben   Kurz \t ").names).toEqual([
      "Anna Müller",
      "Ben Kurz",
    ]);
  });

  it("lässt Doppelte weg, auch solche, die schon in der Klasse sind", () => {
    const result = parseNameList("alex\nBen\nben\nCem", ["Alex"]);
    expect(result.names).toEqual(["Ben", "Cem"]);
    expect(result.duplicates).toBe(2);
  });

  it("kürzt lange Namen und begrenzt die Anzahl", () => {
    const long = "x".repeat(NAME_MAX_LENGTH + 10);
    expect(parseNameList(long).names[0]).toHaveLength(NAME_MAX_LENGTH);
    const many = Array.from({ length: NAME_LIST_MAX + 3 }, (_, i) => `K${i}`);
    const result = parseNameList(many.join("\n"));
    expect(result.names).toHaveLength(NAME_LIST_MAX);
    expect(result.overflow).toBe(3);
    expect(result.rest).toEqual([
      `K${NAME_LIST_MAX}`,
      `K${NAME_LIST_MAX + 1}`,
      `K${NAME_LIST_MAX + 2}`,
    ]);
  });

  it("liefert für leeren Text nichts", () => {
    expect(parseNameList(" \n\t;; ")).toEqual({
      names: [],
      duplicates: 0,
      overflow: 0,
      rest: [],
    });
  });
});
