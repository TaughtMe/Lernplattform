import {
  parsePersonalLearningBackupText,
  type PersonalLearningBackup,
} from "../../domain/personal-backup";
import {
  exportPersonalLearningBackup,
  restorePersonalLearningBackupText,
  serializePersonalLearningBackupFromDatabase,
} from "../../storage/personal-backup";
import { PersonalLearningDatabase } from "../../storage/personal-learning-events";

export type PersonalBackupStorageErrorCode =
  "unsupported" | "quota-exceeded" | "corrupt" | "io";

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
    let backupText: ReturnType<typeof parsePersonalLearningBackupText>;
    try {
      backupText = parsePersonalLearningBackupText(text);
    } catch (error) {
      throw new PersonalBackupStorageError(
        "corrupt",
        "Die Sicherungsdatei ist beschädigt oder hat ein unbekanntes Datenformat.",
        { cause: error },
      );
    }
    return await restorePersonalLearningBackupText(
      JSON.stringify(backupText),
      database,
    );
  } catch (error) {
    throw mapStorageError(error);
  }
}

export async function readPersonalBackupFile(file: File) {
  try {
    return parsePersonalLearningBackupText(await file.text());
  } catch (error) {
    throw new PersonalBackupStorageError(
      "corrupt",
      "Die Sicherungsdatei ist beschädigt oder hat ein unbekanntes Datenformat.",
      { cause: error },
    );
  }
}

export async function buildPersonalBackup(
  database = new PersonalLearningDatabase(),
) {
  return exportPersonalLearningBackup(database);
}
