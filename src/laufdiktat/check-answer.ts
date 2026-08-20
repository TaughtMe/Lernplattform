import type { WordItem } from "./types.ts";

function normalizeVocabularyAnswer(value: string, caseSensitive: boolean, language?: string): string {
  const normalized = value.trim().replace(/\s+/g, " ").normalize("NFC");
  return caseSensitive ? normalized : normalized.toLocaleLowerCase(language);
}

/** Checks a typed answer against a word, following the content type ("kind"). */
export function checkAnswer(item: WordItem, input: string): boolean {
  const val = input.trim();
  if (item.kind === "vocabulary") {
    if (val === "") return false;
    const actual = normalizeVocabularyAnswer(val, item.caseSensitive ?? false, item.answerLang);
    const accepted = [item.targetWord, ...(item.acceptedAnswers ?? [])];
    return accepted.some((answer) => normalizeVocabularyAnswer(answer, item.caseSensitive ?? false, item.answerLang) === actual);
  }
  return val === item.targetWord;
}
