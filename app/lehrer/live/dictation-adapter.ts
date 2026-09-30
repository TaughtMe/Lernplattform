/**
 * Übersetzt zwischen dem Live-Raum-Kern (useTeacherLiveRoom) und der
 * Design-Ansicht 5c/5d. Reine Funktionen, damit die Zuordnung getestet
 * werden kann.
 */
import type { LiveRoomStudent } from "../../../src/integrations/laufdiktat/room-api";
import { aggregateWordErrors } from "../../../src/integrations/laufdiktat/teacher-results";
import {
  DEFAULT_TEXT_SPLIT_CONFIG,
  type TextSplitConfig,
} from "../../../src/domain/running-dictation-sections";
import {
  countMathChainNumbers,
  displayMathNumber,
  evaluateMentalMathExpression,
  formatMathChainTokens,
  isLatexMathSyntax,
  tokenizeMathChain,
} from "../../../src/domain/mental-math";
import type { MathPreviewPart } from "../../views/laufdiktat/math-editor";
import type {
  LiveStudent,
  SplitMode,
  StationState,
  TeacherStep,
} from "../../views/laufdiktat/teacher-dictation-screen";
import type { Stage } from "./use-teacher-live-room";

const WORD_DELIMITER = { id: "wort", value: " " };

export const STEP_OF_STAGE: Record<Stage, TeacherStep> = {
  content: "import",
  settings: "settings",
  lobby: "lobby",
  live: "live",
};

export const STAGE_OF_STEP: Record<TeacherStep, Stage> = {
  import: "content",
  settings: "settings",
  lobby: "lobby",
  live: "live",
};

/** Satz, Zeile oder Wort aus der Trenn-Konfiguration ablesen. */
export function splitModeOf(config: TextSplitConfig): SplitMode {
  if (config.customDelimiters.some(({ value }) => value === " ")) return "wort";
  return config.punctuationEnabled ? "satz" : "zeile";
}

/** Trenn-Konfiguration für Satz (Satzzeichen), Zeile oder Wort. */
export function splitConfigFor(mode: SplitMode): TextSplitConfig {
  if (mode === "satz") return { ...DEFAULT_TEXT_SPLIT_CONFIG };
  if (mode === "zeile") {
    return { ...DEFAULT_TEXT_SPLIT_CONFIG, punctuationEnabled: false };
  }
  // Eigene Trenner wirken nur bei aktiven Trennzeichen; Satzzeichen bleiben
  // dabei am Wort.
  return {
    ...DEFAULT_TEXT_SPLIT_CONFIG,
    punctuation: [],
    customDelimiters: [WORD_DELIMITER],
  };
}

function progressOf(student: LiveRoomStudent | undefined, total: number) {
  if (student?.finished) return total;
  return Math.min(total, student?.currentIndex ?? 0);
}

export type LiveOverview = {
  active: number;
  finished: number;
  overall: number;
  students: LiveStudent[];
  stations: StationState[];
  mistakes: Array<{ word: string; count: number }>;
};

/** Kennzahlen und Listen für den Live-Schritt. */
export function liveOverview({
  students,
  connectedNames,
  total,
  stationMode,
  stationCount,
  labelFor,
  animalFor,
}: {
  students: LiveRoomStudent[];
  connectedNames: string[];
  total: number;
  stationMode: boolean;
  stationCount: number;
  labelFor: (name: string) => string;
  animalFor: (name: string) => string | null;
}): LiveOverview {
  const words = Math.max(1, total);
  const tracked = stationMode
    ? students.filter((student) => student.stationNumber !== null)
    : connectedNames.map((name) =>
        students.find((student) => student.studentName === name),
      );
  const finished = students.filter((student) => student.finished).length;
  const overall = tracked.length
    ? Math.round(
        (tracked.reduce(
          (sum, student) => sum + progressOf(student, words) / words,
          0,
        ) /
          tracked.length) *
          100,
      )
    : 0;
  const names = Array.from(
    new Set([...connectedNames, ...students.map((s) => s.studentName)]),
  );
  return {
    active: Math.max(0, tracked.length - finished),
    finished,
    overall,
    students: names.map((name) => {
      const student = students.find((item) => item.studentName === name);
      return {
        name: labelFor(name),
        animal: animalFor(name),
        progress: progressOf(student, words),
        total: words,
        mistakes: student?.errors ?? 0,
      };
    }),
    stations: Array.from({ length: stationCount }, (_, index) => {
      const number = index + 1;
      const student = students.find((item) => item.stationNumber === number);
      if (!student) return { number, state: "idle", label: "Inaktiv" };
      if (student.finished) return { number, state: "done", label: "Fertig" };
      return {
        number,
        state: "active",
        label: `Wort ${Math.min(words, student.currentIndex + 1)}/${words}`,
      };
    }),
    mistakes: aggregateWordErrors(students)
      .slice(0, 5)
      .map(([word, count]) => ({ word, count })),
  };
}

/** Anzeige einer Mathe-Zeile: Text oder Formel und das Ergebnis. */
export function mathLineParts(line: string) {
  const value = evaluateMentalMathExpression(line);
  const tokens = tokenizeMathChain(line);
  return {
    // Gleiche Schreibweise wie bei den Schülern.
    text: tokens ? formatMathChainTokens(tokens) : line,
    latex: value !== null && isLatexMathSyntax(line),
    result: value === null ? null : displayMathNumber(value),
  };
}

export type MathGapRow = {
  kind: "gaps";
  parts: MathPreviewPart[];
  active: number;
};

/**
 * Vorschau einer Lückenaufgabe: jede Zahl und das Ergebnis lassen sich als
 * Lücke wählen. `null`, wenn die Zeile keine einfache Rechenkette ist.
 */
export function mathGapRow(
  line: string,
  chosen: number | undefined,
): MathGapRow | null {
  const tokens = tokenizeMathChain(line);
  const value = evaluateMentalMathExpression(line);
  if (!tokens || value === null) return null;
  const numberCount = countMathChainNumbers(tokens);
  const parts: MathPreviewPart[] = [];
  let numberIndex = 0;
  tokens.forEach((token, index) => {
    if (token.kind === "symbol") {
      parts.push({ kind: "symbol", text: token.text });
      return;
    }
    // Negative Zahlen nach einem Rechenzeichen in Klammern: „-1 − (-4)“.
    const previous = tokens[index - 1];
    const bracket =
      token.value < 0 &&
      index > 0 &&
      !(previous?.kind === "symbol" && previous.text === "(");
    if (bracket) parts.push({ kind: "symbol", text: "(" });
    parts.push({
      kind: "number",
      text: displayMathNumber(token.value),
      gapIndex: numberIndex,
    });
    if (bracket) parts.push({ kind: "symbol", text: ")" });
    numberIndex += 1;
  });
  parts.push({ kind: "symbol", text: "=" });
  parts.push({
    kind: "number",
    text: displayMathNumber(value),
    gapIndex: numberCount,
  });
  return {
    kind: "gaps",
    parts,
    // Wie im Original: ohne Wahl wird die letzte Rechenzahl zur Lücke.
    active: chosen ?? Math.max(0, numberCount - 1),
  };
}
