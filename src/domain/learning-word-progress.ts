import {
  LEARNING_ARCHIVE_BONUS_DAYS,
  LEITNER_INTERVAL_DAYS,
} from "./leitner-schedule";
import type { LearningWordStage } from "./learning-word";
import { nextLocalDayStart } from "./local-day";
import { wordKey } from "./word-box";

/**
 * Box 6 ist das Lernarchiv (Regeln A-1 bis A-5). Format: Eine ältere App-Version
 * kennt nur 1 bis 5 und legt Box 6 beim tolerant lesenden Laden (Regel S-1) in
 * die Quarantäne.
 */
export type LearningWordBox = 1 | 2 | 3 | 4 | 5 | 6;

export const LEARNING_ARCHIVE_BOX = 6 as const;

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

type ArchiveFields = Pick<LearningWordProgress, "box" | "dueAt">;

/** Archivwort (A-2): nie regulär fällig, zählt nicht in „Trainingswörter heute“. */
export function isLearningArchiveWord(word: Pick<ArchiveFields, "box">) {
  return word.box === LEARNING_ARCHIVE_BOX;
}

/** Regulär fällig: Wort nicht im Archiv und `dueAt <= now`. */
export function isLearningWordDue(word: ArchiveFields, now: string) {
  return !isLearningArchiveWord(word) && word.dueAt <= now;
}

/** Archivwort, das als Bonus kommen darf (A-2, A-3): `dueAt <= now`. */
export function isLearningArchiveBonusDue(word: ArchiveFields, now: string) {
  return isLearningArchiveWord(word) && word.dueAt <= now;
}

function afterDays(now: string, days: number) {
  return new Date(new Date(now).getTime() + days * 86_400_000).toISOString();
}

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
 * - Lernarchiv (Box 6, A-1 bis A-4): In der fälligen Wiederholung wechselt ein
 *   Wort von Box 5 nach Box 6, wenn der erste Versuch auf Stufe 6 (freier
 *   Abruf) richtig ohne Hilfe und ohne Selbstkorrektur war; Stufe 4 und 5
 *   bleiben bei Box 5. Ein Archivwort ist nie regulär fällig; `dueAt` ist der
 *   früheste Zeitpunkt für den nächsten Bonus (+ 30 Tage). Bonusabfrage (erster
 *   Versuch, fällig) richtig: Box 6, wieder + 30 Tage. Falsch oder mit Hilfe:
 *   wie W-7: Box 1, morgen fällig. Freies Üben ändert die Box nie
 *   (W-1); ein Fehler dort lässt Box 6 stehen, der Bonus darf aber morgen
 *   kommen (wie W-3).
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
      if (isLearningArchiveWord(current)) {
        // Bonusabfrage (A-4).
        if (clean) {
          dueAt = afterDays(input.now, LEARNING_ARCHIVE_BONUS_DAYS);
        } else {
          // Wie W-7: Box 1, morgen fällig.
          box = 1;
          dueAt = nextDay;
        }
      } else if (clean) {
        // Box 5 → Archiv nur mit freiem Abruf (Stufe 6) auf Anhieb (A-1).
        box =
          current.box === 5 && input.stage === 6
            ? LEARNING_ARCHIVE_BOX
            : (Math.min(5, current.box + 1) as LearningWordBox);
        dueAt = afterDays(
          input.now,
          box === LEARNING_ARCHIVE_BOX
            ? LEARNING_ARCHIVE_BONUS_DAYS
            : LEITNER_INTERVAL_DAYS[box],
        );
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
