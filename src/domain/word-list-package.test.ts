import { describe, expect, it } from "vitest";
import { parseLearningBundleV1 } from "./learning-bundle";
import {
  buildWordListPackage,
  parseWordListPackage,
  readWordListText,
  WORD_LIST_MAX_WORDS,
  WORD_LIST_PACKAGE_VERSION,
  WORD_LIST_TITLE_MAX,
  wordListSource,
} from "./word-list-package";
import {
  DAMAGED_PAYLOAD_MESSAGE,
  isWordListPackage,
  parseTransferPayload,
  TransferPayloadError,
  UNKNOWN_VERSION_MESSAGE,
} from "./transfer-payload";

const now = "2026-10-30T10:00:00.000Z";
const valid = {
  schemaVersion: WORD_LIST_PACKAGE_VERSION,
  kind: "word-list",
  id: "teacher-package-1",
  revision: 1,
  createdAt: now,
  title: "Wörter mit ie",
  words: ["Brief", "Sieb"],
};

describe("readWordListText", () => {
  it("trennt bei Komma, Semikolon und Zeilenumbruch und entfernt Doppelte", () => {
    expect(readWordListText("Ball, Fuß;ball\nStraße\r\n\n Haus ,")).toEqual({
      words: ["Ball", "Fuß", "Straße", "Haus"],
      ignored: 1,
      surplus: 0,
    });
  });

  it("zählt unbrauchbare Einträge und überzählige Wörter", () => {
    const many = Array.from(
      { length: WORD_LIST_MAX_WORDS + 3 },
      (_, i) => `wort${i}`,
    ).join("\n");
    const reading = readWordListText(`${many}\n<b>\n${"x".repeat(61)}`);
    expect(reading.words).toHaveLength(WORD_LIST_MAX_WORDS);
    expect(reading.surplus).toBe(3);
    expect(reading.ignored).toBe(2);
  });

  it("lehnt Steuerzeichen und halbe Ersatzzeichen wie die Wortbrücke ab", () => {
    expect(readWordListText("Ka\u0000tze\nBa\ud800ll\nHund").words).toEqual([
      "Hund",
    ]);
  });
});

describe("Lernwortliste (Paketschema)", () => {
  it("nimmt eine gültige Liste an", () => {
    expect(parseWordListPackage(valid)).toEqual(valid);
  });

  it("baut aus dem Textfeld ein Paket mit Titel und Wörtern", () => {
    const built = buildWordListPackage({
      id: "teacher-package-1",
      revision: 2,
      title: "  Wörter mit ie ",
      text: "Brief, Sieb\nbrief",
      now,
    });
    expect(built).toEqual({ ...valid, revision: 2 });
    expect(wordListSource(built.words)).toBe("Brief\nSieb");
  });

  it("meldet leere, zu große und titellose Listen verständlich", () => {
    const base = { id: "p", revision: 1, now };
    expect(() =>
      buildWordListPackage({ ...base, title: "A", text: " , \n" }),
    ).toThrow("mindestens ein gültiges Wort");
    expect(() =>
      buildWordListPackage({
        ...base,
        title: "A",
        text: Array.from(
          { length: WORD_LIST_MAX_WORDS + 1 },
          (_, i) => `w${i}`,
        ).join(" ,"),
      }),
    ).toThrow("zu viele Wörter");
    expect(() =>
      buildWordListPackage({ ...base, title: "  ", text: "Ball" }),
    ).toThrow("Titel");
    expect(() =>
      buildWordListPackage({
        ...base,
        title: "a".repeat(WORD_LIST_TITLE_MAX + 1),
        text: "Ball",
      }),
    ).toThrow("zu lang");
    expect(() =>
      buildWordListPackage({ ...base, title: "<b>", text: "Ball" }),
    ).toThrow("< und >");
  });

  it("lehnt fremde Felder, Doppelte, ungültige Wörter und zu viele Wörter ab", () => {
    expect(() => parseWordListPackage({ ...valid, extra: 1 })).toThrow();
    expect(() =>
      parseWordListPackage({ ...valid, words: ["Brief", "brief"] }),
    ).toThrow();
    expect(() => parseWordListPackage({ ...valid, words: ["<b>"] })).toThrow();
    expect(() => parseWordListPackage({ ...valid, words: [] })).toThrow();
    expect(() =>
      parseWordListPackage({
        ...valid,
        words: Array.from(
          { length: WORD_LIST_MAX_WORDS + 1 },
          (_, i) => `w${i}`,
        ),
      }),
    ).toThrow();
    expect(() => parseWordListPackage({ ...valid, title: "<b>" })).toThrow();
  });
});

describe("Nutzlast der Übertragung", () => {
  it("erkennt die Lernwortliste", () => {
    const payload = parseTransferPayload(valid);
    expect(isWordListPackage(payload)).toBe(true);
  });

  it("lehnt unbekannte Versionen mit einem verständlichen Satz ab", () => {
    for (const value of [
      { ...valid, schemaVersion: "2.0.0" },
      { schemaVersion: 7 },
      {},
      null,
      "text",
    ]) {
      expect(() => parseTransferPayload(value)).toThrow(TransferPayloadError);
      expect(() => parseTransferPayload(value)).toThrow(
        UNKNOWN_VERSION_MESSAGE,
      );
    }
  });

  it("meldet beschädigte Pakete ohne technische Einzelheiten", () => {
    expect(() => parseTransferPayload({ ...valid, words: ["<b>"] })).toThrow(
      DAMAGED_PAYLOAD_MESSAGE,
    );
    expect(() =>
      parseTransferPayload({ schemaVersion: "1.0.0", id: "x" }),
    ).toThrow(DAMAGED_PAYLOAD_MESSAGE);
  });

  it("wird von der Prüfung älterer Versionen (nur 1.0.0) abgelehnt", () => {
    expect(() => parseLearningBundleV1(valid)).toThrow();
  });
});
