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
