/**
 * Lernweg der Tastenwelt (Design 6c): Die Lektionen des Tastschreib-Lehrgangs
 * werden fachlich zu zehn Stationen gebündelt. Die Reihenfolge und die
 * Freischaltung bleiben die des Lehrgangs; eine Station ist geschafft, wenn
 * alle ihre Lektionen geschafft sind.
 */
import { TYPING_LESSONS, type LessonDef } from "./curriculum";

export interface TypingStation {
  id: string;
  title: string;
  lessons: LessonDef[];
}

const STATION_RULES: ReadonlyArray<{
  id: string;
  title: string;
  matches: (lessonId: string) => boolean;
}> = [
  {
    id: "grundstellung",
    title: "Grundstellung",
    matches: (id) =>
      id.startsWith("grundstellung-") ||
      id === "grundreihe-wiederholung" ||
      id === "erste-woerter-grundreihe",
  },
  {
    id: "obere-reihe",
    title: "Obere Reihe",
    matches: (id) =>
      id.startsWith("oben-") ||
      id.startsWith("obere-reihe-") ||
      id === "erste-woerter-obere-reihe",
  },
  {
    id: "untere-reihe",
    title: "Untere Reihe",
    matches: (id) =>
      id.startsWith("unten-") ||
      id.startsWith("untere-reihe-") ||
      id === "alle-reihen-wiederholung" ||
      id === "erste-woerter-alle-reihen",
  },
  {
    id: "grossbuchstaben",
    title: "Großbuchstaben",
    matches: (id) => id === "grossbuchstaben",
  },
  {
    id: "zahlen",
    title: "Zahlen",
    matches: (id) => id.startsWith("zahlen-"),
  },
  {
    id: "zeichen",
    title: "Umlaute und Zeichen",
    matches: (id) => id === "zeichen-und-umlaute",
  },
  {
    id: "festigen",
    title: "Alle Tasten",
    matches: (id) => id === "alle-tasten-wiederholung",
  },
  { id: "woerter", title: "Wörter", matches: (id) => id === "woerter" },
  { id: "saetze", title: "Sätze", matches: (id) => id === "saetze" },
  {
    id: "abschreibtexte",
    title: "Abschreibtexte",
    matches: (id) => id === "freier-text",
  },
];

export function buildTypingStations(
  lessons: readonly LessonDef[] = TYPING_LESSONS,
): TypingStation[] {
  const stations = STATION_RULES.map((rule) => ({
    id: rule.id,
    title: rule.title,
    lessons: lessons.filter((lesson) => rule.matches(lesson.id)),
  }));
  const assigned = new Set(
    stations.flatMap((station) => station.lessons.map((lesson) => lesson.id)),
  );
  const unassigned = lessons.filter((lesson) => !assigned.has(lesson.id));
  if (unassigned.length) {
    // Neue Lektionen ohne Regel landen sichtbar am Ende, statt zu verschwinden.
    stations.push({
      id: "weitere",
      title: "Weitere Übungen",
      lessons: unassigned,
    });
  }
  return stations.filter((station) => station.lessons.length > 0);
}

export type StationState = "done" | "current" | "open" | "locked";

/** Stand je Station aus den geschafften Lektionen. */
export function stationStates(
  stations: readonly TypingStation[],
  completed: ReadonlySet<string>,
): Array<{
  station: TypingStation;
  state: StationState;
  done: number;
  next: LessonDef | null;
}> {
  let currentAssigned = false;
  return stations.map((station) => {
    const done = station.lessons.filter((lesson) =>
      completed.has(lesson.id),
    ).length;
    const next =
      station.lessons.find((lesson) => !completed.has(lesson.id)) ?? null;
    if (!next) return { station, state: "done" as const, done, next };
    if (!currentAssigned) {
      currentAssigned = true;
      return { station, state: "current" as const, done, next };
    }
    return { station, state: "locked" as const, done, next };
  });
}

/** Unsichere Tasten über alle Lektionen, häufigste zuerst. */
export function aggregateProblemChars(
  entries: ReadonlyArray<{
    problemChars: ReadonlyArray<{ char: string; errors: number }>;
  }>,
  limit = 8,
) {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    for (const { char, errors } of entry.problemChars) {
      totals.set(char, (totals.get(char) ?? 0) + errors);
    }
  }
  return [...totals.entries()]
    .map(([char, errors]) => ({ char, errors }))
    .sort(
      (left, right) =>
        right.errors - left.errors || left.char.localeCompare(right.char),
    )
    .slice(0, limit);
}
