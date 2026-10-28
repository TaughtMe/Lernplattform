import { getLearningWordCollection } from "./german-learning-content";
import type { LearningWordStage } from "./learning-word";
import {
  generateMentalMathTasks,
  type MentalMathOperation,
  type MentalMathTask,
} from "./mental-math";

/**
 * Startpunkt statt Test (Umsetzungsplan Welle 3, D2-1 und D2-2).
 *
 * Ein freiwilliger Einstieg je Kernbereich (Rechtschreibung, Kopfrechnen):
 * höchstens 12 Aufgaben in steigender Schwierigkeit, Stufe für Stufe. Zwei
 * Fehler auf einer Stufe beenden ihn. Das Ergebnis ist nur ein Startvorschlag
 * (Wortbox und Merkstufe bzw. Rechenart und Zahlenraum): keine Prozentzahl,
 * kein Etikett, keine Note.
 *
 * Die Antworten laufen als gewöhnliche Lernereignisse durch den
 * Wiederholungskern (Fehler werden fällig); diese Datei kennt nur die Folge der
 * Aufgaben und die Regel, wann sie endet.
 *
 * Die Stufenfolge ist ein fachlicher Vorschlag (kalibrierbar, mit der
 * Lehrkraft abzustimmen): Rechtschreibung vom lautnahen Schreiben über
 * Doppelkonsonanten und Ableiten bis zu s/ss/ß; Kopfrechnen nach dem Lehrplan
 * der Grundschule vom Zahlenraum bis 10 bis zum Zahlenraum bis 1000.
 */

export const START_POINT_MAX_TASKS = 12;
/** So viele Fehler auf einer Stufe beenden den Einstieg. */
export const START_POINT_ERRORS_TO_STOP = 2;
/** Aufgaben je Stufe. */
export const START_POINT_TASKS_PER_LEVEL = 2;

export type StartPointSubject = "spelling" | "math";

export type StartPointTask<Payload> = {
  /** Eindeutig in der Folge, z. B. `spelling:2:1`. */
  id: string;
  /** Stufe, null-basiert, aufsteigend schwerer. */
  level: number;
  payload: Payload;
};

export type StartPointAnswer = {
  taskId: string;
  correct: boolean;
};

export type StartPointEnd =
  /** Zwei Fehler auf einer Stufe. */
  | "two-errors"
  /** Alle Aufgaben der Folge beantwortet (höchstens 12). */
  | "all-answered";

export type StartPointProgress<Payload> =
  | {
      status: "running";
      answered: number;
      total: number;
      /** Nächste Aufgabe. */
      next: StartPointTask<Payload>;
      errorsByLevel: number[];
    }
  | {
      status: "finished";
      answered: number;
      total: number;
      end: StartPointEnd;
      /** Stufe mit zwei Fehlern, falls der Einstieg dort endete. */
      stoppedLevel?: number;
      errorsByLevel: number[];
    };

/**
 * Stand des Einstiegs. Die Antworten gehören der Reihe nach zu den Aufgaben;
 * nach dem Ende zählen weitere Antworten nicht mehr.
 */
export function startPointProgress<Payload>(
  tasks: readonly StartPointTask<Payload>[],
  answers: readonly StartPointAnswer[],
): StartPointProgress<Payload> {
  const sequence = tasks.slice(0, START_POINT_MAX_TASKS);
  const levels = sequence.reduce((max, task) => Math.max(max, task.level), -1);
  const errorsByLevel = Array.from({ length: levels + 1 }, () => 0);
  let answered = 0;
  for (const task of sequence) {
    const answer = answers[answered];
    if (!answer) break;
    answered += 1;
    if (answer.correct) continue;
    errorsByLevel[task.level] = (errorsByLevel[task.level] ?? 0) + 1;
    if ((errorsByLevel[task.level] ?? 0) >= START_POINT_ERRORS_TO_STOP) {
      return {
        status: "finished",
        answered,
        total: sequence.length,
        end: "two-errors",
        stoppedLevel: task.level,
        errorsByLevel,
      };
    }
  }
  const next = sequence[answered];
  return next
    ? {
        status: "running",
        answered,
        total: sequence.length,
        next,
        errorsByLevel,
      }
    : {
        status: "finished",
        answered,
        total: sequence.length,
        end: "all-answered",
        errorsByLevel,
      };
}

export type StartPointReason = "stopped" | "single-error" | "all-correct";

/**
 * Stufe, bei der der Vorschlag ansetzt: dort, wo der Einstieg endete; sonst bei
 * der ersten Stufe mit einem Fehler; ohne Fehler bei der schwersten Stufe.
 * Ohne Antwort gibt es noch keinen Vorschlag.
 */
export function startPointLevel(
  progress: StartPointProgress<unknown>,
  levelCount: number,
): { level: number; reason: StartPointReason } | null {
  if (progress.answered === 0) return null;
  if (progress.status === "finished" && progress.stoppedLevel !== undefined) {
    return { level: progress.stoppedLevel, reason: "stopped" };
  }
  const firstError = progress.errorsByLevel.findIndex((errors) => errors > 0);
  if (firstError >= 0) return { level: firstError, reason: "single-error" };
  return { level: Math.max(0, levelCount - 1), reason: "all-correct" };
}

// ---------------------------------------------------------------------------
// Rechtschreibung

export type SpellingLevel = {
  /** Feste Wortbox des Wortspeichers (`LEARNING_WORD_COLLECTIONS`). */
  collectionId: string;
  /** Zwei Wörter aus dieser Wortbox, das leichtere zuerst. */
  words: readonly [string, string];
};

/**
 * Stufen der Rechtschreibung, aufsteigend. „Dehnungs-h“ und „Merkwörter“
 * fehlen bewusst: Für sie gibt es keine Regel, die man ableiten kann; ein
 * Fehler dort sagt nichts über die Startstufe.
 */
export const SPELLING_LEVELS: readonly SpellingLevel[] = [
  { collectionId: "long-i", words: ["Biene", "Spiegel"] },
  { collectionId: "double-consonants", words: ["Sonne", "Mutter"] },
  { collectionId: "ck-tz", words: ["Jacke", "Katze"] },
  { collectionId: "final-devoicing", words: ["Hund", "Berg"] },
  { collectionId: "umlaut", words: ["Bäume", "Mädchen"] },
  { collectionId: "s-ss-sz", words: ["Straße", "Fluss"] },
];

export type SpellingTask = { word: string; collectionId: string };

/** Die feste Folge der Rechtschreibung (12 Wörter, ohne Zufall). */
export function buildSpellingStartPoint(): StartPointTask<SpellingTask>[] {
  return SPELLING_LEVELS.flatMap((level, levelIndex) =>
    level.words.map((word, index) => ({
      id: `spelling:${levelIndex}:${index}`,
      level: levelIndex,
      payload: { word, collectionId: level.collectionId },
    })),
  );
}

export type SpellingSuggestion = {
  subject: "spelling";
  collectionId: string;
  collectionTitle: string;
  /** Merkstufe des Wortspeichers (1 Abschreiben bis 6 Hören und schreiben). */
  stage: LearningWordStage;
  reason: StartPointReason;
};

/** Merkstufe je Grund: mit Fehlern in der Wortbox mit Hilfen starten, ohne Fehler frei. */
const SPELLING_STAGE: Readonly<Record<StartPointReason, LearningWordStage>> = {
  stopped: 2,
  "single-error": 4,
  "all-correct": 6,
};

export function spellingSuggestion(
  tasks: readonly StartPointTask<SpellingTask>[],
  answers: readonly StartPointAnswer[],
): SpellingSuggestion | null {
  const target = startPointLevel(
    startPointProgress(tasks, answers),
    SPELLING_LEVELS.length,
  );
  const level = target && SPELLING_LEVELS[target.level];
  if (!target || !level) return null;
  return {
    subject: "spelling",
    collectionId: level.collectionId,
    collectionTitle:
      getLearningWordCollection(level.collectionId)?.title ??
      level.collectionId,
    stage: SPELLING_STAGE[target.reason],
    reason: target.reason,
  };
}

// ---------------------------------------------------------------------------
// Kopfrechnen

export type MathLevel = {
  id: string;
  operations: readonly MentalMathOperation[];
  maxValue: number;
  /** Ohne Angabe gelten alle Reihen. */
  tables?: readonly number[];
};

/** Stufen des Kopfrechnens, aufsteigend (Zahlenraum, dann Einmaleins, dann Tausender). */
export const MATH_LEVELS: readonly MathLevel[] = [
  { id: "bis-10", operations: ["add", "subtract"], maxValue: 10 },
  { id: "bis-20", operations: ["add", "subtract"], maxValue: 20 },
  { id: "bis-100", operations: ["add", "subtract"], maxValue: 100 },
  { id: "mal", operations: ["multiply"], maxValue: 100 },
  { id: "geteilt", operations: ["divide"], maxValue: 100 },
  { id: "bis-1000", operations: ["add", "subtract"], maxValue: 1000 },
];

export type MathStartTask = { task: MentalMathTask; levelId: string };

/**
 * Die Folge des Kopfrechnens: zwei verschiedene Aufgaben je Stufe. Der Zufall
 * kommt von außen, damit Tests ihn festlegen können.
 */
export function buildMathStartPoint(
  random: () => number = Math.random,
): StartPointTask<MathStartTask>[] {
  return MATH_LEVELS.flatMap((level, levelIndex) => {
    // Etwas mehr erzeugen, damit zwei verschiedene Aufgaben übrig bleiben.
    const candidates = generateMentalMathTasks(
      {
        operations: level.operations,
        minValue: 0,
        maxValue: level.maxValue,
        count: START_POINT_TASKS_PER_LEVEL * 4,
        allowNegativeResults: false,
        excludeZeroOperand: true,
        ...(level.tables ? { multiplicationTables: level.tables } : {}),
      },
      random,
    );
    const seen = new Set<string>();
    const unique = candidates.filter((task) => {
      if (seen.has(task.source)) return false;
      seen.add(task.source);
      return true;
    });
    return unique.slice(0, START_POINT_TASKS_PER_LEVEL).map((task, index) => ({
      id: `math:${levelIndex}:${index}`,
      level: levelIndex,
      payload: { task, levelId: level.id },
    }));
  });
}

export type MathSuggestion = {
  subject: "math";
  levelId: string;
  operations: readonly MentalMathOperation[];
  maxValue: number;
  reason: StartPointReason;
};

export function mathSuggestion(
  tasks: readonly StartPointTask<MathStartTask>[],
  answers: readonly StartPointAnswer[],
): MathSuggestion | null {
  const target = startPointLevel(
    startPointProgress(tasks, answers),
    MATH_LEVELS.length,
  );
  const level = target && MATH_LEVELS[target.level];
  if (!target || !level) return null;
  return {
    subject: "math",
    levelId: level.id,
    operations: level.operations,
    maxValue: level.maxValue,
    reason: target.reason,
  };
}
