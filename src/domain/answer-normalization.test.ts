import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  evaluateLiveAnswer,
  type LiveWord,
} from "../integrations/laufdiktat/live-session";
import {
  answerAlternatives,
  answerKey,
  answerMatches,
  commaToAlternatives,
  hasAlternativeComma,
  normalizeAnswerCharacters,
} from "./answer-normalization";
import {
  createLearningBoxCard,
  evaluateLearningBoxAnswer,
} from "./learning-box";
import {
  checkRunningDictationAnswer,
  type RunningDictationItem,
} from "./running-dictation";

// Zielzeichen und ihre typografischen Varianten (G-002).
const VARIANTS: Record<string, readonly string[]> = {
  "'": ["’", "‘", "ʼ", "´", "`", "′"],
  '"': ["„", "“", "”", "»", "«", "‚", "‹", "›", "″"],
  "-": ["‐", "‑", "‒", "–", "—", "―", "−"],
  " ": [" ", " ", " ", "　", "\t"],
};

/** Schreibt die Pflichtfälle der Befunde in alle vier Prüfungen. */
const PAIRS: ReadonlyArray<[string, string, string]> = [
  ["Apostroph gerade → typografisch", "don't", "don’t"],
  ["Apostroph typografisch → gerade", "don’t", "don't"],
  ["Bindestrich U+2011", "E-Mail", "E‑Mail"],
  ["Apostroph im Satz", "Tom's Hund bellt.", "Tom’s Hund bellt."],
  ["NFD gegen NFC", "Der Bär läuft.", "Der Bär läuft.".normalize("NFD")],
  ["Anführungszeichen", "„Hallo“, sagt sie.", '"Hallo", sagt sie.'],
  ["geschütztes Leerzeichen", "ice cream", "ice cream"],
];

function vocabularyItem(
  target: string,
  extra: Partial<RunningDictationItem> = {},
): RunningDictationItem {
  return { id: "v", kind: "vocabulary", target, ...extra };
}

describe("normalizeAnswerCharacters", () => {
  it("gleicht Apostrophe, Anführungszeichen, Bindestriche und Leerraum an", () => {
    expect(normalizeAnswerCharacters("  don’t   go ")).toBe("don't go");
    expect(normalizeAnswerCharacters("„a“ »b« ‚c‘")).toBe(`"a" "b" "c'`);
    expect(normalizeAnswerCharacters("a‐b‑c‒d–e—f―g−h")).toBe(
      "a-b-c-d-e-f-g-h",
    );
  });

  it("lässt Groß-/Kleinschreibung unangetastet", () => {
    expect(normalizeAnswerCharacters("Bär")).toBe("Bär");
    expect(answerKey("Bär")).toBe("bär");
    expect(answerKey("Bär", { caseSensitive: true })).toBe("Bär");
  });
});

describe.each(PAIRS)("Zeichenvarianten: %s", (_name, target, input) => {
  it("LernBox-Antwortprüfung", () => {
    const card = createLearningBoxCard({
      deckId: "d",
      question: "Frage",
      answer: target,
    });
    expect(evaluateLearningBoxAnswer(card, input, "forward").accepted).toBe(
      true,
    );
  });

  it("Laufdiktat: Text (Groß-/Kleinschreibung zählt)", () => {
    const item: RunningDictationItem = { id: "t", kind: "text", target };
    expect(checkRunningDictationAnswer(item, input)).toBe(true);
    expect(checkRunningDictationAnswer(item, input.toLowerCase())).toBe(
      input.toLowerCase() === input,
    );
  });

  it("Laufdiktat: Vokabel", () => {
    expect(checkRunningDictationAnswer(vocabularyItem(target), input)).toBe(
      true,
    );
  });

  it("Live-Laufdiktat: Text und Vokabel", () => {
    const text: LiveWord = { id: "t", kind: "text", targetWord: target };
    const vocabulary: LiveWord = {
      id: "v",
      kind: "vocabulary",
      targetWord: target,
    };
    expect(evaluateLiveAnswer(text, input)).toBe("correct");
    expect(evaluateLiveAnswer(vocabulary, input)).toBe("correct");
  });
});

describe("Zeichenvarianten ändern das Prüfergebnis nicht (Eigenschaft)", () => {
  const alphabet = ["a", "b", "é", "'", '"', "-", " "] as const;
  const text = fc
    .array(fc.constantFrom(...alphabet), { minLength: 1, maxLength: 12 })
    .map((chars) => chars.join(""));

  /** Ersetzt ein Vorkommen eines Zeichens durch eine seiner Varianten. */
  const replaceOne = (value: string, pick: number, variant: number) => {
    const spots = [...value]
      .map((char, index) => (VARIANTS[char] ? index : -1))
      .filter((index) => index >= 0);
    if (spots.length === 0) return value;
    const index = spots[pick % spots.length]!;
    const options = VARIANTS[value[index]!]!;
    return (
      value.slice(0, index) +
      options[variant % options.length]! +
      value.slice(index + 1)
    );
  };

  it("Eingabe", () => {
    fc.assert(
      fc.property(
        text,
        text,
        fc.nat(),
        fc.nat(),
        (target, input, pick, variant) => {
          const changed = replaceOne(input, pick, variant);
          expect(answerMatches(target, changed)).toBe(
            answerMatches(target, input),
          );
          expect(
            checkRunningDictationAnswer(vocabularyItem(target), changed),
          ).toBe(checkRunningDictationAnswer(vocabularyItem(target), input));
        },
      ),
    );
  });

  it("Lösung", () => {
    fc.assert(
      fc.property(
        text,
        text,
        fc.nat(),
        fc.nat(),
        (target, input, pick, variant) => {
          const changed = replaceOne(target, pick, variant);
          expect(answerMatches(changed, input)).toBe(
            answerMatches(target, input),
          );
        },
      ),
    );
  });

  it("die Lösung mit Variante passt zur Lösung selbst", () => {
    fc.assert(
      fc.property(text, fc.nat(), fc.nat(), (target, pick, variant) => {
        const changed = replaceOne(target, pick, variant);
        if (answerKey(target) === "") return;
        expect(answerMatches(target, changed)).toBe(true);
      }),
    );
  });
});

describe("answerAlternatives", () => {
  it("nimmt immer den ganzen Text und trennt an | und /", () => {
    expect(answerAlternatives("home | house")).toEqual([
      "home | house",
      "home",
      "house",
    ]);
    expect(answerAlternatives("home / house")).toEqual([
      "home / house",
      "home",
      "house",
    ]);
    expect(answerAlternatives("")).toEqual([]);
    expect(answerAlternatives("  Haus ")).toEqual(["Haus"]);
  });

  it("trennt „/“ nur mit Leerzeichen auf beiden Seiten oder zwischen Wörtern ab zwei Buchstaben", () => {
    expect(answerAlternatives("home/house")).toEqual([
      "home/house",
      "home",
      "house",
    ]);
    expect(answerAlternatives("a / b")).toContain("a");
    // Einheiten und Kürzel bleiben ganz.
    expect(answerAlternatives("km/h")).toEqual(["km/h"]);
    expect(answerAlternatives("m/s")).toEqual(["m/s"]);
    expect(answerAlternatives("1/2")).toEqual(["1/2"]);
    expect(answerAlternatives("home /house")).toEqual(["home /house"]);
  });

  it("trennt nicht innerhalb von Klammern", () => {
    expect(answerAlternatives("Bank (Sitz / Geld)")).toContain("Bank");
    expect(answerAlternatives("Bank (Sitz / Geld)")).not.toContain("Sitz");
  });

  it("macht Klammerteile freiwillig", () => {
    expect(answerAlternatives("(to) go")).toEqual(["(to) go", "to go", "go"]);
    expect(answerAlternatives("Haus (das)")).toEqual([
      "Haus (das)",
      "Haus das",
      "Haus",
    ]);
    expect(answerAlternatives("go (away).")).toContain("go.");
    expect(answerAlternatives("(to) go (away)")).toEqual(
      expect.arrayContaining(["(to) go (away)", "to go away", "go", "to go"]),
    );
  });

  it("begrenzt die Kombinationen bei vielen Klammerteilen", () => {
    const many = answerAlternatives("(a) (b) (c) (d) (e) x");
    expect(many.length).toBeLessThanOrEqual(4);
    expect(many).toContain("x");
  });

  it("trennt das Komma nie von selbst", () => {
    expect(answerAlternatives("groß, riesig")).toEqual(["groß, riesig"]);
  });
});

describe("Alternativen in den Prüfungen", () => {
  const card = (answer: string) =>
    createLearningBoxCard({ deckId: "d", question: "Frage", answer });
  const accepted = (answer: string, input: string) =>
    evaluateLearningBoxAnswer(card(answer), input, "forward").accepted;

  it("LernBox: „(to) go“ akzeptiert „go“ und „to go“", () => {
    expect(accepted("(to) go", "go")).toBe(true);
    expect(accepted("(to) go", "to go")).toBe(true);
    expect(accepted("(to) go", "(to) go")).toBe(true);
    expect(accepted("(to) go", "to")).toBe(false);
  });

  it("LernBox: „home / house“ akzeptiert „home“ und „house“", () => {
    expect(accepted("home / house", "home")).toBe(true);
    expect(accepted("home / house", "House")).toBe(true);
    expect(accepted("home / house", "home / house")).toBe(true);
    expect(accepted("home / house", "flat")).toBe(false);
  });

  it("LernBox: „km/h“ gilt ganz, „h“ allein nicht", () => {
    expect(accepted("km/h", "km/h")).toBe(true);
    expect(accepted("km/h", "h")).toBe(false);
  });

  it("LernBox: „groß, riesig“ akzeptiert „groß“ nicht ohne Bestätigung", () => {
    expect(accepted("groß, riesig", "groß")).toBe(false);
    expect(accepted("groß, riesig", "groß, riesig")).toBe(true);
    // Nach der Bestätigung im Import steht „groß | riesig“ auf der Karte.
    expect(accepted(commaToAlternatives("groß, riesig"), "groß")).toBe(true);
  });

  it("LernBox: leere Eingabe ist nie richtig, auch nicht bei leerem Klammerrest", () => {
    expect(accepted("(to) go", "")).toBe(false);
    expect(accepted("(x)", "")).toBe(false);
  });

  it("LernBox: bleibt streng bei echten Unterschieden", () => {
    expect(accepted("Haus", "Hause")).toBe(false);
    expect(accepted("E-Mail", "EMail")).toBe(false);
  });

  it("Laufdiktat allein: Ziel, Zusatzantworten, Klammern und „/“", () => {
    expect(checkRunningDictationAnswer(vocabularyItem("(to) go"), "go")).toBe(
      true,
    );
    expect(
      checkRunningDictationAnswer(vocabularyItem("home / house"), "house"),
    ).toBe(true);
    expect(
      checkRunningDictationAnswer(
        vocabularyItem("big", { acceptedAnswers: ["large / huge"] }),
        "Huge",
      ),
    ).toBe(true);
    expect(
      checkRunningDictationAnswer(vocabularyItem("groß, riesig"), "groß"),
    ).toBe(false);
    expect(
      checkRunningDictationAnswer(vocabularyItem("Haus"), "haus", true),
    ).toBe(false);
  });

  it("Live-Laufdiktat: Alternativen und Toleranz", () => {
    const word: LiveWord = {
      id: "v",
      kind: "vocabulary",
      targetWord: "(to) go",
      acceptedAnswers: ["home / house"],
      answerLang: "en-GB",
    };
    expect(evaluateLiveAnswer(word, "go")).toBe("correct");
    expect(evaluateLiveAnswer(word, "to go")).toBe("correct");
    expect(evaluateLiveAnswer(word, "house")).toBe("correct");
    expect(evaluateLiveAnswer(word, "hosue", { tolerance: true })).toBe(
      "tolerated",
    );
    expect(evaluateLiveAnswer(word, "run")).toBe("wrong");
  });

  it("Text bleibt streng: Groß-/Kleinschreibung und Wortlaut zählen", () => {
    const item: RunningDictationItem = {
      id: "t",
      kind: "text",
      target: "Der Hund bellt.",
    };
    expect(checkRunningDictationAnswer(item, "Der hund bellt.")).toBe(false);
    expect(checkRunningDictationAnswer(item, "Der Hund bellt")).toBe(false);
    expect(checkRunningDictationAnswer(item, "  Der  Hund bellt. ")).toBe(true);
  });
});

describe("Komma als Trenner", () => {
  it("erkennt ein Komma außerhalb von Klammern", () => {
    expect(hasAlternativeComma("groß, riesig")).toBe(true);
    expect(hasAlternativeComma("groß,riesig")).toBe(true);
    expect(hasAlternativeComma("Haus (das, die)")).toBe(false);
    expect(hasAlternativeComma("0,5")).toBe(false);
    expect(hasAlternativeComma("groß,")).toBe(false);
    expect(hasAlternativeComma("home")).toBe(false);
  });

  it("schreibt „, “ in „ | “ um", () => {
    expect(commaToAlternatives("groß, riesig")).toBe("groß | riesig");
    expect(commaToAlternatives("a,b , c")).toBe("a | b | c");
    expect(commaToAlternatives("Haus (das, die), Heim")).toBe(
      "Haus (das, die) | Heim",
    );
    expect(commaToAlternatives("0,5 Liter")).toBe("0,5 Liter");
    expect(commaToAlternatives("ohne Komma")).toBe("ohne Komma");
  });
});
