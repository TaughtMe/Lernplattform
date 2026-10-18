import { describe, expect, it } from "vitest";
import { parseVocabularyTable, pickerLocale } from "./running-dictation";
import type { TeacherContentPackage } from "./teacher-content-library";
import {
  buildVocabularyCatalog,
  describeMerge,
  filterVocabularyCatalog,
  mergeIntoHeft,
  sameLanguagePair,
  selectedPairs,
  selectedSourceTitles,
  suggestQuizTitle,
} from "./vocabulary-catalog";

const pkg = (
  id: string,
  title: string,
  source: string,
  extra: Partial<TeacherContentPackage> = {},
): TeacherContentPackage => ({
  id,
  revision: 1,
  title,
  source,
  promptLocale: "en-GB",
  answerLocale: "de-DE",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-02T10:00:00.000Z",
  ...extra,
});

const unit3 = pkg(
  "u3",
  "Unit 3 · Food",
  "apple;Apfel;Food\nbread;Brot;Food\nhouse;Haus|Heim\nmilk;Milch;Drinks",
  { updatedAt: "2026-10-01T10:00:00.000Z" },
);
const unit2 = pkg("u2", "Unit 2", "cat;Katze\ndog;Hund");
const french = pkg("fr", "Français", "maison;Haus", {
  promptLocale: "fr-FR",
  answerLocale: "de-DE",
  updatedAt: "2026-09-20T10:00:00.000Z",
});

describe("buildVocabularyCatalog", () => {
  it("sortiert Pakete nach letzter Änderung, neueste zuerst", () => {
    const catalog = buildVocabularyCatalog([unit2, french, unit3]);
    expect(catalog.map((entry) => entry.id)).toEqual(["u3", "fr", "u2"]);
    expect(catalog[0]).toMatchObject({ count: 4, title: "Unit 3 · Food" });
  });

  it("gruppiert nach Tag in der Reihenfolge des ersten Auftretens, „Ohne Tag“ am Ende", () => {
    const [entry] = buildVocabularyCatalog([unit3]);
    expect(entry?.groups.map((group) => group.tag)).toEqual([
      "Food",
      "Drinks",
      null,
    ]);
    expect(
      entry?.groups[0]?.pairs.map(({ pair }) => pair.left.primary),
    ).toEqual(["apple", "bread"]);
    expect(entry?.groups[2]?.pairs[0]?.key).toBe("u3:2");
  });

  it("legt ein Paket ohne Tags in genau eine Gruppe ohne Tag", () => {
    const [entry] = buildVocabularyCatalog([unit2]);
    expect(entry?.groups).toHaveLength(1);
    expect(entry?.groups[0]?.tag).toBeNull();
  });

  it("lässt Text, Mathe und Pakete ohne gültige Paare weg", () => {
    const catalog = buildVocabularyCatalog([
      pkg("t", "Text", "Ein Satz.", { kind: "text" }),
      pkg("m", "Mathe", "1+1", { kind: "math" }),
      pkg("x", "Kaputt", "nur eine Spalte"),
      unit2,
    ]);
    expect(catalog.map((entry) => entry.id)).toEqual(["u2"]);
  });
});

describe("Sprachpaar", () => {
  it("vergleicht den Grundteil der Kennung", () => {
    expect(
      sameLanguagePair(
        { left: "en", right: "de" },
        { left: "en-GB", right: "de-DE" },
      ),
    ).toBe(true);
    expect(
      sameLanguagePair(
        { left: "fr-FR", right: "de-DE" },
        { left: "en-GB", right: "de-DE" },
      ),
    ).toBe(false);
  });

  it("unterscheidet die Reihenfolge der Sprachen", () => {
    expect(
      sameLanguagePair(
        { left: "de-DE", right: "en-GB" },
        { left: "en-GB", right: "de-DE" },
      ),
    ).toBe(false);
  });

  it("pickerLocale ordnet „en“ der Auswahl „en-GB“ zu", () => {
    expect(pickerLocale("en", "de-DE")).toBe("en-GB");
    expect(pickerLocale("xx", "de-DE")).toBe("de-DE");
  });
});

describe("filterVocabularyCatalog", () => {
  const catalog = buildVocabularyCatalog([unit3, unit2, french]);

  it("blendet andere Sprachpaare aus und zählt sie", () => {
    const result = filterVocabularyCatalog(catalog, {
      query: "",
      locales: { left: "en-GB", right: "de-DE" },
    });
    expect(result.visible.map((entry) => entry.id)).toEqual(["u3", "u2"]);
    expect(result.hiddenByLanguage).toBe(1);
  });

  it("zeigt ohne Sprachfilter alles", () => {
    const result = filterVocabularyCatalog(catalog, {
      query: "",
      locales: null,
    });
    expect(result.visible).toHaveLength(3);
    expect(result.hiddenByLanguage).toBe(0);
  });

  it("sucht ohne Groß-/Kleinschreibung in beiden Seiten und blendet leere Gruppen aus", () => {
    const result = filterVocabularyCatalog(catalog, {
      query: "  APFEL ",
      locales: null,
    });
    expect(result.visible).toHaveLength(1);
    expect(result.visible[0]?.groups).toHaveLength(1);
    expect(result.visible[0]?.groups[0]?.pairs[0]?.pair.left.primary).toBe(
      "apple",
    );
  });

  it("findet Alternativen und Tags", () => {
    const byAlternative = filterVocabularyCatalog(catalog, {
      query: "heim",
      locales: null,
    });
    expect(byAlternative.visible[0]?.groups[0]?.tag).toBeNull();
    const byTag = filterVocabularyCatalog(catalog, {
      query: "drinks",
      locales: null,
    });
    expect(byTag.visible[0]?.groups.map((group) => group.tag)).toEqual([
      "Drinks",
    ]);
  });

  it("zählt Pakete nicht als ausgeblendet, wenn nur die Suche sie entfernt", () => {
    const result = filterVocabularyCatalog(catalog, {
      query: "katze",
      locales: { left: "en-GB", right: "de-DE" },
    });
    expect(result.visible.map((entry) => entry.id)).toEqual(["u2"]);
    expect(result.hiddenByLanguage).toBe(1);
  });
});

describe("selectedPairs", () => {
  const catalog = buildVocabularyCatalog([unit3, unit2]);

  it("liefert die Auswahl in Paketreihenfolge", () => {
    const pairs = selectedPairs(catalog, new Set(["u2:1", "u3:3", "u3:0"]));
    expect(pairs.map((pair) => pair.left.primary)).toEqual([
      "apple",
      "milk",
      "dog",
    ]);
  });

  it("entfernt Dubletten über Pakete hinweg, die erste Fundstelle behält ihren Tag", () => {
    const other = pkg("u1", "Unit 1", " Apple ; apfel ;Alt", {
      updatedAt: "2026-08-01T10:00:00.000Z",
    });
    const both = buildVocabularyCatalog([unit3, other]);
    const pairs = selectedPairs(both, new Set(["u3:0", "u1:0"]));
    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.tag).toBe("Food");
  });

  it("nennt die Titel der beteiligten Pakete", () => {
    expect(selectedSourceTitles(catalog, new Set(["u2:0", "u3:1"]))).toEqual([
      "Unit 3 · Food",
      "Unit 2",
    ]);
  });
});

describe("mergeIntoHeft", () => {
  const picked = parseVocabularyTable("cat;Katze;A\ndog;Hund");
  const empty = [
    {
      id: "e",
      left: { primary: "", alternatives: [] },
      right: { primary: "", alternatives: [] },
    },
  ];

  it("ersetzt ein leeres Heft", () => {
    const result = mergeIntoHeft(empty, picked);
    expect(result).toMatchObject({ added: 2, skipped: 0, replaced: true });
    expect(result.pairs).toHaveLength(2);
  });

  it("hängt an und überspringt, was schon im Heft steht", () => {
    const heft = parseVocabularyTable(" CAT ; katze ");
    const result = mergeIntoHeft(heft, picked);
    expect(result).toMatchObject({ added: 1, skipped: 1, replaced: false });
    expect(result.pairs.map((pair) => pair.left.primary)).toEqual([
      "CAT",
      "dog",
    ]);
    // Das vorhandene Paar bleibt unverändert, auch sein (leerer) Tag.
    expect(result.pairs[0]).toBe(heft[0]);
  });

  it("verwirft beim Anhängen die leere Startzeile nicht, wenn das Heft gefüllt ist", () => {
    const heft = [...parseVocabularyTable("bird;Vogel"), empty[0]!];
    const result = mergeIntoHeft(heft, picked);
    expect(result.pairs.map((pair) => pair.left.primary)).toEqual([
      "bird",
      "cat",
      "dog",
    ]);
  });
});

describe("suggestQuizTitle", () => {
  const now = new Date(2026, 9, 5, 12);

  it("nennt Datum und ein Ursprungspaket", () => {
    expect(suggestQuizTitle(["Unit 3"], now)).toBe("Abfrage 05.10. · Unit 3");
  });

  it("zählt weitere Pakete", () => {
    expect(suggestQuizTitle(["Unit 3", "Unit 2", "Unit 1"], now)).toBe(
      "Abfrage 05.10. · Unit 3 + 2 weitere",
    );
    expect(suggestQuizTitle(["Unit 3", "Unit 2"], now)).toBe(
      "Abfrage 05.10. · Unit 3 + 1 weitere",
    );
  });

  it("kommt ohne Paket aus und kürzt lange Titel", () => {
    expect(suggestQuizTitle([], now)).toBe("Abfrage 05.10.");
    expect(suggestQuizTitle(["x".repeat(100)], now).length).toBeLessThan(80);
  });
});

describe("describeMerge", () => {
  it("nennt übernommene und übersprungene Vokabeln", () => {
    expect(describeMerge({ added: 10, skipped: 2 })).toBe(
      "10 Vokabeln übernommen, 2 standen schon im Heft.",
    );
    expect(describeMerge({ added: 1, skipped: 1 })).toBe(
      "1 Vokabel übernommen, 1 stand schon im Heft.",
    );
    expect(describeMerge({ added: 3, skipped: 0 })).toBe(
      "3 Vokabeln übernommen.",
    );
  });

  it("meldet, wenn nichts Neues dabei war", () => {
    expect(describeMerge({ added: 0, skipped: 2 })).toBe(
      "Alle 2 Vokabeln standen schon im Heft.",
    );
    expect(describeMerge({ added: 0, skipped: 1 })).toBe(
      "Diese Vokabel stand schon im Heft.",
    );
  });
});
