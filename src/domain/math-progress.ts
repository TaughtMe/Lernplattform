import type { CompetenceEntry, CompetenceLevel } from "./competence-profile";

/**
 * Eine Zeile in „Mein Fortschritt“ (Kopfrechnen, MA-13). Es wird nur gezählt,
 * was das Kind schon kann (Entscheidungen 57 und 83): keine Gesamtzahl offener
 * Aufgaben, keine Prozentangabe, kein Rückstand, keine falschen Aufgaben.
 */
export type MathProgressRow = {
  id: string;
  label: string;
  level: CompetenceLevel;
  /** Z. B. „12 Aufgaben richtig gerechnet“; ohne Treffer „Du hast hier angefangen.“ */
  solved: string;
  /** Z. B. „an 3 Tagen ohne Hilfe richtig“; leer, solange kein Tag zählt. */
  days: string;
  practiceHref: string;
};

function solvedText(count: number): string {
  if (count <= 0) return "Du hast hier angefangen.";
  return count === 1
    ? "1 Aufgabe richtig gerechnet"
    : `${count} Aufgaben richtig gerechnet`;
}

function daysText(count: number): string {
  if (count <= 0) return "";
  return count === 1
    ? "an 1 Tag ohne Hilfe richtig"
    : `an ${count} Tagen ohne Hilfe richtig`;
}

/** Kopfrechen-Familien aus dem Kompetenzprofil, mit den meisten richtigen Aufgaben zuerst. */
export function mathProgressRows(
  entries: readonly CompetenceEntry[],
): MathProgressRow[] {
  return entries
    .filter((entry) => entry.kind === "rechenart")
    .sort((a, b) => b.safe - a.safe || a.label.localeCompare(b.label, "de"))
    .map((entry) => ({
      id: entry.id,
      label: entry.label,
      level: entry.level,
      solved: solvedText(entry.safe),
      days: daysText(entry.cleanDays),
      practiceHref: entry.route,
    }));
}
