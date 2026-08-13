export type SpellingStrategy =
  "Silbieren" | "Verlängern" | "Ableiten" | "Merken";

export type LearningWordCollection = {
  id: string;
  title: string;
  detail: string;
  strategy: SpellingStrategy;
  words: readonly string[];
};

export const LEARNING_WORD_COLLECTIONS: readonly LearningWordCollection[] = [
  {
    id: "double-consonants",
    title: "Doppelkonsonanten",
    detail: "Kurzen Vokal hören und das Wort in Silben sprechen.",
    strategy: "Silbieren",
    words: ["Sonne", "Mutter", "Kissen", "kommen", "schwimmen"],
  },
  {
    id: "ck-tz",
    title: "ck und tz",
    detail: "Die Wortmitte beim deutlichen Silbieren untersuchen.",
    strategy: "Silbieren",
    words: ["Katze", "sitzen", "Jacke", "Brücke", "plötzlich"],
  },
  {
    id: "final-devoicing",
    title: "Auslautverhärtung",
    detail: "Das Wort verlängern, damit der Endlaut hörbar wird.",
    strategy: "Verlängern",
    words: ["Hund", "Weg", "Korb", "lieb", "Wald"],
  },
  {
    id: "umlaut",
    title: "ä/e und äu/eu",
    detail: "Ein verwandtes Wort suchen und die Schreibung ableiten.",
    strategy: "Ableiten",
    words: ["Häuser", "Bäume", "älter", "läuft", "träumen"],
  },
  {
    id: "long-i",
    title: "Langes i",
    detail: "Wörter mit ie als feste Wortbilder sichern.",
    strategy: "Merken",
    words: ["spielen", "sieben", "Brief", "fliegen", "Tier"],
  },
  {
    id: "silent-h",
    title: "Dehnungs-h",
    detail: "Das h ist nicht zuverlässig hörbar und wird mitgelernt.",
    strategy: "Merken",
    words: ["fahren", "wohnen", "Zahl", "fehlen", "nehmen"],
  },
] as const;

export function getLearningWordCollection(id: string) {
  return LEARNING_WORD_COLLECTIONS.find((collection) => collection.id === id);
}
