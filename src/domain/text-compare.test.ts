import { describe, expect, it } from "vitest";
import {
  MAX_STORED_INPUT_LENGTH,
  alignWords,
  layoutText,
  reviewSequence,
  compareGaps,
  comparePunctuation,
  scoreWords,
  tokenizeText,
  wordsOf,
} from "./text-compare";

const kinds = (expected: string, actual: string) =>
  alignWords(
    wordsOf(tokenizeText(expected)),
    wordsOf(tokenizeText(actual)),
  ).map((r) => r.kind);

describe("tokenizeText", () => {
  it("trennt Wörter von Satzzeichen und zählt je Art", () => {
    expect(tokenizeText("Hallo, Welt!")).toEqual([
      { kind: "word", text: "Hallo", index: 0 },
      { kind: "punct", text: ",", index: 0 },
      { kind: "word", text: "Welt", index: 1 },
      { kind: "punct", text: "!", index: 1 },
    ]);
  });

  it("behält Bindestrich und Apostroph im Wort, Anführungszeichen nicht", () => {
    expect(
      wordsOf(tokenizeText("Die „E-Mail“ geht’s nicht, geht's doch.")),
    ).toEqual(["Die", "E-Mail", "geht’s", "nicht", "geht's", "doch"]);
  });

  it("kennt Umlaute und ß und normalisiert auf NFC", () => {
    const decomposed = "Mühle";
    expect(wordsOf(tokenizeText(`${decomposed} Straße`))).toEqual([
      "Mühle",
      "Straße",
    ]);
  });

  it("löst Bindestriche am Rand vom Wort", () => {
    expect(tokenizeText("-Wort-").map((t) => t.kind)).toEqual([
      "punct",
      "word",
      "punct",
    ]);
  });

  it("ignoriert Leerzeichen und Zeilenumbrüche", () => {
    expect(wordsOf(tokenizeText("  a \n\n  b\t c "))).toEqual(["a", "b", "c"]);
    expect(tokenizeText("   ")).toEqual([]);
  });
});

describe("alignWords", () => {
  it("erkennt richtige Wörter", () => {
    expect(kinds("Der Hund bellt", "Der Hund bellt")).toEqual([
      "richtig",
      "richtig",
      "richtig",
    ]);
  });

  it("markiert falsch geschriebene Wörter und fast richtige", () => {
    const [first, second] = alignWords(["Hund", "Haus"], ["Hunt", "Hxxs"]);
    expect(first).toMatchObject({
      kind: "falsch",
      expected: "Hund",
      actual: "Hunt",
      nearMiss: true,
    });
    expect(second).toMatchObject({ kind: "falsch", nearMiss: false });
  });

  it("trennt Groß-/Kleinfehler von falschen Wörtern", () => {
    expect(alignWords(["Hund"], ["hund"])).toEqual([
      {
        kind: "gross-klein",
        expected: "Hund",
        actual: "hund",
        expectedIndex: 0,
        nearMiss: false,
      },
    ]);
  });

  it("erkennt ein fehlendes Wort am Anfang, in der Mitte und am Ende", () => {
    expect(kinds("Der kleine Hund bellt", "kleine Hund bellt")).toEqual([
      "fehlt",
      "richtig",
      "richtig",
      "richtig",
    ]);
    expect(kinds("Der kleine Hund bellt", "Der Hund bellt")).toEqual([
      "richtig",
      "fehlt",
      "richtig",
      "richtig",
    ]);
    expect(kinds("Der kleine Hund bellt", "Der kleine Hund")).toEqual([
      "richtig",
      "richtig",
      "richtig",
      "fehlt",
    ]);
  });

  it("erkennt ein zusätzliches Wort", () => {
    const results = alignWords(["Der", "Hund"], ["Der", "kleine", "Hund"]);
    expect(results.map((r) => r.kind)).toEqual([
      "richtig",
      "zusaetzlich",
      "richtig",
    ]);
    expect(results[1]).toMatchObject({ actual: "kleine" });
  });

  it("zählt ein falsches Wort nicht als fehlt plus zusätzlich", () => {
    expect(kinds("Der Hund bellt laut", "Der Hunt bellt laut")).toEqual([
      "richtig",
      "falsch",
      "richtig",
      "richtig",
    ]);
  });

  it("ordnet ein ähnliches Wort dem passenden Original zu", () => {
    // „Hund“ fehlt, „Katze“ ist falsch geschrieben – nicht umgekehrt.
    expect(kinds("Hund Katze", "Katse")).toEqual(["fehlt", "falsch"]);
  });

  it("wertet vertauschte Wörter als falsch", () => {
    expect(kinds("Hund bellt", "bellt Hund")).toEqual(["falsch", "falsch"]);
  });

  it("behandelt leere Eingabe und leeres Original", () => {
    expect(kinds("a b", "")).toEqual(["fehlt", "fehlt"]);
    expect(kinds("", "a")).toEqual(["zusaetzlich"]);
    expect(alignWords([], [])).toEqual([]);
  });
});

describe("compareGaps", () => {
  it("vergleicht Lücke für Lücke", () => {
    const results = compareGaps(
      ["Hund", "Katze", "Maus", "Vogel"],
      ["Hund", "katze", "", "Vogal"],
    );
    expect(results.map((r) => r.kind)).toEqual([
      "richtig",
      "gross-klein",
      "fehlt",
      "falsch",
    ]);
    expect(results[3]).toMatchObject({ nearMiss: true });
    expect(results[2]?.expectedIndex).toBe(2);
  });

  it("ignoriert Leerraum außen und fehlende Eingaben", () => {
    expect(
      compareGaps(["Hund", "Ball"], ["  Hund "]).map((r) => r.kind),
    ).toEqual(["richtig", "fehlt"]);
  });
});

describe("comparePunctuation", () => {
  const punct = (text: string) => tokenizeText(text);
  it("zählt fehlende, falsche und zusätzliche Satzzeichen", () => {
    expect(comparePunctuation(punct("A, b."), punct("A, b."))).toBe(0);
    expect(comparePunctuation(punct("A, b."), punct("A b."))).toBe(1);
    expect(comparePunctuation(punct("A, b."), punct("A, b!"))).toBe(1);
    expect(comparePunctuation(punct("A b"), punct("A, b."))).toBe(2);
    expect(comparePunctuation(punct("A, b."), punct("A b"))).toBe(2);
  });
});

describe("scoreWords", () => {
  it("rechnet richtige Wörter durch Gesamtzahl und rundet", () => {
    const score = scoreWords(alignWords(["a", "b", "c"], ["a", "b", "x"]), 3);
    expect(score).toMatchObject({
      percent: 67,
      correct: 2,
      total: 3,
      extra: 0,
    });
    expect(score.byKind.falsch).toBe(1);
  });

  it("zieht zusätzliche Wörter ab, aber nie unter 0 %", () => {
    expect(scoreWords(alignWords(["a", "b"], ["a", "b", "x"]), 2).percent).toBe(
      50,
    );
    expect(scoreWords(alignWords(["a"], ["x", "y", "z", "w"]), 1).percent).toBe(
      0,
    );
  });

  it("gibt bei leerer Eingabe 0 % und bei leerem Original 0 %", () => {
    expect(scoreWords(alignWords(["a", "b"], []), 2).percent).toBe(0);
    expect(scoreWords([], 0).percent).toBe(0);
  });

  it("lässt Satzzeichen den Wert nicht ändern", () => {
    const results = alignWords(["a", "b"], ["a", "b"]);
    expect(scoreWords(results, 2, 0).percent).toBe(
      scoreWords(results, 2, 5).percent,
    );
    expect(scoreWords(results, 2, 5).punctuationHints).toBe(5);
  });
});

describe("layoutText", () => {
  it("merkt sich Leerraum vor jedem Token", () => {
    expect(
      layoutText("Er sagte: „Hallo!“ Dann ging er.").map(
        (t) => `${t.spaceBefore ? "_" : ""}${t.text}`,
      ),
    ).toEqual([
      "Er",
      "_sagte",
      ":",
      "_„",
      "Hallo",
      "!",
      "“",
      "_Dann",
      "_ging",
      "_er",
      ".",
    ]);
  });
});

describe("lange Eingaben", () => {
  const long = "a".repeat(300);

  it("vergleicht das ganze Wort, speichert aber höchstens 100 Zeichen", () => {
    const [wrong] = alignWords(["Hund"], [long]);
    expect(wrong).toMatchObject({ kind: "falsch", nearMiss: false });
    expect(wrong?.actual).toHaveLength(MAX_STORED_INPUT_LENGTH);
    const [extra] = alignWords([], [long]);
    expect(extra?.actual).toHaveLength(MAX_STORED_INPUT_LENGTH);
    const [gap] = compareGaps(["Hund"], [long]);
    expect(gap?.actual).toHaveLength(MAX_STORED_INPUT_LENGTH);
    const [caseOnly] = compareGaps([long.toUpperCase()], [long]);
    expect(caseOnly).toMatchObject({ kind: "gross-klein" });
    expect(caseOnly?.actual).toHaveLength(MAX_STORED_INPUT_LENGTH);
    const [right] = alignWords([long], [long]);
    expect(right).toMatchObject({ kind: "richtig" });
    expect(right?.actual).toHaveLength(MAX_STORED_INPUT_LENGTH);
  });
});

describe("reviewSequence", () => {
  const original = "Wir gehen, essen Eis. Dann: heim!";
  const tokens = layoutText(original);
  const originalWords = wordsOf(tokenizeText(original));
  const sequence = (typed: string) =>
    reviewSequence(
      tokens,
      alignWords(originalWords, wordsOf(tokenizeText(typed))),
    ).map(({ result, trailing }) => [
      result.expected ?? `+${result.actual}`,
      trailing,
    ]);

  it("hängt Komma und Punkt an das Wort davor", () => {
    expect(sequence(original)).toEqual([
      ["Wir", ""],
      ["gehen", ","],
      ["essen", ""],
      ["Eis", "."],
      ["Dann", ":"],
      ["heim", "!"],
    ]);
  });

  it("lässt das Satzzeichen beim fehlenden Wort stehen", () => {
    expect(sequence("Wir gehen, essen. Dann: heim!")).toContainEqual([
      "Eis",
      ".",
    ]);
  });

  it("gibt zusätzlichen Wörtern am Ende keine Satzzeichen", () => {
    const result = sequence("Wir gehen essen Eis Dann heim heute");
    expect(result[result.length - 1]).toEqual(["+heute", ""]);
    expect(result[result.length - 2]).toEqual(["heim", "!"]);
  });

  it("ignoriert Satzzeichen mit Leerraum davor", () => {
    const spaced = layoutText("Hallo - Welt.");
    const words = alignWords(["Hallo", "Welt"], ["Hallo", "Welt"]);
    expect(reviewSequence(spaced, words).map((e) => e.trailing)).toEqual([
      "",
      ".",
    ]);
  });
});

describe("typografische Varianten im Wortvergleich (G-002)", () => {
  it("behandelt Apostroph- und Bindestrich-Varianten als ein Wort", () => {
    expect(wordsOf(tokenizeText("E\u2011Mail geht’s"))).toEqual([
      "E\u2011Mail",
      "geht’s",
    ]);
    const results = alignWords(["don't", "E-Mail"], ["don’t", "E\u2011Mail"]);
    expect(results.map((result) => result.kind)).toEqual([
      "richtig",
      "richtig",
    ]);
    expect(compareGaps(["geht's"], ["geht’s"])[0]?.kind).toBe("richtig");
  });

  it("hält NFD und NFC für gleich, Groß-/Kleinschreibung nicht", () => {
    expect(compareGaps(["Bär"], ["Bär".normalize("NFD")])[0]?.kind).toBe(
      "richtig",
    );
    expect(compareGaps(["Bär"], ["bär"])[0]?.kind).toBe("gross-klein");
    expect(compareGaps(["don't"], ["Don’t"])[0]?.kind).toBe("gross-klein");
  });
});
