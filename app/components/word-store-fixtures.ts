import type { LearningWordStage } from "../../src/domain/learning-word";
import type { LearningWordProgress } from "../../src/domain/learning-word-progress";
import type { WordRoundRecord } from "../../src/domain/word-store-progress";

/** Abgeschlossene Runde für Tests; `day` bestimmt das Datum im Oktober 2026. */
export function roundRecord(
  id: string,
  options: {
    boxId?: string;
    boxTitle?: string;
    stage?: LearningWordStage;
    percent?: number;
    day?: number;
    words?: WordRoundRecord["words"];
  } = {},
): WordRoundRecord {
  const at = `2026-10-${String(options.day ?? 1).padStart(2, "0")}T10:00:00.000Z`;
  const percent = options.percent ?? 100;
  return {
    id,
    boxId: options.boxId ?? "double-consonants",
    boxTitle: options.boxTitle ?? "Doppelkonsonanten",
    stage: options.stage ?? 1,
    startedAt: at,
    completedAt: at,
    words: options.words ?? [
      {
        word: "Sonne",
        firstTry: percent === 100,
        attempts: percent === 100 ? 1 : 2,
        usedHelp: false,
        firstResult: percent === 100 ? "richtig" : "falsch",
      },
    ],
    percent,
  };
}

export function progressRecord(
  word: string,
  options: {
    stage?: LearningWordStage;
    box?: LearningWordProgress["box"];
    attempts?: number;
    incorrectAttempts?: number;
  } = {},
): LearningWordProgress {
  return {
    id: `learning-word:${word.toLowerCase()}`,
    word,
    stage: options.stage ?? 1,
    box: options.box ?? 1,
    dueAt: "2026-10-10T10:00:00.000Z",
    attempts: options.attempts ?? 1,
    incorrectAttempts: options.incorrectAttempts ?? 0,
    helpUses: 0,
    lastPracticedAt: "2026-10-09T10:00:00.000Z",
  };
}
