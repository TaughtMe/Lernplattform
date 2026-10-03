import {
  VOCABULARY_LANGUAGES,
  parseVocabularyTable,
} from "./running-dictation";
import {
  buildRunningDictationSections,
  DEFAULT_TEXT_SPLIT_CONFIG,
  type TextSplitConfig,
} from "./running-dictation-sections";
import type {
  TeacherContentKind,
  TeacherContentPackage,
  TeacherTextSplit,
} from "./teacher-content-library";

/** Auswahl „Nicht zugeordnet“ in Adresse und Filtern. */
export const UNASSIGNED = "ohne" as const;

/** Längster vorgeschlagener Titel. */
export const SUGGESTED_TITLE_LENGTH = 60;

export function contentKindOf(
  entry: Pick<TeacherContentPackage, "kind">,
): TeacherContentKind {
  return entry.kind ?? "vocabulary";
}

/** Trenn-Konfiguration für Satz (Satzzeichen), Zeile oder Wort. */
export function textSplitConfigFor(mode: TeacherTextSplit): TextSplitConfig {
  if (mode === "satz") return { ...DEFAULT_TEXT_SPLIT_CONFIG };
  if (mode === "zeile") {
    return { ...DEFAULT_TEXT_SPLIT_CONFIG, punctuationEnabled: false };
  }
  return {
    ...DEFAULT_TEXT_SPLIT_CONFIG,
    punctuation: [],
    customDelimiters: [{ id: "wort", value: " " }],
  };
}

function languageName(locale: string) {
  const base = locale.split("-")[0]?.toLowerCase();
  return (
    VOCABULARY_LANGUAGES.find(
      (language) =>
        language.locale === locale ||
        language.locale.split("-")[0]?.toLowerCase() === base,
    )?.label ?? locale
  );
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/** Metazeile der Ablage; wird aus der Quelle abgeleitet, nicht gespeichert. */
export function describeContent(
  entry: Pick<
    TeacherContentPackage,
    "kind" | "source" | "promptLocale" | "textSplit"
  >,
): string {
  const kind = contentKindOf(entry);
  if (kind === "text") {
    const sections = buildRunningDictationSections(
      entry.source,
      textSplitConfigFor(entry.textSplit ?? "satz"),
    );
    const words = entry.source.split(/\s+/).filter(Boolean).length;
    return `${plural(sections.length, "Abschnitt", "Abschnitte")} · ${plural(words, "Wort", "Wörter")}`;
  }
  if (kind === "math") {
    const tasks = entry.source.split(/\r?\n/).filter((line) => line.trim());
    return plural(tasks.length, "Aufgabe", "Aufgaben");
  }
  const pairs = parseVocabularyTable(entry.source).length;
  return `${plural(pairs, "Vokabel", "Vokabeln")} · ${languageName(entry.promptLocale)}`;
}

/** Titel aus der ersten nichtleeren Zeile, auf 60 Zeichen gekürzt. */
export function suggestTitle(source: string): string {
  const line =
    source
      .split(/\r?\n/)
      .map((part) => part.trim())
      .find(Boolean) ?? "";
  if (line.length <= SUGGESTED_TITLE_LENGTH) return line;
  return `${line.slice(0, SUGGESTED_TITLE_LENGTH - 1).trimEnd()}…`;
}

/** Nur noch aktive Klassen zählen; archivierte IDs fallen weg. */
export function activeClassIdsOf(
  entry: Pick<TeacherContentPackage, "classIds">,
  activeClassIds: ReadonlySet<string>,
): string[] {
  return (entry.classIds ?? []).filter((id) => activeClassIds.has(id));
}

export function isUnassigned(
  entry: Pick<TeacherContentPackage, "classIds">,
  activeClassIds: ReadonlySet<string>,
) {
  return activeClassIdsOf(entry, activeClassIds).length === 0;
}

/** Inhalte einer Klasse bzw. die ohne (aktive) Klasse. */
export function filterByClass<
  T extends Pick<TeacherContentPackage, "classIds">,
>(
  entries: readonly T[],
  selection: string,
  activeClassIds: ReadonlySet<string>,
): T[] {
  return entries.filter((entry) =>
    selection === UNASSIGNED
      ? isUnassigned(entry, activeClassIds)
      : (entry.classIds ?? []).includes(selection),
  );
}

/** Neueste zuerst, nach letzter Nutzung, sonst nach letzter Änderung. */
export function sortForLibrary<
  T extends Pick<TeacherContentPackage, "lastUsedAt" | "updatedAt" | "id">,
>(entries: readonly T[]): T[] {
  const stamp = (entry: T) => entry.lastUsedAt ?? entry.updatedAt;
  return [...entries].sort(
    (left, right) =>
      Date.parse(stamp(right)) - Date.parse(stamp(left)) ||
      left.id.localeCompare(right.id),
  );
}

/** Datum für die Ablage, z. B. „14.09.“. */
export function shortDate(
  entry: Pick<TeacherContentPackage, "lastUsedAt" | "updatedAt">,
  timeZone?: string,
) {
  return new Date(entry.lastUsedAt ?? entry.updatedAt).toLocaleDateString(
    "de-DE",
    { day: "2-digit", month: "2-digit", ...(timeZone ? { timeZone } : {}) },
  );
}

/**
 * Welche Klasse (oder „Nicht zugeordnet“) gerade gewählt ist. Reihenfolge:
 * die Adresse, wenn sie zu einer aktiven Klasse bzw. „ohne“ passt, dann die
 * zuletzt genutzte Klasse, dann die erste Klasse, sonst „Nicht zugeordnet“.
 * „ohne“ aus der Adresse gilt immer; es ist eine bewusste Wahl.
 */
export function resolveClassSelection(input: {
  requested: string | null | undefined;
  lastClassId: string | null | undefined;
  /** Aktive Klassen in der Reihenfolge der Leiste. */
  classIds: readonly string[];
}): string {
  const { requested, lastClassId, classIds } = input;
  if (requested === UNASSIGNED) return UNASSIGNED;
  if (requested && classIds.includes(requested)) return requested;
  if (lastClassId && classIds.includes(lastClassId)) return lastClassId;
  return classIds[0] ?? UNASSIGNED;
}
