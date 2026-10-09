import { compareGaps, type WordResult } from "./text-compare";

export const LEARNING_WORD_STAGES = [1, 2, 3, 4, 5, 6] as const;

export type LearningWordStage = (typeof LEARNING_WORD_STAGES)[number];
export type LearningWordBlockSize = 1 | 2 | 3 | 5;

export type LearningWordAttempt = {
  correct: boolean;
  expected: readonly string[];
  submitted: readonly string[];
};

const letterPattern = /[\p{L}\p{M}]/u;

export function parseLearningWords(source: string): string[] {
  const seen = new Set<string>();

  return source
    .split(/[\n,;]+/u)
    .map((word) => word.trim().normalize("NFC"))
    .filter((word) => {
      const key = word.toLocaleLowerCase("de-DE");
      if (!word || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function buildLearningWordPattern(word: string, stage: 2 | 3): string {
  const letters = Array.from(word);
  const visibleEvery = stage === 2 ? 3 : 4;

  return letters
    .map((letter, index) => {
      if (!letterPattern.test(letter)) return letter;
      if (index === 0 || index === letters.length - 1) return letter;
      return index % visibleEvery === 0 ? letter : "_";
    })
    .join("");
}

export function buildLearningWordLengthPattern(word: string): string {
  return Array.from(word)
    .map((letter) => (letterPattern.test(letter) ? "_" : letter))
    .join(" ");
}

export function evaluateLearningWords(
  expected: readonly string[],
  input: string,
): LearningWordAttempt {
  const submitted = parseLearningWords(input);
  const normalize = (word: string) => word.normalize("NFC").trim();
  const expectedSorted = expected.map(normalize).sort();
  const submittedSorted = submitted.map(normalize).sort();

  return {
    correct:
      expectedSorted.length === submittedSorted.length &&
      expectedSorted.every((word, index) => word === submittedSorted[index]),
    expected,
    submitted,
  };
}

export type LearningWordBlockWord = {
  word: string;
  correct: boolean;
  result: WordResult;
};

export type LearningWordBlockEvaluation = {
  words: LearningWordBlockWord[];
  /** Zusätzlich eingegebene Wörter: werden angezeigt, aber nicht abgezogen. */
  extra: string[];
  allCorrect: boolean;
};

/**
 * Stufe 5 je Wort: Ein erwartetes Wort ist richtig, wenn es exakt vorkommt
 * (Reihenfolge egal, jedes eingegebene Wort zählt höchstens einmal). Übrige
 * Eingaben werden dem ähnlichsten fehlenden Wort zugeordnet.
 */
export function evaluateLearningWordBlock(
  expected: readonly string[],
  input: string,
): LearningWordBlockEvaluation {
  const norm = (word: string) => word.normalize("NFC").trim();
  const want = expected.map(norm);
  const got = parseLearningWords(input).map(norm);
  const used = new Set<number>();
  const matched = new Map<number, number>();

  want.forEach((word, wantIndex) => {
    const found = got.findIndex(
      (candidate, index) => !used.has(index) && candidate === word,
    );
    if (found >= 0) {
      used.add(found);
      matched.set(wantIndex, found);
    }
  });

  const open = want.map((_, index) => index).filter((i) => !matched.has(i));
  const take = (accept: (result: WordResult) => boolean) => {
    for (const wantIndex of open) {
      if (matched.has(wantIndex)) continue;
      const found = got.findIndex(
        (candidate, index) =>
          !used.has(index) &&
          accept(compareGaps([want[wantIndex]!], [candidate])[0]!),
      );
      if (found >= 0) {
        used.add(found);
        matched.set(wantIndex, found);
      }
    }
  };
  take((result) => result.kind === "gross-klein");
  take((result) => result.kind === "falsch" && result.nearMiss);
  take(() => true);

  const words = want.map((word, wantIndex): LearningWordBlockWord => {
    const index = matched.get(wantIndex);
    const result = compareGaps(
      [word],
      [index === undefined ? "" : got[index]!],
    )[0]!;
    return { word, correct: result.kind === "richtig", result };
  });
  const extra = got.filter((_, index) => !used.has(index));

  return { words, extra, allCorrect: words.every((entry) => entry.correct) };
}

export function updateLearningWordStage(
  stage: LearningWordStage,
  options: { correct: boolean; usedHelp: boolean; incorrectAttempts: number },
): LearningWordStage {
  if (options.incorrectAttempts >= 2) {
    return Math.max(1, stage - 1) as LearningWordStage;
  }
  if (options.correct && !options.usedHelp && options.incorrectAttempts === 0) {
    return Math.min(6, stage + 1) as LearningWordStage;
  }
  return stage;
}

export function chunkLearningWords(
  words: readonly string[],
  size: LearningWordBlockSize,
): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < words.length; index += size) {
    chunks.push(words.slice(index, index + size));
  }
  return chunks;
}

export function selectLearningWordRound(
  words: readonly string[],
  size: number | "all",
): string[] {
  if (size === "all" || size >= words.length) return [...words];
  const count = Math.max(1, Math.floor(size));
  const step = words.length / count;
  return Array.from(
    { length: count },
    (_, index) => words[Math.floor(index * step)]!,
  );
}
