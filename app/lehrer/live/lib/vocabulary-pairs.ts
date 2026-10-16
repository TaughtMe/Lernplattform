import type { VocabularyPair } from "../../../../src/domain/running-dictation";

export const emptyVocabularySide = () => ({ primary: "", alternatives: [] });

export const emptyVocabularyPair = (): VocabularyPair => ({
  id: crypto.randomUUID(),
  left: emptyVocabularySide(),
  right: emptyVocabularySide(),
});

/** Vokabelpaare als Quelltext: `links|Alternative;rechts;Tag`, eine Zeile je Paar. */
export function serializeVocabularyPairs(pairs: VocabularyPair[]) {
  return pairs
    .map((pair) => {
      const side = (value: VocabularyPair["left"]) =>
        [value.primary, ...value.alternatives].filter(Boolean).join("|");
      const tag = pair.tag?.trim();
      return `${side(pair.left)};${side(pair.right)}${tag ? `;${tag}` : ""}`;
    })
    .join("\n");
}
