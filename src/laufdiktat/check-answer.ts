import type { WordItem } from "./types.ts";

// Tolerance for numeric math answers: allows a student-rounded result for
// non-terminating fractions/roots (e.g. 1/3 -> 0.33 instead of
// 0.333333333) without letting real typos through.
const NUMERIC_TOLERANCE = 0.01;

function normalizeVocabularyAnswer(value: string, caseSensitive: boolean, language?: string): string {
  const normalized = value.trim().replace(/\s+/g, " ").normalize("NFC");
  return caseSensitive ? normalized : normalized.toLocaleLowerCase(language);
}

/** Checks a typed answer against a word, following the content type ("kind"). */
export function checkAnswer(item: WordItem, input: string): boolean {
  const val = input.trim();
  if (item.kind === "math") {
    if (val === "") return false;
    const n = parseFloat(val.replace(",", "."));
    return !Number.isNaN(n) && Math.abs(n - Number(item.targetWord)) < NUMERIC_TOLERANCE;
  }
  if (item.kind === "vocabulary") {
    if (val === "") return false;
    const actual = normalizeVocabularyAnswer(val, item.caseSensitive ?? false, item.answerLang);
    const accepted = [item.targetWord, ...(item.acceptedAnswers ?? [])];
    return accepted.some((answer) => normalizeVocabularyAnswer(answer, item.caseSensitive ?? false, item.answerLang) === actual);
  }
  return val === item.targetWord;
}
