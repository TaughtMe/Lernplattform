import { LEARNING_WORD_COLLECTIONS } from "./german-learning-content";

/**
 * Nomen stehen im Wortspeicher mit Artikel („das Essen“). So bleiben „das
 * Essen“ und „essen“ zwei Wörter mit eigenem Lernstand (Audit G-012).
 */
const ARTICLES = new Set(["der", "die", "das"]);

export const NOUN_ARTICLE_TIP =
  "Tipp: Nomen mit Artikel eintragen, z. B. „das Essen“.";

/** Ist das Wort (ohne Rand) „der“, „die“ oder „das“, in beliebiger Schreibung? */
export function isNounArticle(word: string): boolean {
  return ARTICLES.has(word.normalize("NFC").trim().toLocaleLowerCase("de-DE"));
}

let knownNouns: ReadonlySet<string> | undefined;

/** Großgeschrieben bekannte Wörter (Nomen) der eingebauten Wortboxen, einmal gebaut. */
function knownNounIndex(): ReadonlySet<string> {
  knownNouns ??= new Set(
    LEARNING_WORD_COLLECTIONS.flatMap((collection) => collection.words)
      .map((word) => word.normalize("NFC"))
      .filter((word) => /^\p{Lu}/u.test(word)),
  );
  return knownNouns;
}

/** Ist das Wort ein bekanntes Nomen der eingebauten Wortboxen (genau so geschrieben)? */
export function isKnownNoun(word: string): boolean {
  return knownNounIndex().has(word.normalize("NFC"));
}

/**
 * Soll der Hinweis „Nomen mit Artikel“ erscheinen? Ja, wenn unter den
 * eingegebenen Begriffen ein einzelnes, großgeschriebenes und als Nomen
 * bekanntes Wort steht. Begriffe mit Artikel („das Essen“) lösen ihn nicht aus.
 */
export function needsNounArticleTip(text: string): boolean {
  return text
    .split(/[\r\n,;]+/u)
    .map((entry) => entry.trim())
    .some((entry) => entry !== "" && !/\s/u.test(entry) && isKnownNoun(entry));
}
