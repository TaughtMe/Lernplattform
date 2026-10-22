import { LEITNER_INTERVAL_DAYS } from "./leitner-schedule";
import type { LearningWordStage } from "./learning-word";
import { nextLocalDayStart } from "./local-day";
import { wordKey } from "./word-box";

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

export function learningWordId(word: string) {
  return `learning-word:${wordKey(word)}`;
}

/**
 * Art der Runde: „free“ ist freies Üben (jede Wortbox außer „Trainingswörter
 * heute“) und ändert die Leitner-Box nie. „due“ ist die fällige Wiederholung.
 */
export type LearningWordMode = "free" | "due";

function earlier(left: string, right: string) {
  return new Date(left).getTime() <= new Date(right).getTime() ? left : right;
}

/**
 * Lernstand eines Wortes nach einem Versuch (Regeln W-1 bis W-8 des
 * Umsetzungsplans Audit Welle 1).
 *
 * - Freies Üben: Die Box bleibt. Ein Fehler oder „Wort zeigen“ macht das Wort
 *   spätestens am nächsten Tag fällig. Ein Wort ohne Lernstand erhält Box 1 und
 *   ist am nächsten Tag fällig.
 * - Fällige Wiederholung: Nur der erste Versuch an einem fälligen Wort zählt.
 *   Richtig ohne Hilfe hebt die Box, Fehler oder Hilfe setzen sie auf 1. Ein
 *   Wort, das nicht fällig ist, wird wie freies Üben behandelt.
 * - Merkstufe (beide Modi, nur der erste Versuch): richtig ohne Hilfe →
 *   `max(bisher, Stufe)`, sonst `max(1, min(bisher, Stufe) − 1)`.
 */
export function updateLearningWordProgress(
  current: LearningWordProgress | undefined,
  input: {
    word: string;
    correct: boolean;
    usedHelp: boolean;
    selfCorrected: boolean;
    stage: LearningWordStage;
    now: string;
    mode: LearningWordMode;
    /** Erster Versuch an diesem Wort in dieser Runde. */
    firstAttempt: boolean;
  },
): LearningWordProgress {
  const nextDay = nextLocalDayStart(input.now);
  const clean = input.correct && !input.usedHelp && !input.selfCorrected;
  const isDue =
    current !== undefined &&
    new Date(current.dueAt).getTime() <= new Date(input.now).getTime();

  let box: LearningWordBox = current?.box ?? 1;
  let dueAt = current?.dueAt ?? nextDay;
  if (current !== undefined && input.mode === "due" && isDue) {
    if (input.firstAttempt) {
      if (clean) {
        box = Math.min(5, box + 1) as LearningWordBox;
        dueAt = new Date(
          new Date(input.now).getTime() +
            LEITNER_INTERVAL_DAYS[box] * 86_400_000,
        ).toISOString();
      } else {
        box = 1;
        dueAt = nextDay;
      }
    }
  } else if (current !== undefined && (!input.correct || input.usedHelp)) {
    dueAt = earlier(dueAt, nextDay);
  }

  const known = current?.stage ?? input.stage;
  let stage: LearningWordStage = known;
  if (input.firstAttempt) {
    stage = clean
      ? (Math.max(known, input.stage) as LearningWordStage)
      : (Math.max(1, Math.min(known, input.stage) - 1) as LearningWordStage);
  }

  return {
    id: learningWordId(input.word),
    word: input.word.normalize("NFC").trim(),
    stage,
    box,
    dueAt,
    attempts: (current?.attempts ?? 0) + 1,
    incorrectAttempts:
      (current?.incorrectAttempts ?? 0) + (input.correct ? 0 : 1),
    helpUses: (current?.helpUses ?? 0) + (input.usedHelp ? 1 : 0),
    lastPracticedAt: input.now,
  };
}
