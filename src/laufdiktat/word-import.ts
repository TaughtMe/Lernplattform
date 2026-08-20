import { parseMathLine } from "./math-tasks.ts";
import type { WordItem } from "./types.ts";

/** One plain word or sentence per line. */
export function wordsFromText(text: string): WordItem[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, i) => ({ id: `w-${i}`, kind: "text" as const, targetWord: line }));
}

export function wordsFromMathLines(lines: string[]): WordItem[] {
  return lines.map((line) => parseMathLine(line)).filter((w): w is WordItem => w !== null);
}

/** One vocabulary pair per line: "Wort = Übersetzung", optionally "Übersetzung1/Übersetzung2" for several accepted answers. */
export function wordsFromVocabLines(text: string): WordItem[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("="))
    .map((line, i) => {
      const [prompt = "", answerPart = ""] = line.split("=").map((part) => part.trim());
      const [targetWord = "", ...acceptedAnswers] = answerPart.split("/").map((part) => part.trim()).filter(Boolean);
      return { id: `w-${i}`, kind: "vocabulary" as const, prompt, targetWord, acceptedAnswers: acceptedAnswers.length > 0 ? acceptedAnswers : undefined };
    })
    .filter((w) => w.prompt.length > 0 && w.targetWord.length > 0);
}
