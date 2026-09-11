import type { LearningWordStage } from "./learning-word";

export type LearningWordBox = 1 | 2 | 3 | 4 | 5;

export interface LearningWordProgress {
  id: string;
  word: string;
  stage: LearningWordStage;
  box: LearningWordBox;
  dueAt: string;
  attempts: number;
  incorrectAttempts: number;
  helpUses: number;
  lastPracticedAt: string;
}

const intervalsInDays: Record<LearningWordBox, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

export function learningWordId(word: string) {
  return `learning-word:${word.normalize("NFC").trim().toLocaleLowerCase("de-DE")}`;
}

export function updateLearningWordProgress(
  current: LearningWordProgress | undefined,
  input: {
    word: string;
    correct: boolean;
    usedHelp: boolean;
    selfCorrected: boolean;
    stage: LearningWordStage;
    now: string;
  },
): LearningWordProgress {
  const previousBox = current?.box ?? 1;
  const independentSuccess =
    input.correct && !input.usedHelp && !input.selfCorrected;
  const box = input.correct
    ? independentSuccess
      ? (Math.min(5, previousBox + 1) as LearningWordBox)
      : previousBox
    : 1;
  const stage = input.correct
    ? independentSuccess
      ? (Math.min(
          5,
          Math.max(current?.stage ?? input.stage, input.stage) + 1,
        ) as LearningWordStage)
      : (current?.stage ?? input.stage)
    : (Math.max(
        1,
        Math.min(current?.stage ?? input.stage, input.stage) - 1,
      ) as LearningWordStage);
  const dueAt = new Date(
    new Date(input.now).getTime() + intervalsInDays[box] * 86_400_000,
  ).toISOString();

  return {
    id: learningWordId(input.word),
    word: input.word.normalize("NFC").trim(),
    stage,
    box,
    dueAt: input.correct ? dueAt : input.now,
    attempts: (current?.attempts ?? 0) + 1,
    incorrectAttempts:
      (current?.incorrectAttempts ?? 0) + (input.correct ? 0 : 1),
    helpUses: (current?.helpUses ?? 0) + (input.usedHelp ? 1 : 0),
    lastPracticedAt: input.now,
  };
}
