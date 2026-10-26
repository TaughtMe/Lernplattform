import * as z from "zod";
import { learningEventV1Schema, type LearningEventV1 } from "./learning-bundle";
import type {
  LearningBoxCard,
  LearningBoxDeck,
  LearningBoxFolder,
} from "./learning-box";
import type { LearningWordProgress } from "./learning-word-progress";
import { textboxSessionSchema, type TextboxSession } from "./textbox-session";
import { wordBoxSchema, type WordBox } from "./word-box";
import { wordRoundSchema, type WordRoundRecord } from "./word-store-progress";
import {
  readOneTolerant,
  readTolerant,
  type QuarantinedRecord,
} from "./tolerant-read";
import type { TypingLessonProgress } from "../tastschreiben/typing-progress";

export const PERSONAL_BACKUP_SCHEMA_VERSION = 2 as const;
export const PERSONAL_BACKUP_KIND = "lernraum-personal-backup" as const;

const learningBoxSourceSchema = z
  .object({
    kind: z.enum(["self", "teacher", "import", "running-dictation"]),
    sourceId: z.string().trim().min(1).optional(),
    classId: z.string().trim().min(1).optional(),
  })
  .strict();

const learningBoxSourceLinkSchema = z
  .object({
    source: learningBoxSourceSchema,
    itemId: z.string().trim().min(1),
    revision: z.number().int().nonnegative(),
    promptLocale: z.string().trim().min(2).max(35),
    answerLocale: z.string().trim().min(2).max(35),
  })
  .strict();

const learningBoxLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

const countSchema = z.number().int().nonnegative();
const learningWordProgressBackupSchema = z
  .object({
    id: z.string().min(1),
    word: z.string().min(1),
    stage: z.union([learningBoxLevelSchema, z.literal(6)]),
    // Box 6 = Lernarchiv (Regel A-5); ältere Sicherungen enthalten nur 1 bis 5.
    box: z.union([learningBoxLevelSchema, z.literal(6)]),
    dueAt: z.iso.datetime({ offset: true }),
    attempts: countSchema,
    incorrectAttempts: countSchema,
    helpUses: countSchema,
    lastPracticedAt: z.iso.datetime({ offset: true }),
  })
  .strict();
const typingProgressBackupSchema = z
  .object({
    id: z.string().min(1),
    completed: z.boolean(),
    bestWpm: z.number().nonnegative(),
    bestAccuracy: z.number().min(0).max(100),
    attempts: countSchema,
    lastPracticedAt: z.iso.datetime({ offset: true }),
    problemChars: z.array(
      z.object({ char: z.string().min(1), errors: countSchema }),
    ),
  })
  .strict();

/** Ordner für Stapel (Tabelle `learningBoxFolders`, Regel S-2). */
export const personalBackupFolderSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();

export const personalBackupDeckSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    /** Ordner des Stapels; fehlt der Ordner beim Einspielen, wird das Feld entfernt. */
    folderId: z.string().trim().min(1).optional(),
    frontLocale: z.string().trim().min(2).max(35),
    backLocale: z.string().trim().min(2).max(35),
    source: learningBoxSourceSchema,
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();

export const personalBackupCardSchema = z
  .object({
    id: z.string().trim().min(1),
    deckId: z.string().trim().min(1),
    question: z.string().trim().min(1),
    answer: z.string().trim().min(1),
    tag: z.string().trim().min(1).optional(),
    fingerprint: z.string().trim().min(1),
    source: learningBoxSourceSchema,
    level: learningBoxLevelSchema,
    box: learningBoxLevelSchema,
    interval: z.number().nonnegative(),
    nextReview: z.number().int().nonnegative(),
    writingStreak: z.number().int().nonnegative(),
    reverseBox: learningBoxLevelSchema,
    reverseInterval: z.number().nonnegative(),
    reverseNextReview: z.number().int().nonnegative(),
    reverseWritingStreak: z.number().int().nonnegative(),
    lastReviewed: z.number().int().nonnegative(),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
    sourceLinks: z.array(learningBoxSourceLinkSchema).max(100).optional(),
  })
  .strict();

const personalDataSchema = z
  .object({
    learningEvents: z.array(learningEventV1Schema).max(1_000_000),
    learningBoxDecks: z.array(personalBackupDeckSchema).max(100_000),
    // Ältere Sicherungen kennen LernBox-Ordner nicht.
    learningBoxFolders: z
      .array(personalBackupFolderSchema)
      .max(100_000)
      .default([]),
    learningBoxCards: z.array(personalBackupCardSchema).max(1_000_000),
    learningWordProgress: z
      .array(learningWordProgressBackupSchema)
      .max(100_000),
    typingProgress: z.array(typingProgressBackupSchema).max(100_000),
    // Ältere Sicherungen kennen die Textbox nicht.
    textboxSessions: z.array(textboxSessionSchema).max(100_000).default([]),
    // Ältere Sicherungen kennen Wortboxen und Wortspeicher-Runden nicht.
    wordBoxes: z.array(wordBoxSchema).max(1_000).default([]),
    wordRounds: z.array(wordRoundSchema).max(100_000).default([]),
  })
  .strict();

/** Opaque Originale: werden aufbewahrt, niemals ungeprüft als Lernstand verwendet. */
export const personalBackupRecoveryRecordSchema = z
  .object({
    table: z.enum([
      "learningEvents",
      "learningBoxDecks",
      "learningBoxFolders",
      "learningBoxCards",
      "learningWordProgress",
      "typingProgress",
      "textboxSessions",
      "wordBoxes",
      "wordRounds",
    ]),
    recordId: z.string().min(1),
    raw: z.json(),
  })
  .strict();

export type PersonalBackupRecoveryRecord = z.infer<
  typeof personalBackupRecoveryRecordSchema
>;

export class PersonalBackupRecoveryError extends Error {
  constructor() {
    super(
      "Ein Originaleintrag lässt sich nicht verlustfrei sichern. Die Daten auf diesem Gerät bleiben erhalten.",
    );
    this.name = "PersonalBackupRecoveryError";
  }
}

export const personalLearningBackupSchema = z
  .object({
    kind: z.literal(PERSONAL_BACKUP_KIND),
    schemaVersion: z.literal(PERSONAL_BACKUP_SCHEMA_VERSION),
    exportedAt: z.iso.datetime({ offset: true }),
    dataArea: z.literal("personal"),
    data: personalDataSchema,
    recovery: z
      .array(personalBackupRecoveryRecordSchema)
      .max(3_000_000)
      .default([]),
  })
  .strict();

export type PersonalLearningBackup = z.infer<
  typeof personalLearningBackupSchema
>;

export type PersonalLearningBackupInput = {
  learningEvents: readonly LearningEventV1[];
  learningBoxDecks: readonly LearningBoxDeck[];
  learningBoxFolders?: readonly LearningBoxFolder[];
  learningBoxCards: readonly LearningBoxCard[];
  learningWordProgress: readonly LearningWordProgress[];
  typingProgress: readonly TypingLessonProgress[];
  textboxSessions?: readonly TextboxSession[];
  wordBoxes?: readonly WordBox[];
  wordRounds?: readonly WordRoundRecord[];
};

const legacyBackupSchema = z
  .object({
    decks: z.array(personalBackupDeckSchema),
    cards: z.array(personalBackupCardSchema),
  })
  .strict();

export function createPersonalLearningBackup(
  input: PersonalLearningBackupInput,
  exportedAt = new Date().toISOString(),
  recovery: readonly PersonalBackupRecoveryRecord[] = [],
): PersonalLearningBackup {
  return personalLearningBackupSchema.parse({
    kind: PERSONAL_BACKUP_KIND,
    schemaVersion: PERSONAL_BACKUP_SCHEMA_VERSION,
    exportedAt,
    dataArea: "personal",
    recovery: mergePersonalBackupRecovery(recovery),
    data: {
      learningEvents: [...input.learningEvents],
      learningBoxDecks: [...input.learningBoxDecks],
      learningBoxFolders: [...(input.learningBoxFolders ?? [])],
      learningBoxCards: [...input.learningBoxCards],
      learningWordProgress: [...input.learningWordProgress],
      typingProgress: [...input.typingProgress],
      textboxSessions: [...(input.textboxSessions ?? [])],
      wordBoxes: [...(input.wordBoxes ?? [])],
      wordRounds: [...(input.wordRounds ?? [])],
    },
  });
}

/**
 * Elementschemata je Tabelle der Sicherung. Der Strukturtest stellt sicher, dass
 * sie genau die Tabellen von `personalDataSchema` abdecken.
 */
export const personalBackupTableSchemas = {
  learningEvents: learningEventV1Schema,
  learningBoxDecks: personalBackupDeckSchema,
  learningBoxFolders: personalBackupFolderSchema,
  learningBoxCards: personalBackupCardSchema,
  learningWordProgress: learningWordProgressBackupSchema,
  typingProgress: typingProgressBackupSchema,
  textboxSessions: textboxSessionSchema,
  wordBoxes: wordBoxSchema,
  wordRounds: wordRoundSchema,
} as const;

type PersonalBackupTable = keyof typeof personalBackupTableSchemas;

function canonicalJson(value: unknown) {
  return JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
        )
      : item,
  );
}

export function personalBackupRecoveryKey(
  record: PersonalBackupRecoveryRecord,
) {
  return canonicalJson(record);
}

/** Originale erhalten, wenn tolerantes Lesen etwas entfernt oder verändert. */
export function readPersonalBackupRows<T extends PersonalBackupTable>(
  table: T,
  records: readonly unknown[],
) {
  const read = readTolerant(personalBackupTableSchemas[table], records, table);
  const recovery: PersonalBackupRecoveryRecord[] = [];
  records.forEach((record, index) => {
    const parsed = readOneTolerant(personalBackupTableSchemas[table], record);
    const key =
      record && typeof record === "object"
        ? (record as { id?: unknown }).id
        : undefined;
    const raw = z.json().safeParse(record);
    if (!raw.success) {
      throw new PersonalBackupRecoveryError();
    }
    if (
      parsed !== undefined &&
      canonicalJson(parsed) === canonicalJson(raw.data)
    )
      return;
    recovery.push({
      table,
      recordId: typeof key === "string" && key ? key : `#${index}`,
      raw: raw.data,
    });
  });
  return { ...read, recovery };
}

export function mergePersonalBackupRecovery(
  records: readonly PersonalBackupRecoveryRecord[],
) {
  return [
    ...new Map(
      records.map((record) => [personalBackupRecoveryKey(record), record]),
    ).entries(),
  ]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, record]) => record);
}

/** Tabellen, die auch ältere Sicherungen immer enthalten (alle anderen fehlen dort). */
const REQUIRED_TABLES: readonly PersonalBackupTable[] = [
  "learningEvents",
  "learningBoxDecks",
  "learningBoxCards",
  "learningWordProgress",
  "typingProgress",
];

/** Die Sicherung stammt aus einer neueren App-Version und lässt sich hier nicht lesen. */
export class PersonalBackupVersionError extends Error {
  constructor() {
    super(
      "Diese Sicherung stammt aus einer neueren App-Version. Bitte zuerst die App aktualisieren.",
    );
    this.name = "PersonalBackupVersionError";
  }
}

export type PersonalBackupReadResult = {
  backup: PersonalLearningBackup;
  /** Einzelne Datensätze, die nicht gelesen werden konnten (nicht eingespielt). */
  skipped: QuarantinedRecord[];
};

const backupEnvelopeSchema = personalLearningBackupSchema.extend({
  data: z.record(z.string(), z.unknown()),
});

/**
 * Liest eine Sicherung tolerant (Regel S-1): Zusatzfelder in Datensätzen einer
 * neueren App-Version werden entfernt, einzelne ungültige Datensätze werden
 * übersprungen und gezählt. Hülle, Datenbereich und unbekannte Tabellen bleiben
 * streng; eine höhere `schemaVersion` wird mit klarer Meldung abgelehnt.
 */
export function readPersonalLearningBackup(
  value: unknown,
): PersonalBackupReadResult {
  if (
    value !== null &&
    typeof value === "object" &&
    (value as { kind?: unknown }).kind === PERSONAL_BACKUP_KIND &&
    typeof (value as { schemaVersion?: unknown }).schemaVersion === "number" &&
    (value as { schemaVersion: number }).schemaVersion >
      PERSONAL_BACKUP_SCHEMA_VERSION
  ) {
    throw new PersonalBackupVersionError();
  }

  // v1 hatte keinen Rettungsbereich. Neue Dateien tragen bewusst v2, damit alte
  // Apps sie ablehnen statt Originaldaten beim erneuten Sichern zu verlieren.
  if (
    value !== null &&
    typeof value === "object" &&
    (value as { kind?: unknown }).kind === PERSONAL_BACKUP_KIND &&
    (value as { schemaVersion?: unknown }).schemaVersion === 1
  ) {
    if ("recovery" in value)
      throw new Error("Ungültiger Rettungsbereich in einer v1-Sicherung.");
    value = { ...value, schemaVersion: PERSONAL_BACKUP_SCHEMA_VERSION };
  }

  const legacy = legacyBackupSchema.safeParse(value);
  if (legacy.success) {
    return {
      backup: createPersonalLearningBackup({
        learningEvents: [],
        learningBoxDecks: legacy.data.decks,
        learningBoxCards: legacy.data.cards,
        learningWordProgress: [],
        typingProgress: [],
        textboxSessions: [],
        wordBoxes: [],
        wordRounds: [],
      }),
      skipped: [],
    };
  }

  const envelope = backupEnvelopeSchema.safeParse(value);
  if (!envelope.success) throw envelope.error;
  const { data } = envelope.data;
  const tables = Object.keys(
    personalBackupTableSchemas,
  ) as PersonalBackupTable[];
  // Unbekannte Tabellen bleiben abgelehnt (Datenbereichsgrenze).
  if (Object.keys(data).some((key) => !(key in personalBackupTableSchemas))) {
    throw new Error("Die Sicherung enthält unbekannte Tabellen.");
  }

  const skipped: QuarantinedRecord[] = [];
  const recovery = [...envelope.data.recovery];
  const cleaned: Record<string, unknown[]> = {};
  for (const table of tables) {
    const records = data[table];
    if (records === undefined && !REQUIRED_TABLES.includes(table)) {
      cleaned[table] = [];
      continue;
    }
    if (!Array.isArray(records))
      throw new Error("Eine Tabelle der Sicherung ist keine Liste.");
    const read = readPersonalBackupRows(table, records);
    cleaned[table] = read.items;
    skipped.push(...read.quarantined);
    recovery.push(...read.recovery);
  }

  // Zahl der Datensätze und Gesamtform prüft das strenge Schema ein letztes Mal.
  return {
    backup: personalLearningBackupSchema.parse({
      ...envelope.data,
      data: cleaned,
      recovery: mergePersonalBackupRecovery(recovery),
    }),
    skipped,
  };
}

export function parsePersonalLearningBackup(value: unknown) {
  return readPersonalLearningBackup(value).backup;
}

export function serializePersonalLearningBackup(value: PersonalLearningBackup) {
  return JSON.stringify(personalLearningBackupSchema.parse(value), null, 2);
}

export function readPersonalLearningBackupText(
  value: string,
): PersonalBackupReadResult {
  try {
    return readPersonalLearningBackup(JSON.parse(value));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Die Sicherungsdatei enthält kein gültiges JSON.", {
        cause: error,
      });
    }
    throw error;
  }
}

export function parsePersonalLearningBackupText(value: string) {
  return readPersonalLearningBackupText(value).backup;
}
