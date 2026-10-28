import * as z from "zod";

export const TEACHER_CONTENT_LIBRARY_FORMAT =
  "lernraum.teacher-content-library" as const;
export const TEACHER_CONTENT_LIBRARY_VERSION = 1 as const;

/** Art eines abgelegten Inhalts; fehlt sie, ist es ein Vokabelpaket (Altbestand). */
export const teacherContentKindSchema = z.enum(["vocabulary", "text", "math"]);
export type TeacherContentKind = z.infer<typeof teacherContentKindSchema>;

/** Zerlegung eines Textes in Abschnitte (nur Art „Text“). */
export const teacherTextSplitSchema = z.enum(["satz", "zeile", "wort"]);
export type TeacherTextSplit = z.infer<typeof teacherTextSplitSchema>;

/**
 * Satzzeichen, an denen „Sätzen“ teilen kann (nur Art „Text“). Die Reihenfolge
 * ist die der Knöpfe und zugleich die gespeicherte Reihenfolge.
 */
export const teacherSplitMarkSchema = z.enum([".", "!", "?", ","]);
export type TeacherSplitMark = z.infer<typeof teacherSplitMarkSchema>;

/** „Zeilen“: an jedem Zeilenumbruch teilen oder nur an Leerzeilen (Absätzen). */
export const teacherLineModeSchema = z.enum(["each", "blank"]);
export type TeacherLineMode = z.infer<typeof teacherLineModeSchema>;

/** Längstes eigenes Trennzeichen („;“, „/“, „|“ oder eine kurze Folge). */
export const MAX_CUSTOM_SPLIT_LENGTH = 3;

/** Spielmodus eines Laufdiktat-Raums (wie `TeacherGameMode`). */
export const teacherGameModeSchema = z.enum([
  "LAUFDIKTAT",
  "UEBUNG",
  "BATTLE",
  "STATION",
]);

const flag = z.boolean().optional();
const whole = (min: number, max: number) => z.number().int().min(min).max(max);

/**
 * Vorbereitung eines Laufdiktats: Modus und Optionen, mit denen der Raum
 * später ohne weitere Einstellungen in die Lobby geht („im Unterricht fehlt
 * nur noch die Lobby“). Alle Optionen außer dem Modus sind freiwillig; was
 * fehlt, nimmt der Raum aus seinen Standardwerten. Die Namen entsprechen den
 * Spieloptionen des Lehrer-Raums (`GameSettings`).
 */
export const teacherPreparedSettingsSchema = z
  .object({
    gameMode: teacherGameModeSchema,
    shuffleWords: flag,
    stationShuffle: flag,
    repeatWrongAnswers: flag,
    assistance: flag,
    attempts: whole(1, 20).optional(),
    tts: flag,
    showStars: flag,
    showTempoPoints: flag,
    strictTyping: flag,
    taskHelp: flag,
    stationCount: whole(1, 100).optional(),
    battleInk: flag,
    battleFlicker: flag,
    mathCount: whole(1, 500).optional(),
    mathMin: whole(-1_000_000, 1_000_000).optional(),
    mathMax: whole(-1_000_000, 1_000_000).optional(),
    mathOps: z
      .array(z.enum(["+", "-", "*", "/"]))
      .max(4)
      .optional(),
    mathAllowNegative: flag,
    mathExcludeZeroOperand: flag,
    mathExcludeZeroResult: flag,
    mathGap: flag,
    mathTables: z.array(whole(0, 100)).max(30).optional(),
    /** Nur Vokabeln: Abfragerichtung. */
    direction: z.enum(["left-to-right", "right-to-left", "mixed"]).optional(),
    /** Nur Vokabeln: Groß- und Kleinschreibung zählt. */
    caseSensitive: flag,
    /** Nur Vokabeln: Übernahme in die LernBox. */
    vocabularyTransfer: z.enum(["errors", "all", "none"]).optional(),
    /** Nur Vokabeln: Tag dieser Runde; leer = Standard-Tag. */
    vocabularyTag: z.string().trim().max(60).optional(),
    /** Nur Text: Übernahme in den Wortspeicher. */
    wordStoreTransfer: z.enum(["none", "errors", "all"]).optional(),
  })
  .strict();

export type TeacherPreparedSettings = z.infer<
  typeof teacherPreparedSettingsSchema
>;

export const teacherContentPackageSchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    revision: z.number().int().nonnegative(),
    title: z.string().trim().min(1).max(300),
    source: z.string().min(1).max(5_000_000),
    promptLocale: z.string().trim().min(2).max(35),
    answerLocale: z.string().trim().min(2).max(35),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    /** Fehlt = Vokabeln. */
    kind: teacherContentKindSchema.optional(),
    /** Zugeordnete Klassen; leer oder fehlend = „Nicht zugeordnet“. */
    classIds: z.array(z.uuid()).max(50).optional(),
    /**
     * Letzte Durchführung: Start einer Runde mit diesem Inhalt. Ist sie
     * jünger als `preparedAt` (oder gibt es keine Vorbereitung), steht der
     * Inhalt im Archiv.
     */
    lastUsedAt: z.iso.datetime({ offset: true }).optional(),
    /** Zuletzt (wieder) vorbereitet; holt den Inhalt aus dem Archiv. */
    preparedAt: z.iso.datetime({ offset: true }).optional(),
    /** Gespeicherter Modus und Optionen, mit denen „Starten“ den Raum öffnet. */
    prepared: teacherPreparedSettingsSchema.optional(),
    /** Nur Text: Zerlegung in Stationen. */
    textSplit: teacherTextSplitSchema.optional(),
    /**
     * Nur Text, Zerlegung „Sätzen“: Satzzeichen, an denen geteilt wird. Fehlt
     * das Feld, gilt „. ! ?“ (Stand vor dieser Option).
     */
    splitMarks: z.array(teacherSplitMarkSchema).min(1).max(4).optional(),
    /** Nur Text, „Sätzen“: eigenes Trennzeichen; fehlt es, gibt es keins. */
    splitCustom: z.string().max(MAX_CUSTOM_SPLIT_LENGTH).optional(),
    /** Nur Text, „Zeilen“: Fehlt das Feld, teilt jede Zeile. */
    lineMode: teacherLineModeSchema.optional(),
  })
  .strict();

export const teacherContentLibraryFileSchema = z
  .object({
    format: z.literal(TEACHER_CONTENT_LIBRARY_FORMAT),
    version: z.literal(TEACHER_CONTENT_LIBRARY_VERSION),
    exportedAt: z.iso.datetime({ offset: true }),
    packages: z.array(teacherContentPackageSchema).max(10_000),
  })
  .strict()
  .superRefine((library, context) => {
    const ids = new Set<string>();
    for (const [index, entry] of library.packages.entries()) {
      if (ids.has(entry.id)) {
        context.addIssue({
          code: "custom",
          message: `Doppelte Paket-ID: ${entry.id}`,
          path: ["packages", index, "id"],
        });
      }
      ids.add(entry.id);
    }
  });

export type TeacherContentPackage = z.infer<typeof teacherContentPackageSchema>;
export type TeacherContentLibraryFile = z.infer<
  typeof teacherContentLibraryFileSchema
>;

export function createTeacherContentLibraryFile(
  packages: readonly TeacherContentPackage[],
  exportedAt = new Date().toISOString(),
): TeacherContentLibraryFile {
  return teacherContentLibraryFileSchema.parse({
    format: TEACHER_CONTENT_LIBRARY_FORMAT,
    version: TEACHER_CONTENT_LIBRARY_VERSION,
    exportedAt,
    packages: [...packages].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
  });
}

export function parseTeacherContentLibraryFile(
  value: unknown,
): TeacherContentLibraryFile {
  return teacherContentLibraryFileSchema.parse(value);
}
