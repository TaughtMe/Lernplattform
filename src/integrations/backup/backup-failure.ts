import {
  PersonalBackupRecoveryError,
  PersonalBackupVersionError,
} from "../../domain/personal-backup";
import { PersonalBackupStorageError } from "./personal-backup-storage";

const NEXT_STEP = "Bitte sag deiner Lehrkraft Bescheid.";

const UNREADABLE = "Die Daten auf diesem Gerät konnten nicht gelesen werden.";
const NOT_WRITABLE = "Die Datei darf nicht gespeichert werden.";

/** Fehlernamen (Browser, Dexie, Zod), die als Grund in Kindersprache erscheinen. */
const REASON_BY_NAME: Readonly<Record<string, string>> = {
  QuotaExceededError: "Der Speicher auf diesem Gerät ist voll.",
  NotAllowedError: NOT_WRITABLE,
  NoModificationAllowedError: NOT_WRITABLE,
  SecurityError: NOT_WRITABLE,
  ZodError: "Ein Teil deiner Daten konnte nicht gelesen werden.",
  DatabaseClosedError: UNREADABLE,
  OpenFailedError: UNREADABLE,
  NotReadableError: UNREADABLE,
};

const REASON_BY_CODE = {
  "quota-exceeded": "Der Speicher auf diesem Gerät ist voll.",
  io: "Die Datei konnte nicht geschrieben oder gelesen werden.",
  unsupported: "Dieses Gerät kann nicht in einen Ordner sichern.",
  corrupt: "Die Sicherungsdatei ist beschädigt oder passt nicht zum Lernraum.",
} as const;

/** Grund in Kindersprache oder `undefined`, wenn er nicht bekannt ist. */
export function backupFailureReason(error: unknown): string | undefined {
  if (error instanceof PersonalBackupRecoveryError) return error.message;
  if (error instanceof PersonalBackupVersionError) return error.message;
  if (error instanceof PersonalBackupStorageError) {
    return error.code === "newer-version"
      ? error.message
      : REASON_BY_CODE[error.code];
  }
  // `DOMException` erbt je nach Umgebung nicht von `Error`: nur der Name zählt.
  const name = (error as { name?: unknown } | null)?.name;
  return typeof name === "string" ? REASON_BY_NAME[name] : undefined;
}

/**
 * Meldung für eine fehlgeschlagene Sicherung: was passiert ist, der Grund (wenn
 * bekannt) und der nächste Schritt. Zeigt nie englische Zod-Meldungen an.
 */
export function backupFailureMessage(lead: string, error: unknown): string {
  // Die Meldung einer neueren App-Version nennt den nächsten Schritt selbst.
  if (
    error instanceof PersonalBackupVersionError ||
    (error instanceof PersonalBackupStorageError &&
      error.code === "newer-version")
  ) {
    return `${lead} ${(error as Error).message}`;
  }
  return [lead, backupFailureReason(error), NEXT_STEP]
    .filter(Boolean)
    .join(" ");
}
