import {
  restorePersonalLearningBackupText,
  serializePersonalLearningBackupFromDatabase,
  type PersonalBackupRestoreResult,
} from "../../storage/personal-backup";
import { PersonalLearningDatabase } from "../../storage/personal-learning-events";
import type { CloudSyncTarget } from "./types";

/**
 * Eine Datei je Rolle im Cloudordner. Die Lehrer-Datei v1 wird nur noch
 * einmalig als Ausgangsstand gelesen; geschrieben wird `lernraum-lehrkraft-v2.json`.
 */
export const SYNC_FILES = {
  student: "lernraum-schueler-v1.json",
  teacher: "lernraum-lehrkraft-v1.json",
} as const;

/** Lernstand dieses Geräts in die Cloud schreiben. */
export async function pushStudentData(
  target: CloudSyncTarget,
  database = new PersonalLearningDatabase(),
) {
  const text = await serializePersonalLearningBackupFromDatabase(database);
  await target.upload(SYNC_FILES.student, text);
  return { bytes: text.length };
}

/** Lernstand aus der Cloud holen und mit diesem Gerät zusammenführen. */
export async function pullStudentData(
  target: CloudSyncTarget,
  database = new PersonalLearningDatabase(),
): Promise<PersonalBackupRestoreResult | null> {
  const text = await target.download(SYNC_FILES.student);
  if (text === null) return null;
  return restorePersonalLearningBackupText(text, database);
}
