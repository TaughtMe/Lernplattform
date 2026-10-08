import { describe, expect, it } from "vitest";
import {
  BRIDGE_MAX_WORDS,
  buildCollectionLink,
  buildLearningWordsLink,
  buildTextboxLink,
  parseCollectionParam,
  parseWordsParam,
  roundErrorWords,
  wordsForLink,
} from "./practice-bridge";

describe("parseWordsParam", () => {
  it("liest kommagetrennte Wörter, bereinigt und entfernt Doppelte", () => {
    expect(parseWordsParam("Ball, rennt,ball ,,Straße")).toEqual([
      "Ball",
      "rennt",
      "Straße",
    ]);
  });

  it("ignoriert leere und fehlende Parameter", () => {
    expect(parseWordsParam(null)).toEqual([]);
    expect(parseWordsParam(undefined)).toEqual([]);
    expect(parseWordsParam("")).toEqual([]);
    expect(parseWordsParam(" , ,")).toEqual([]);
  });

  it("nimmt genau 50 Wörter an und lehnt mehr ab", () => {
    const words = (n: number) =>
      Array.from({ length: n }, (_, i) => `wort${i}`).join(",");
    expect(parseWordsParam(words(BRIDGE_MAX_WORDS))).toHaveLength(50);
    expect(parseWordsParam(words(BRIDGE_MAX_WORDS + 1))).toEqual([]);
  });

  it("lehnt zu lange Wörter, Spitzklammern und Steuerzeichen ab", () => {
    expect(parseWordsParam("a".repeat(61))).toEqual([]);
    expect(parseWordsParam("Ball,<script>")).toEqual([]);
    expect(parseWordsParam("Ball,Ka\u0000tze")).toEqual([]);
    expect(parseWordsParam("x".repeat(5000))).toEqual([]);
  });

  it("normalisiert auf NFC", () => {
    expect(parseWordsParam("Mühle")).toEqual(["Mühle"]);
  });
});

describe("parseCollectionParam", () => {
  it("kennt nur Sammlungen des Wortspeichers", () => {
    expect(parseCollectionParam("double-consonants")).toBe("double-consonants");
    expect(parseCollectionParam("gibt-es-nicht")).toBeUndefined();
    expect(parseCollectionParam("../etc")).toBeUndefined();
    expect(parseCollectionParam(null)).toBeUndefined();
  });
});

describe("Links", () => {
  it("baut den Link zur Textbox mit Wörtern und Sammlung", () => {
    expect(buildTextboxLink(["Ball", "Straße"], "double-consonants")).toBe(
      "/frei/german/textbox?woerter=Ball,Stra%C3%9Fe&sammlung=double-consonants",
    );
    expect(buildTextboxLink(["Ball"], "own")).toBe(
      "/frei/german/textbox?woerter=Ball",
    );
    expect(buildTextboxLink([], "double-consonants")).toBe(
      "/frei/german/textbox",
    );
  });

  it("kürzt auf 50 Wörter, entfernt Kommas und Doppelte", () => {
    const many = Array.from({ length: 80 }, (_, i) => `wort${i}`);
    expect(wordsForLink(many)).toHaveLength(50);
    expect(wordsForLink(["a,b", "A,B", "", "x".repeat(70)])).toEqual(["a b"]);
    const link = buildTextboxLink(many)!;
    expect(
      parseWordsParam(new URL(link, "http://x").searchParams.get("woerter")),
    ).toHaveLength(50);
  });

  it("baut den Rückweg zum Wortspeicher und liest ihn wieder ein", () => {
    const link = buildLearningWordsLink(["Straße", "Ball"])!;
    expect(link.startsWith("/frei/german/lernwoerter?woerter=")).toBe(true);
    expect(
      parseWordsParam(new URL(link, "http://x").searchParams.get("woerter")),
    ).toEqual(["Straße", "Ball"]);
    expect(buildLearningWordsLink([])).toBeUndefined();
  });

  it("verlinkt Sammlungen nur, wenn sie existieren", () => {
    expect(buildCollectionLink("silent-h")).toBe(
      "/frei/german/lernwoerter?sammlung=silent-h",
    );
    expect(buildCollectionLink("nope")).toBe("/frei/german/lernwoerter");
  });
});

describe("roundErrorWords", () => {
  it("sammelt falsche, groß/klein-falsche und fehlende Wörter einmal", () => {
    expect(
      roundErrorWords([
        { kind: "richtig", expected: "Hund", actual: "Hund", nearMiss: false },
        { kind: "falsch", expected: "Ball", actual: "Bal", nearMiss: true },
        {
          kind: "gross-klein",
          expected: "Katze",
          actual: "katze",
          nearMiss: false,
        },
        { kind: "fehlt", expected: "ball", nearMiss: false },
        { kind: "zusaetzlich", actual: "sehr", nearMiss: false },
        { kind: "fehlt", nearMiss: false },
      ]),
    ).toEqual(["Ball", "Katze"]);
  });
});
