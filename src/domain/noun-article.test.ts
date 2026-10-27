import { describe, expect, it } from "vitest";
import {
  isKnownNoun,
  isNounArticle,
  needsNounArticleTip,
  NOUN_ARTICLE_TIP,
} from "./noun-article";
import { learningWordId } from "./learning-word-progress";

describe("Nomen mit Artikel (G-012, Regel C2-5)", () => {
  it("gibt „das Essen“ und „essen“ getrennte Lernstände", () => {
    expect(learningWordId("das Essen")).toBe("learning-word:das essen");
    expect(learningWordId("essen")).toBe("learning-word:essen");
    expect(learningWordId("Das Essen")).toBe(learningWordId("das Essen"));
  });

  it("erkennt Artikel in jeder Schreibung", () => {
    expect(isNounArticle("Das")).toBe(true);
    expect(isNounArticle(" die ")).toBe(true);
    expect(isNounArticle("DER")).toBe(true);
    expect(isNounArticle("dem")).toBe(false);
    expect(isNounArticle("ein")).toBe(false);
  });

  it("kennt Nomen aus den eingebauten Wortboxen nur großgeschrieben", () => {
    expect(isKnownNoun("Hund")).toBe(true);
    expect(isKnownNoun("hund")).toBe(false);
    expect(isKnownNoun("essen")).toBe(false);
    expect(isKnownNoun("Unbekanntwort")).toBe(false);
  });

  it("zeigt den Tipp nur für ein bekanntes Nomen ohne Artikel", () => {
    expect(needsNounArticleTip("Hund")).toBe(true);
    expect(needsNounArticleTip("Schule, Hund")).toBe(true);
    expect(needsNounArticleTip("der Hund")).toBe(false);
    expect(needsNounArticleTip("das Essen")).toBe(false);
    expect(needsNounArticleTip("essen")).toBe(false);
    expect(needsNounArticleTip("Unbekanntwort")).toBe(false);
    expect(needsNounArticleTip("  ")).toBe(false);
    expect(NOUN_ARTICLE_TIP).toBe(
      "Tipp: Nomen mit Artikel eintragen, z. B. „das Essen“.",
    );
  });
});
