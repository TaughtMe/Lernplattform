import {
  restorePersonalLearningBackupText,
  serializePersonalLearningBackupFromDatabase,
  type PersonalBackupRestoreResult,
} from "../../storage/personal-backup";
import { PersonalLearningDatabase } from "../../storage/personal-learning-events";
import type { CloudSyncTarget } from "./types";

/** Eine Datei je Rolle im Cloudordner. */
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

type TeacherWorkspace = {
  exportData(): Promise<unknown>;
  importData(value: unknown): Promise<unknown>;
};

/** Lehrerdaten (Klassen, Inhalte, Einstellungen) in die Cloud schreiben. */
export async function pushTeacherData(
  target: CloudSyncTarget,
  workspace: TeacherWorkspace,
) {
  const text = JSON.stringify(await workspace.exportData());
  await target.upload(SYNC_FILES.teacher, text);
  return { bytes: text.length };
}

/** Lehrerdaten holen und zusammenführen; `false`, wenn noch keine Datei da ist. */
export async function pullTeacherData(
  target: CloudSyncTarget,
  workspace: TeacherWorkspace,
) {
  const text = await target.download(SYNC_FILES.teacher);
  if (text === null) return false;
  await workspace.importData(JSON.parse(text));
  return true;
}
