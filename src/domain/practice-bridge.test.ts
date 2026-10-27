import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  BRIDGE_MAX_WORDS,
  buildCollectionLink,
  buildLearningWordsLink,
  buildHistoryLink,
  buildTextboxLink,
  buildWordOrderLink,
  ORDER_DEFAULT_TITLE,
  ORDER_LINK_MAX_LENGTH,
  ORDER_TITLE_MAX,
  parseHistoryParams,
  parseOrderTitleParam,
  readOrderWords,
  parseSourceParam,
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

describe("Wortspeicher-Links: Quelle und Verlauf", () => {
  it("hängt die Quelle „fehler“ an und lässt „textbox“ weg", () => {
    expect(buildLearningWordsLink(["Hund"])).toBe(
      "/frei/german/lernwoerter?woerter=Hund",
    );
    expect(buildLearningWordsLink(["Hund", "Katze"], "fehler")).toBe(
      "/frei/german/lernwoerter?woerter=Hund,Katze&quelle=fehler",
    );
    expect(buildLearningWordsLink([], "fehler")).toBeUndefined();
  });

  it("liest die Quelle mit Rückfall auf „textbox“", () => {
    expect(parseSourceParam("fehler")).toBe("fehler");
    expect(parseSourceParam("textbox")).toBe("textbox");
    expect(parseSourceParam("anderes")).toBe("textbox");
    expect(parseSourceParam(null)).toBe("textbox");
  });

  it("liest und baut Verlaufslinks Zod-geprüft", () => {
    const params = (q: string) => new URLSearchParams(q);
    expect(parseHistoryParams(params("wortbox=silent-h&ansicht=verlauf"))).toBe(
      "silent-h",
    );
    expect(parseHistoryParams(params("wortbox=silent-h"))).toBeUndefined();
    expect(
      parseHistoryParams(params("wortbox=<b>&ansicht=verlauf")),
    ).toBeUndefined();
    expect(parseHistoryParams(params("ansicht=verlauf"))).toBeUndefined();
    expect(buildHistoryLink("silent-h")).toBe(
      "/frei/german/lernwoerter?wortbox=silent-h&ansicht=verlauf",
    );
    expect(buildHistoryLink("Böse Id")).toBe("/frei/german/lernwoerter");
  });
});

describe("Wortauftrag (D4)", () => {
  const origin = "https://lernraum.example";

  describe("parseOrderTitleParam", () => {
    it("liest einen kurzen Titel und ordnet Leerzeichen", () => {
      expect(parseOrderTitleParam("Gruppe  A")).toBe("Gruppe A");
      expect(parseOrderTitleParam("  Wörter mit ie ")).toBe("Wörter mit ie");
    });

    it("ignoriert leere, zu lange und unsaubere Titel", () => {
      expect(parseOrderTitleParam(null)).toBeUndefined();
      expect(parseOrderTitleParam("   ")).toBeUndefined();
      expect(parseOrderTitleParam("a".repeat(ORDER_TITLE_MAX + 1))).toBe(
        undefined,
      );
      expect(parseOrderTitleParam("a".repeat(ORDER_TITLE_MAX))).toBeDefined();
      expect(parseOrderTitleParam("<b>Fett</b>")).toBeUndefined();
      expect(parseOrderTitleParam("Gruppe\u0000A")).toBeUndefined();
      expect(parseOrderTitleParam("a\ud800b")).toBeUndefined();
    });
  });

  describe("readOrderWords", () => {
    it("trennt an Komma, Semikolon und Zeilen und entfernt Doppelte", () => {
      expect(readOrderWords("Ball, Fuß;ball\nStraße\r\n\n Haus ,")).toEqual({
        words: ["Ball", "Fuß", "Straße", "Haus"],
        ignored: 1,
        surplus: 0,
      });
    });

    it("zählt unbrauchbare Wörter und Überschuss", () => {
      const many = Array.from({ length: 52 }, (_, i) => `wort${i}`).join("\n");
      const reading = readOrderWords(`${many}\n<b>\n${"x".repeat(61)}`);
      expect(reading.words).toHaveLength(BRIDGE_MAX_WORDS);
      expect(reading.surplus).toBe(2);
      expect(reading.ignored).toBe(2);
    });
  });

  describe("buildWordOrderLink", () => {
    it("baut Adresse mit Wörtern und Titel", () => {
      const result = buildWordOrderLink(
        { title: "Gruppe A", text: "Ball\nStraße, Fuß" },
        origin,
      );
      expect(result).toMatchObject({
        ok: true,
        title: "Gruppe A",
        words: ["Ball", "Straße", "Fuß"],
      });
      if (!result.ok) return;
      const url = new URL(result.url);
      expect(url.origin).toBe(origin);
      expect(url.pathname).toBe("/frei/german");
      expect(parseWordsParam(url.searchParams.get("woerter"))).toEqual(
        result.words,
      );
      expect(parseOrderTitleParam(url.searchParams.get("auftrag"))).toBe(
        "Gruppe A",
      );
    });

    it("setzt ohne Titel den Standardnamen und gibt ohne Ursprung nur den Pfad", () => {
      const result = buildWordOrderLink({ text: "Ball" });
      expect(result).toEqual({
        ok: true,
        url: `/frei/german?woerter=Ball&auftrag=${ORDER_DEFAULT_TITLE}`,
        words: ["Ball"],
        title: ORDER_DEFAULT_TITLE,
        ignored: 0,
      });
    });

    it("meldet fehlende Wörter, zu viele Wörter und schlechte Titel verständlich", () => {
      expect(buildWordOrderLink({ text: " , \n" })).toMatchObject({
        ok: false,
        problem: "keine-woerter",
        message: "Schreibe mindestens ein Wort auf.",
      });
      const many = Array.from({ length: 51 }, (_, i) => `wort${i}`).join(",");
      expect(buildWordOrderLink({ text: many })).toMatchObject({
        ok: false,
        problem: "zu-viele-woerter",
      });
      expect(
        buildWordOrderLink({ title: "a".repeat(41), text: "Ball" }),
      ).toMatchObject({ ok: false, problem: "titel-zu-lang" });
      expect(buildWordOrderLink({ title: "<b>", text: "Ball" })).toMatchObject({
        ok: false,
        problem: "titel-zeichen",
      });
      expect(
        buildWordOrderLink({ title: "A\u0007B", text: "Ball" }),
      ).toMatchObject({ ok: false, problem: "titel-zeichen" });
    });

    it("macht aus Zeilenumbrüchen im Titel ein Leerzeichen", () => {
      expect(
        buildWordOrderLink({ title: "Gruppe\nA", text: "Ball" }),
      ).toMatchObject({ ok: true, title: "Gruppe A" });
    });

    it("lehnt Listen ab, deren Adresse für einen lesbaren QR zu lang ist", () => {
      // 50 Wörter mit je 30 Zeichen: gültig, aber viel zu dicht.
      const long = Array.from(
        { length: 50 },
        (_, i) => `${"b".repeat(28)}${String(i).padStart(2, "0")}`,
      ).join("\n");
      const result = buildWordOrderLink({ text: long }, origin);
      expect(result).toMatchObject({ ok: false, problem: "link-zu-lang" });
      if (!result.ok) expect(result.message).toMatch(/zwei Aufträge/);
    });

    it("zählt die Grenze an der vollständigen Adresse", () => {
      const withOrigin = (extra: number) =>
        buildWordOrderLink({ text: "Ball" }, `https://${"a".repeat(extra)}`);
      const base = withOrigin(0);
      if (!base.ok) throw new Error("Grundlage ungültig");
      const room = ORDER_LINK_MAX_LENGTH - base.url.length;
      const atLimit = withOrigin(room);
      expect(atLimit.ok && atLimit.url.length).toBe(ORDER_LINK_MAX_LENGTH);
      expect(withOrigin(room + 1)).toMatchObject({
        ok: false,
        problem: "link-zu-lang",
      });
    });

    it("kodiert Sonderzeichen so, dass der Schüler sie unverändert liest", () => {
      const result = buildWordOrderLink({
        title: "Fuß & Ball + mehr",
        text: "a+b, c&d, e=f, 50%, ÄÖÜ, 𝔘nicode",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const params = new URL(result.url, "https://x.invalid").searchParams;
      expect(parseWordsParam(params.get("woerter"))).toEqual(result.words);
      expect(parseOrderTitleParam(params.get("auftrag"))).toBe(result.title);
    });

    it("enthält nichts außer Wörtern und Titel", () => {
      const result = buildWordOrderLink({ title: "Gruppe A", text: "Ball" });
      if (!result.ok) throw new Error("ungültig");
      const keys = [
        ...new URL(result.url, "https://x.invalid").searchParams.keys(),
      ];
      expect(keys).toEqual(["woerter", "auftrag"]);
    });

    it("Eigenschaft: bauen und lesen ergibt dieselben Wörter und denselben Titel", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ unit: "binary", maxLength: 70 }), {
            maxLength: 60,
          }),
          fc.string({ unit: "binary", maxLength: 50 }),
          (words, title) => {
            const result = buildWordOrderLink(
              { title, text: words.join("\n") },
              origin,
            );
            if (!result.ok) return;
            const params = new URL(result.url).searchParams;
            expect(parseWordsParam(params.get("woerter"))).toEqual(
              result.words,
            );
            expect(parseOrderTitleParam(params.get("auftrag"))).toBe(
              result.title,
            );
            expect(result.url.length).toBeLessThanOrEqual(
              ORDER_LINK_MAX_LENGTH,
            );
          },
        ),
        { numRuns: 300 },
      );
    });

    it("Eigenschaft: saubere Wortlisten kommen unverändert und in Reihenfolge an", () => {
      const word = fc
        .stringMatching(/^[A-Za-zÄÖÜäöüß]{1,10}$/)
        .map((value) => value.normalize("NFC"));
      fc.assert(
        fc.property(
          fc.uniqueArray(word, {
            selector: (value) => value.toLocaleLowerCase("de"),
            minLength: 1,
            maxLength: 20,
          }),
          (words) => {
            const result = buildWordOrderLink({ text: words.join(", ") });
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.words).toEqual(words);
            const params = new URL(result.url, "https://x.invalid")
              .searchParams;
            expect(parseWordsParam(params.get("woerter"))).toEqual(words);
          },
        ),
      );
    });
  });
});
