import {
  parsePersonalLearningBackupText,
  PersonalBackupVersionError,
  readPersonalLearningBackupText,
  type PersonalLearningBackup,
} from "../../domain/personal-backup";
import {
  exportPersonalLearningBackup,
  restorePersonalLearningBackupRead,
  serializePersonalLearningBackupFromDatabase,
} from "../../storage/personal-backup";
import { PersonalLearningDatabase } from "../../storage/personal-learning-events";

export type PersonalBackupStorageErrorCode =
  "unsupported" | "quota-exceeded" | "corrupt" | "newer-version" | "io";

export class PersonalBackupStorageError extends Error {
  constructor(
    readonly code: PersonalBackupStorageErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "PersonalBackupStorageError";
  }
}

/** Fehler beim Lesen einer Sicherungsdatei; eine neuere App-Version bekommt ihre eigene Meldung. */
function corruptBackupError(error: unknown) {
  if (error instanceof PersonalBackupVersionError) {
    return new PersonalBackupStorageError("newer-version", error.message, {
      cause: error,
    });
  }
  return new PersonalBackupStorageError(
    "corrupt",
    "Die Sicherungsdatei ist beschädigt oder hat ein unbekanntes Datenformat.",
    { cause: error },
  );
}

function isQuotaError(error: unknown) {
  return error instanceof DOMException && error.name === "QuotaExceededError";
}

function isUnsupportedError(error: unknown) {
  return error instanceof DOMException && error.name === "NotSupportedError";
}

function mapStorageError(error: unknown): PersonalBackupStorageError {
  if (error instanceof PersonalBackupStorageError) return error;
  if (isQuotaError(error)) {
    return new PersonalBackupStorageError(
      "quota-exceeded",
      "Für die Sicherungsdatei ist nicht genügend Speicher verfügbar.",
      { cause: error },
    );
  }
  if (isUnsupportedError(error)) {
    return new PersonalBackupStorageError(
      "unsupported",
      "Dieses Gerät unterstützt keine lokale Verzeichnissicherung.",
      { cause: error },
    );
  }
  return new PersonalBackupStorageError(
    "io",
    "Die lokale Sicherungsdatei konnte nicht gelesen oder geschrieben werden.",
    { cause: error },
  );
}

export type PersonalBackupDirectoryResult = {
  filename: string;
  bytes: number;
  backup: PersonalLearningBackup;
};

export async function savePersonalBackupToDirectory(
  directory: FileSystemDirectoryHandle,
  database = new PersonalLearningDatabase(),
  filename = "lernraum-personal-v1.json",
): Promise<PersonalBackupDirectoryResult> {
  const text = await serializePersonalLearningBackupFromDatabase(database);
  parsePersonalLearningBackupText(text);
  try {
    const file = await directory.getFileHandle(filename, { create: true });
    const writable = await file.createWritable();
    await writable.write(text);
    await writable.close();
    const verification = parsePersonalLearningBackupText(
      await (await file.getFile()).text(),
    );
    return { filename, bytes: text.length, backup: verification };
  } catch (error) {
    throw mapStorageError(error);
  }
}

export async function restorePersonalBackupFromDirectory(
  directory: FileSystemDirectoryHandle,
  database = new PersonalLearningDatabase(),
  filename = "lernraum-personal-v1.json",
) {
  try {
    const file = await directory.getFileHandle(filename);
    const text = await (await file.getFile()).text();
    let backup: ReturnType<typeof readPersonalLearningBackupText>;
    try {
      backup = readPersonalLearningBackupText(text);
    } catch (error) {
      throw corruptBackupError(error);
    }
    return await restorePersonalLearningBackupRead(backup, database);
  } catch (error) {
    throw mapStorageError(error);
  }
}

export async function readPersonalBackupFile(file: File) {
  try {
    return parsePersonalLearningBackupText(await file.text());
  } catch (error) {
    throw corruptBackupError(error);
  }
}

/**
 * Spielt eine Sicherungsdatei ein. Einzelne unlesbare Datensätze werden
 * übersprungen und im Ergebnis (`skipped`) gezählt.
 */
export async function restorePersonalBackupFromFile(
  file: File,
  database = new PersonalLearningDatabase(),
) {
  let backup: ReturnType<typeof readPersonalLearningBackupText>;
  try {
    backup = readPersonalLearningBackupText(await file.text());
  } catch (error) {
    throw corruptBackupError(error);
  }
  return restorePersonalLearningBackupRead(backup, database);
}

export async function buildPersonalBackup(
  database = new PersonalLearningDatabase(),
) {
  return exportPersonalLearningBackup(database);
}
