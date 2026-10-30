import {
  VOCABULARY_LANGUAGES,
  parseVocabularyTable,
} from "./running-dictation";
import {
  buildRunningDictationSections,
  DEFAULT_TEXT_SPLIT_CONFIG,
  type TextSplitConfig,
} from "./running-dictation-sections";
import {
  MAX_CUSTOM_SPLIT_LENGTH,
  teacherSplitMarkSchema,
  type TeacherContentKind,
  type TeacherContentPackage,
  type TeacherLineMode,
  type TeacherPreparedSettings,
  type TeacherSplitMark,
  type TeacherTextSplit,
} from "./teacher-content-library";

/** Auswahl „Nicht zugeordnet“ in Adresse und Filtern. */
export const UNASSIGNED = "ohne" as const;

/** Längster vorgeschlagener Titel. */
export const SUGGESTED_TITLE_LENGTH = 60;

/** Inhalte, aus denen ein Raum entsteht; Lernwortlisten (D4) gehören nicht dazu. */
export type RoomContentKind = Exclude<TeacherContentKind, "wordlist">;
export type RoomContentPackage = TeacherContentPackage & {
  kind?: RoomContentKind | undefined;
};

export function isRoomContent(
  entry: TeacherContentPackage,
): entry is RoomContentPackage {
  return entry.kind !== "wordlist";
}

export function contentKindOf(
  entry: Pick<RoomContentPackage, "kind">,
): RoomContentKind;
export function contentKindOf(
  entry: Pick<TeacherContentPackage, "kind">,
): TeacherContentKind;
export function contentKindOf(
  entry: Pick<TeacherContentPackage, "kind">,
): TeacherContentKind {
  return entry.kind ?? "vocabulary";
}

/** Satzzeichen in der Reihenfolge der Knöpfe. */
export const SPLIT_MARKS: readonly TeacherSplitMark[] =
  teacherSplitMarkSchema.options;

/** Standard bei „Sätzen“: wie vor der Option „Trennen bei“. */
export const DEFAULT_SPLIT_MARKS: readonly TeacherSplitMark[] = [".", "!", "?"];

/**
 * Feineinstellungen der Zerlegung. Fehlende Angaben gelten als Standard
 * („. ! ?“, kein eigenes Zeichen, jede Zeile): So lesen sich Inhalte, die vor
 * dieser Option abgelegt wurden, genau wie früher.
 */
export type TextSplitOptions = {
  marks?: readonly string[] | undefined;
  custom?: string | undefined;
  lineMode?: TeacherLineMode | undefined;
};

/** Nur bekannte Satzzeichen, ohne Doppelte, in Knopf-Reihenfolge; leer = Standard. */
export function normalizeSplitMarks(
  marks: readonly string[] | undefined,
): TeacherSplitMark[] {
  const known = SPLIT_MARKS.filter((mark) => marks?.includes(mark));
  return known.length ? known : [...DEFAULT_SPLIT_MARKS];
}

/** Eigenes Trennzeichen: ohne Leerraum (das wäre „Wörter“), höchstens drei Zeichen. */
export function normalizeSplitCustom(value: string | undefined): string {
  return [...(value ?? "").replace(/\s/gu, "")]
    .slice(0, MAX_CUSTOM_SPLIT_LENGTH)
    .join("");
}

/**
 * Trenn-Konfiguration für Satz (Satzzeichen), Zeile oder Wort. Die Angaben
 * für Zeichen und Zeilen bleiben auch im jeweils anderen Modus in der
 * Konfiguration stehen (dort ohne Wirkung), damit ein Wechsel sie nicht löscht.
 */
export function textSplitConfigFor(
  mode: TeacherTextSplit,
  options: TextSplitOptions = {},
): TextSplitConfig {
  if (mode === "wort") {
    return {
      ...DEFAULT_TEXT_SPLIT_CONFIG,
      punctuation: [],
      customDelimiters: [{ id: "wort", value: " " }],
    };
  }
  const custom = normalizeSplitCustom(options.custom);
  const base: TextSplitConfig = {
    ...DEFAULT_TEXT_SPLIT_CONFIG,
    punctuation: normalizeSplitMarks(options.marks),
    customDelimiters: custom ? [{ id: "eigen", value: custom }] : [],
  };
  if (mode === "satz") {
    return options.lineMode === "blank"
      ? { ...base, lineChoice: "paragraph" }
      : base;
  }
  return {
    ...base,
    punctuationEnabled: false,
    newlineMode: options.lineMode === "blank" ? "paragraph" : "line",
  };
}

/** Umkehrung zu `textSplitConfigFor`; bei „Wörtern“ sind es die Standardwerte. */
export function textSplitOptionsOf(config: TextSplitConfig): {
  marks: TeacherSplitMark[];
  custom: string;
  lineMode: TeacherLineMode;
} {
  const custom = config.customDelimiters.find(
    ({ value }) => value.trim() !== "",
  );
  return {
    marks: normalizeSplitMarks(config.punctuation),
    custom: normalizeSplitCustom(custom?.value),
    // Bei „Sätzen“ ruht die Wahl in `lineChoice`, bei „Zeilen“ gilt `newlineMode`.
    lineMode:
      (config.punctuationEnabled ? config.lineChoice : config.newlineMode) ===
      "paragraph"
        ? "blank"
        : "each",
  };
}

/** Angaben eines abgelegten Inhalts; fehlende Felder bleiben fehlend (Standard). */
export function splitOptionsOfPackage(
  entry: Pick<TeacherContentPackage, "splitMarks" | "splitCustom" | "lineMode">,
): TextSplitOptions {
  return {
    marks: entry.splitMarks,
    custom: entry.splitCustom,
    lineMode: entry.lineMode,
  };
}

/**
 * Felder für das Paket: nur Abweichungen vom Standard. Ein Inhalt mit
 * Standardwerten bleibt damit für ältere App-Stände unverändert lesbar.
 */
export function splitFieldsOf(
  options: TextSplitOptions,
): Pick<TeacherContentPackage, "splitMarks" | "splitCustom" | "lineMode"> {
  const marks = normalizeSplitMarks(options.marks);
  const custom = normalizeSplitCustom(options.custom);
  return {
    ...(marks.join("") === DEFAULT_SPLIT_MARKS.join("")
      ? {}
      : { splitMarks: marks }),
    ...(custom ? { splitCustom: custom } : {}),
    ...(options.lineMode === "blank" ? { lineMode: "blank" as const } : {}),
  };
}

/** Eine Änderung der Feineinstellungen auf eine Konfiguration anwenden. */
export function applyTextSplitOptions(
  config: TextSplitConfig,
  patch: TextSplitOptions,
  mode: TeacherTextSplit,
): TextSplitConfig {
  // „Wörter“ kennt keine Feineinstellung.
  if (mode === "wort") return config;
  const current = textSplitOptionsOf(config);
  // Ohne ein gültiges Zeichen bleibt die bisherige Wahl (mindestens eins aktiv).
  const chosen = SPLIT_MARKS.filter((mark) => patch.marks?.includes(mark));
  const marks = chosen.length ? chosen : current.marks;
  return textSplitConfigFor(mode, {
    marks,
    custom: patch.custom ?? current.custom,
    lineMode: patch.lineMode ?? current.lineMode,
  });
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
    | "kind"
    | "source"
    | "promptLocale"
    | "textSplit"
    | "splitMarks"
    | "splitCustom"
    | "lineMode"
  >,
): string {
  const kind = contentKindOf(entry);
  if (kind === "text") {
    const sections = buildRunningDictationSections(
      entry.source,
      textSplitConfigFor(
        entry.textSplit ?? "satz",
        splitOptionsOfPackage(entry),
      ),
    );
    const words = entry.source.split(/\s+/).filter(Boolean).length;
    return `${plural(sections.length, "Abschnitt", "Abschnitte")} · ${plural(words, "Wort", "Wörter")}`;
  }
  if (kind === "math") {
    const tasks = entry.source.split(/\r?\n/).filter((line) => line.trim());
    return plural(tasks.length, "Aufgabe", "Aufgaben");
  }
  if (kind === "wordlist") {
    const words = entry.source.split(/\r?\n/).filter((line) => line.trim());
    return plural(words.length, "Lernwort", "Lernwörter");
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

export type LibrarySortKey = "title" | "kind" | "date" | "ran";

const KIND_RANK = { text: 0, vocabulary: 1, math: 2, wordlist: 3 } as const;

/**
 * Sortiert die Ablage nach Titel, Aufgabentyp, Änderungsdatum oder letzter
 * Durchführung. `dir` 1 = aufsteigend. Nie Durchgeführtes steht bei „ran“
 * immer hinten; gleiche Werte behalten die Reihenfolge von `sortForLibrary`.
 */
export function sortLibrary<
  T extends Pick<
    TeacherContentPackage,
    "title" | "kind" | "lastUsedAt" | "updatedAt" | "id"
  >,
>(entries: readonly T[], key: LibrarySortKey, dir: 1 | -1): T[] {
  const base = sortForLibrary(entries);
  const compare = (left: T, right: T): number => {
    switch (key) {
      case "title":
        return left.title.localeCompare(right.title, "de", {
          sensitivity: "base",
          numeric: true,
        });
      case "kind":
        return KIND_RANK[contentKindOf(left)] - KIND_RANK[contentKindOf(right)];
      case "date":
        return Date.parse(left.updatedAt) - Date.parse(right.updatedAt);
      case "ran":
        return (
          Date.parse(left.lastUsedAt ?? "") - Date.parse(right.lastUsedAt ?? "")
        );
    }
  };
  return base.sort((left, right) => {
    if (key === "ran") {
      const never = (entry: T) => !entry.lastUsedAt;
      if (never(left) !== never(right)) return never(left) ? 1 : -1;
      if (never(left)) return 0;
    }
    return compare(left, right) * dir;
  });
}

/** Datum der letzten Durchführung („14.09.“) oder `null`, wenn nie gestartet. */
export function ranDate(
  entry: Pick<TeacherContentPackage, "lastUsedAt">,
  timeZone?: string,
) {
  return entry.lastUsedAt
    ? new Date(entry.lastUsedAt).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        ...(timeZone ? { timeZone } : {}),
      })
    : null;
}

/**
 * Steht der Inhalt im Archiv? Ja, wenn er durchgeführt und seitdem nicht
 * wieder vorbereitet wurde. Alles andere einer Klasse gilt als vorbereitet,
 * auch ein nur gespeicherter Inhalt (er startet mit den Standardoptionen).
 */
export function isArchived(
  entry: Pick<TeacherContentPackage, "lastUsedAt" | "preparedAt">,
): boolean {
  if (!entry.lastUsedAt) return false;
  if (!entry.preparedAt) return true;
  return Date.parse(entry.lastUsedAt) > Date.parse(entry.preparedAt);
}

/** Vorbereitete Inhalte: zuletzt vorbereitet oder geändert zuerst. */
export function sortPrepared<
  T extends Pick<TeacherContentPackage, "preparedAt" | "updatedAt" | "id">,
>(entries: readonly T[]): T[] {
  const stamp = (entry: T) => entry.preparedAt ?? entry.updatedAt;
  return [...entries].sort(
    (left, right) =>
      Date.parse(stamp(right)) - Date.parse(stamp(left)) ||
      left.id.localeCompare(right.id),
  );
}

/** Namen der Spielmodi wie im Laufdiktat. */
export const GAME_MODE_LABELS: Record<
  TeacherPreparedSettings["gameMode"],
  string
> = {
  LAUFDIKTAT: "Laufdiktat",
  UEBUNG: "Freies Üben",
  BATTLE: "Battle",
  STATION: "Stationen",
};

/**
 * Modus und die wichtigsten Optionen einer Vorbereitung, z. B.
 * „Stationen · 5 Stationen · Vorlesen an“. Ohne Vorbereitung startet der Raum
 * als Laufdiktat mit den Standardoptionen.
 */
export function describePrepared(prepared?: TeacherPreparedSettings): string {
  const settings = prepared ?? { gameMode: "LAUFDIKTAT" as const };
  const parts: string[] = [];
  if (settings.gameMode === "STATION" && settings.stationCount) {
    parts.push(plural(settings.stationCount, "Station", "Stationen"));
  }
  if (settings.gameMode === "BATTLE") {
    const ink = settings.battleInk ?? true;
    const flicker = settings.battleFlicker ?? true;
    parts.push(
      ink && flicker
        ? "Tinte und Flimmern"
        : ink
          ? "nur Tinte"
          : flicker
            ? "nur Flimmern"
            : "ohne Störangriffe",
    );
  }
  if (settings.tts) parts.push("Vorlesen an");
  if (settings.mathGap) parts.push("mit Lücken");
  if (settings.strictTyping) parts.push("genaues Tippen");
  if (parts.length === 0) parts.push("Standard");
  return [GAME_MODE_LABELS[settings.gameMode], ...parts].join(" · ");
}

/** Archiv: Modus der letzten Durchführung und ihr Datum. */
export function describeRun(
  entry: Pick<TeacherContentPackage, "lastUsedAt" | "prepared">,
  timeZone?: string,
): string {
  const date = ranDate(entry, timeZone);
  const ran = date ? `durchgeführt ${date}` : "noch nie durchgeführt";
  return entry.prepared
    ? `${GAME_MODE_LABELS[entry.prepared.gameMode]} · ${ran}`
    : ran;
}

/**
 * Stand eines Inhalts für die Liste „Aus anderen Klassen holen“:
 * durchgeführt (mit Datum), vorbereitet oder noch nie durchgeführt.
 */
export function describeState(
  entry: Pick<TeacherContentPackage, "lastUsedAt" | "preparedAt" | "prepared">,
  timeZone?: string,
): string {
  if (isArchived(entry)) return `durchgeführt ${ranDate(entry, timeZone)}`;
  if (entry.prepared || entry.preparedAt || entry.lastUsedAt) {
    return "vorbereitet";
  }
  return "noch nie durchgeführt";
}

/** Änderungsdatum der Ablage, z. B. „14.09.“. */
export function changedDate(
  entry: Pick<TeacherContentPackage, "updatedAt">,
  timeZone?: string,
) {
  return new Date(entry.updatedAt).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  });
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
