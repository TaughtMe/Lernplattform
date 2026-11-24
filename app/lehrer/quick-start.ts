import { getLearningWordCollection } from "../../src/domain/german-learning-content";
import {
  generateMentalMathSource,
  type MathOperation,
} from "../../src/integrations/laufdiktat/teacher-session";
import type { GameSettings } from "./live/hooks/use-game-settings";

/**
 * Schnellstart (L25-10, M24-6): Ein Raum ohne Inhaltsschritt. Die Absicht
 * trägt nur die Kennung einer Vorgabe; der Live-Raum macht daraus Aufgaben
 * oder Wörter. Es gibt keine neuen Inhalte, nur Einstellungen für den
 * vorhandenen Rechengenerator und Wörter aus den vorhandenen Wortboxen.
 */

/** Jahrgänge der Kopfrechnen-Vorgabe. */
export const QUICK_GRADES = [1, 2, 3, 4, 5, 6] as const;
export type QuickGrade = (typeof QUICK_GRADES)[number];

/** Vorgabe, wenn die Lehrkraft nichts wählt. */
export const DEFAULT_QUICK_GRADE: QuickGrade = 3;

/** So viele Aufgaben bzw. Wörter hat ein Schnellstart-Raum. */
const TASK_COUNT = 10;
const WORD_COUNT = 10;

type MathRule = {
  hint: string;
  max: number;
  ops: MathOperation[];
  allowNegative?: boolean;
};

const GRADE_RULES: Record<QuickGrade, MathRule> = {
  1: { hint: "Plus und Minus bis 20", max: 20, ops: ["+", "-"] },
  2: { hint: "Plus und Minus bis 100", max: 100, ops: ["+", "-"] },
  3: {
    hint: "Plus, Minus, Mal und Geteilt bis 100",
    max: 100,
    ops: ["+", "-", "*", "/"],
  },
  4: {
    hint: "Plus, Minus, Mal und Geteilt bis 1000",
    max: 1000,
    ops: ["+", "-", "*", "/"],
  },
  5: {
    hint: "Plus, Minus, Mal und Geteilt bis 1000",
    max: 1000,
    ops: ["+", "-", "*", "/"],
  },
  6: {
    hint: "Alle vier Rechenarten bis 1000, auch unter null",
    max: 1000,
    ops: ["+", "-", "*", "/"],
    allowNegative: true,
  },
};

/** Kurze Beschreibung der Vorgabe für einen Jahrgang. */
export function quickGradeHint(grade: number): string {
  return isQuickGrade(grade) ? GRADE_RULES[grade].hint : "";
}

function isQuickGrade(value: number): value is QuickGrade {
  return (QUICK_GRADES as readonly number[]).includes(value);
}

export type QuickPresetGroup = "math" | "words";

export type QuickPreset = {
  id: string;
  label: string;
  group: QuickPresetGroup;
};

/**
 * Wortboxen, die als Live-Quelle taugen: die fachlich berichtigten
 * Regel-Wortboxen. „s, ss und ß“ fehlt, bis die fachliche Prüfung
 * (Umsetzungsplan Wortspeicher) abgeschlossen ist; die Merkwörter sind keine
 * Regelgruppe.
 */
const WORD_BOX_IDS = [
  "double-consonants",
  "ck-tz",
  "final-devoicing",
  "umlaut",
  "long-i",
  "silent-h",
] as const;

const WORD_PREFIX = "wortbox-";
const GRADE_PREFIX = "kopfrechnen-";

/** Die Vorgaben neben „Kopfrechnen live“, in der Reihenfolge der Anzeige. */
export function quickPresets(): QuickPreset[] {
  const words = WORD_BOX_IDS.flatMap((id) => {
    const collection = getLearningWordCollection(id);
    return collection
      ? [
          {
            id: `${WORD_PREFIX}${id}`,
            label: collection.title,
            group: "words" as const,
          },
        ]
      : [];
  });
  return [
    { id: "einmaleins", label: "Einmaleins", group: "math" },
    { id: "plus-minus-1000", label: "Plus/Minus bis 1000", group: "math" },
    ...words,
  ];
}

/** Kennung der Kopfrechnen-Vorgabe für einen Jahrgang. */
export function gradePresetId(grade: number): string {
  return `${GRADE_PREFIX}${grade}`;
}

/** Ist das eine bekannte Vorgabe? Prüft die Absicht beim Lesen. */
export function isQuickStartId(id: string): boolean {
  if (id === "einmaleins" || id === "plus-minus-1000") return true;
  if (id.startsWith(GRADE_PREFIX)) {
    return isQuickGrade(Number(id.slice(GRADE_PREFIX.length)));
  }
  if (id.startsWith(WORD_PREFIX)) {
    const boxId = id.slice(WORD_PREFIX.length);
    return (
      (WORD_BOX_IDS as readonly string[]).includes(boxId) &&
      getLearningWordCollection(boxId) !== undefined
    );
  }
  return false;
}

/** Was der Live-Raum aus einer Vorgabe übernimmt. */
export type QuickStart = {
  title: string;
  contentMode: "math" | "text";
  /** Aufgaben bzw. Wörter, eine pro Zeile. */
  source: string;
  settings: Partial<GameSettings>;
};

type MathStartRule = {
  max: number;
  ops: MathOperation[];
  allowNegative?: boolean;
  tables?: number[];
};

function mathStart(title: string, rule: MathStartRule): QuickStart {
  const tables = rule.tables ?? [];
  const settings: Partial<GameSettings> = {
    gameMode: "LAUFDIKTAT",
    shuffleWords: false,
    mathCount: TASK_COUNT,
    mathMin: 0,
    mathMax: rule.max,
    mathOps: rule.ops,
    mathAllowNegative: rule.allowNegative ?? false,
    // Keine „0 · 7“ und „0 : 5“: sie üben nichts.
    mathExcludeZeroOperand: rule.ops.some((op) => op === "*" || op === "/"),
    mathExcludeZeroResult: false,
    mathGap: false,
    mathTables: tables,
  };
  return {
    title,
    contentMode: "math",
    source: generateMentalMathSource({
      count: TASK_COUNT,
      min: 0,
      max: rule.max,
      operations: rule.ops,
      allowNegativeResults: settings.mathAllowNegative ?? false,
      excludeZeroOperand: settings.mathExcludeZeroOperand ?? false,
      excludeZeroResult: false,
      multiplicationTables: tables,
    }),
    settings,
  };
}

/** Zufällige Auswahl ohne Wiederholung; die Reihenfolge bleibt zufällig. */
function sample<T>(items: readonly T[], count: number, random: () => number) {
  const pool = [...items];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [pool[index], pool[other]] = [pool[other] as T, pool[index] as T];
  }
  return pool.slice(0, count);
}

/**
 * Macht aus einer Vorgabe Inhalt und Einstellungen. Eine unbekannte Kennung
 * ergibt `null`. `random` gibt die Tests frei von Zufall.
 */
export function resolveQuickStart(
  id: string,
  random: () => number = Math.random,
): QuickStart | null {
  if (!isQuickStartId(id)) return null;
  if (id === "einmaleins") {
    return mathStart("Einmaleins", {
      max: 100,
      ops: ["*"],
      tables: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    });
  }
  if (id === "plus-minus-1000") {
    return mathStart("Plus/Minus bis 1000", { max: 1000, ops: ["+", "-"] });
  }
  if (id.startsWith(GRADE_PREFIX)) {
    const grade = Number(id.slice(GRADE_PREFIX.length));
    if (!isQuickGrade(grade)) return null;
    const rule = GRADE_RULES[grade];
    return mathStart(`Kopfrechnen Jahrgang ${grade}`, rule);
  }
  const collection = getLearningWordCollection(id.slice(WORD_PREFIX.length));
  if (!collection) return null;
  return {
    title: `Wortbox ${collection.title}`,
    contentMode: "text",
    source: sample(collection.words, WORD_COUNT, random).join("\n"),
    settings: { gameMode: "LAUFDIKTAT", shuffleWords: false },
  };
}
