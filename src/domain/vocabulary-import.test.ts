import { describe, expect, it } from "vitest";
import { toLearningBoxImportRows } from "./learning-box";
import { parseVocabularyTable } from "./running-dictation";
import {
  VOCABULARY_TEMPLATE_FILENAME,
  buildVocabularyTemplate,
  parseVocabularyImport,
} from "./vocabulary-import";

const pairs = (text: string) =>
  parseVocabularyImport(text).entries.map(({ front, back, tag }) => [
    front,
    back,
    tag,
  ]);

describe("parseVocabularyImport", () => {
  it("splits at tabs and at semicolons, but not at commas", () => {
    expect(pairs("Haus\thome\nBaum;tree\nHund, Katze;dog, cat")).toEqual([
      ["Haus", "home", undefined],
      ["Baum", "tree", undefined],
      ["Hund, Katze", "dog, cat", undefined],
    ]);
    expect(parseVocabularyImport("Haus,home").skipped).toEqual([
      { lineNumber: 1, line: "Haus,home", reason: "nur eine Spalte" },
    ]);
  });

  it("prefers tabs so semicolons stay inside a cell", () => {
    expect(pairs("a; b\tc")).toEqual([["a; b", "c", undefined]]);
  });

  it("keeps alternatives with a pipe and reads the third column as tag", () => {
    expect(pairs("Haus;home | house;Unit 1\nSonne\tsun\t")).toEqual([
      ["Haus", "home | house", "Unit 1"],
      ["Sonne", "sun", undefined],
    ]);
  });

  it("copes with CRLF, lone CR and blank lines, counting every line", () => {
    const result = parseVocabularyImport(
      "Haus;home\r\n\r\nkaputt\r\nBaum;tree",
    );
    expect(result.entries.map((entry) => entry.lineNumber)).toEqual([1, 4]);
    expect(result.skipped).toEqual([
      { lineNumber: 3, line: "kaputt", reason: "nur eine Spalte" },
    ]);
    expect(pairs("a;b\rc;d")).toHaveLength(2);
  });

  it("strips a UTF-8 BOM at the start", () => {
    const result = parseVocabularyImport("\uFEFFHaus;home");
    expect(result.entries[0]?.front).toBe("Haus");
  });

  it("names the reason for every skipped line", () => {
    const result = parseVocabularyImport(
      "Haus;home\nnur\n;leer\nBaum;\n | ;x\nSonne; | \nok;fine",
    );
    expect(result.entries.map((entry) => entry.front)).toEqual(["Haus", "ok"]);
    expect(result.skipped).toEqual([
      { lineNumber: 2, line: "nur", reason: "nur eine Spalte" },
      { lineNumber: 3, line: ";leer", reason: "Vorderseite leer" },
      { lineNumber: 4, line: "Baum;", reason: "Rückseite leer" },
      { lineNumber: 5, line: "| ;x", reason: "Vorderseite leer" },
      { lineNumber: 6, line: "Sonne; |", reason: "Rückseite leer" },
    ]);
  });

  it.each([
    "Vorderseite;Rückseite;Tag",
    "vorderseite;RÜCKSEITE;tag",
    "Vorderseite;Rueckseite",
    "front;back;tag",
    "Front\tBack\tTag",
    "\uFEFFVorderseite;Rückseite;Tag",
    "Vorderseite;Rückseite;Tag;;",
  ])("skips the template header %j without reporting it", (header) => {
    const result = parseVocabularyImport(`${header}\r\nHaus;home`);
    expect(result.headerSkipped).toBe(true);
    expect(result.skipped).toEqual([]);
    expect(result.entries.map((entry) => entry.front)).toEqual(["Haus"]);
  });

  it("treats a header-like line below the first line as a vocabulary", () => {
    const result = parseVocabularyImport("Haus;home\nfront;back;tag");
    expect(result.headerSkipped).toBe(false);
    expect(result.entries).toHaveLength(2);
  });

  it("does not mistake a real vocabulary for a header", () => {
    expect(parseVocabularyImport("front;Vorderseite").headerSkipped).toBe(
      false,
    );
  });

  it("returns nothing for empty text", () => {
    expect(parseVocabularyImport("  \n\n")).toEqual({
      entries: [],
      skipped: [],
      headerSkipped: false,
      commaCandidates: 0,
    });
  });

  it("macht ein Semikolon in der Antwort zum Spaltentrenner und zeigt es als Tag", () => {
    // Bestehendes Verhalten: „home; house“ sind zwei Zellen. Die Vorschau
    // zeigt „house“ als Tag, so fällt es vor dem Übernehmen auf.
    const { entries } = parseVocabularyImport("Haus;home; house");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      front: "Haus",
      back: "home",
      tag: "house",
    });
    // Ab der vierten Spalte wird alles verworfen.
    expect(pairs("Haus;home;Unit 1;house")).toEqual([
      ["Haus", "home", "Unit 1"],
    ]);
  });

  it("trennt am Komma nur nach Bestätigung (G-003)", () => {
    const text = "groß;groß, riesig\nklein;small\nHaus (das, die);house";
    const plain = parseVocabularyImport(text);
    expect(plain.entries.map((entry) => entry.back)).toEqual([
      "groß, riesig",
      "small",
      "house",
    ]);
    // Nur eine Zeile hat ein Komma außerhalb von Klammern.
    expect(plain.commaCandidates).toBe(1);

    const confirmed = parseVocabularyImport(text, { commaSeparates: true });
    expect(confirmed.entries.map((entry) => entry.back)).toEqual([
      "groß | riesig",
      "small",
      "house",
    ]);
    expect(confirmed.entries[2]?.front).toBe("Haus (das, die)");
    expect(confirmed.commaCandidates).toBe(1);
    // Die Originalzeile (Grundlage der Kennung) bleibt unverändert.
    expect(confirmed.entries[0]?.source).toBe("groß;groß, riesig");
  });

  it("lässt ein Dezimalkomma stehen", () => {
    const result = parseVocabularyImport("halb;0,5", { commaSeparates: true });
    expect(result.entries[0]?.back).toBe("0,5");
    expect(result.commaCandidates).toBe(0);
  });

  it("gibt die Bestätigung an das Laufdiktat weiter", () => {
    const [pair] = parseVocabularyTable("groß;groß, riesig", {
      commaSeparates: true,
    });
    expect(pair?.right).toEqual({ primary: "groß", alternatives: ["riesig"] });
    const [plain] = parseVocabularyTable("groß;groß, riesig");
    expect(plain?.right).toEqual({ primary: "groß, riesig", alternatives: [] });
  });
});

describe("vocabulary template", () => {
  it("is UTF-8 with BOM, semicolon separated and has a header", () => {
    const template = buildVocabularyTemplate();
    expect(template.startsWith("\uFEFFVorderseite;Rückseite;Tag")).toBe(true);
    expect(VOCABULARY_TEMPLATE_FILENAME).toBe("vokabeln-vorlage.csv");
    expect(template.trim().split(/\r?\n/)).toHaveLength(4);
  });

  it("is read back by the parser as exactly the three example pairs", () => {
    const result = parseVocabularyImport(buildVocabularyTemplate());
    expect(result.headerSkipped).toBe(true);
    expect(result.skipped).toEqual([]);
    expect(toLearningBoxImportRows(result.entries)).toEqual([
      { question: "Haus", answer: "home | house", tag: "Unit 1" },
      { question: "Baum", answer: "tree", tag: "Unit 1" },
      { question: "Sonne", answer: "sun", tag: "Natur" },
    ]);
  });

  it("also loads into the teacher vocabulary with an alternative", () => {
    const parsed = parseVocabularyTable(buildVocabularyTemplate());
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toMatchObject({
      left: { primary: "Haus", alternatives: [] },
      right: { primary: "home", alternatives: ["house"] },
      tag: "Unit 1",
    });
  });
});
