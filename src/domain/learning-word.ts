export const LEARNING_WORD_STAGES = [1, 2, 3, 4, 5] as const;

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

export function updateLearningWordStage(
  stage: LearningWordStage,
  options: { correct: boolean; usedHelp: boolean; incorrectAttempts: number },
): LearningWordStage {
  if (options.incorrectAttempts >= 2) {
    return Math.max(1, stage - 1) as LearningWordStage;
  }
  if (options.correct && !options.usedHelp && options.incorrectAttempts === 0) {
    return Math.min(5, stage + 1) as LearningWordStage;
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
