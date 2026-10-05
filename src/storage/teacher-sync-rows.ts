/**
 * Zeilen der Lehrer-Datenbank ↔ Datensätze des Abgleichs. Geheimnisse
 * (Klassenstempel, Einschreibe-Schlüssel) stehen nie im Inhalt, sondern in
 * `secrets`, und nur, wenn der Bereich „Schlüssel“ eingeschaltet ist.
 */
import type { ZodType } from "zod";
import {
  classMemberSchema,
  teacherClassSchema,
} from "../domain/class-enrollment";
import { teacherContentPackageSchema } from "../domain/teacher-content-library";
import {
  teacherAssignmentSchema,
  teacherClassSettingsSchema,
  teacherProfileSchema,
  teacherSubmissionSchema,
  type TeacherWorkspaceBackup,
} from "../domain/teacher-workspace";
import { contentHash } from "../integrations/cloud-sync/hash";
import { formatHlc } from "../integrations/cloud-sync/hlc";
import {
  NO_ENROLLMENT_KEY,
  tablesInScope,
  type LocalSyncRecord,
  type SyncData,
  type SyncRecord,
  type SyncScope,
  type SyncSecrets,
  type SyncTable,
} from "../integrations/cloud-sync/model";
import type { LocalRow } from "../integrations/cloud-sync/stamping";

export const SYNC_SCHEMAS: Record<SyncTable, ZodType> = {
  profiles: teacherProfileSchema,
  classes: teacherClassSchema,
  members: classMemberSchema,
  classSettings: teacherClassSettingsSchema,
  contentPackages: teacherContentPackageSchema,
  assignments: teacherAssignmentSchema,
  submissions: teacherSubmissionSchema,
};

export const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Zeile der Datenbank → Abgleich-Zeile ohne Geheimnisse im Inhalt. */
export function toLocalRow(
  table: SyncTable,
  row: { id: string } & Record<string, unknown>,
  scope: Pick<SyncScope, "keys">,
): LocalRow {
  const copy = plain(row) as SyncData & { id: string };
  if (table === "classes") {
    const { seal, ...rest } = copy as SyncData & { seal?: SyncSecrets["seal"] };
    return {
      table,
      id: row.id,
      data: rest,
      ...(scope.keys && seal ? { secrets: { seal } } : {}),
    };
  }
  if (table === "members") {
    const token = copy["enrollmentToken"];
    const secrets: SyncSecrets | undefined =
      scope.keys && typeof token === "string" && token !== NO_ENROLLMENT_KEY
        ? { enrollmentToken: token }
        : undefined;
    return {
      table,
      id: row.id,
      data: { ...copy, enrollmentToken: NO_ENROLLMENT_KEY },
      ...(secrets ? { secrets } : {}),
    };
  }
  return { table, id: row.id, data: copy };
}

export function firstSeenMs(row: LocalRow) {
  for (const field of ["updatedAt", "receivedAt", "createdAt"]) {
    const value = row.data[field];
    const ms = typeof value === "string" ? Date.parse(value) : Number.NaN;
    if (Number.isFinite(ms)) return ms;
  }
  return undefined;
}

/** Abgleich-Datensatz → Zeile der Datenbank; Geheimnisse bleiben, wo sie sind. */
export function rowFromRecord(
  record: Pick<LocalSyncRecord, "table" | "data" | "secrets">,
  existing: Record<string, unknown> | undefined,
  scope: Pick<SyncScope, "keys">,
): Record<string, unknown> {
  const row: Record<string, unknown> = { ...record.data };
  if (record.table === "classes") {
    const seal =
      (scope.keys ? record.secrets?.seal : undefined) ?? existing?.["seal"];
    if (seal) row["seal"] = seal;
  }
  if (record.table === "members") {
    const token =
      (scope.keys ? record.secrets?.enrollmentToken : undefined) ??
      existing?.["enrollmentToken"] ??
      NO_ENROLLMENT_KEY;
    row["enrollmentToken"] = token;
  }
  return row;
}

/** Zeilen einer Datei-Sicherung als Abgleich-Datensätze eines fremden Geräts. */
export function recordsFromBackup(
  backup: TeacherWorkspaceBackup,
  scope: SyncScope,
  device: string,
): SyncRecord[] {
  const tables = tablesInScope(scope);
  const groups: Array<[SyncTable, ReadonlyArray<{ id: string }>]> = [
    ["profiles", backup.profile ? [backup.profile] : []],
    ["classes", backup.classes],
    ["members", backup.members],
    ["classSettings", backup.classSettings],
    ["contentPackages", backup.materials],
    ["assignments", backup.assignments],
    ["submissions", backup.submissions],
  ];
  const records: SyncRecord[] = [];
  for (const [table, rows] of groups) {
    if (!tables.has(table)) continue;
    for (const row of rows) {
      const local = toLocalRow(table, row as { id: string }, scope);
      const ms = firstSeenMs(local);
      records.push({
        table,
        id: row.id,
        hlc: formatHlc({ ms: ms ?? 0, counter: 0, device }),
        device,
        hash: contentHash(local.data),
        data: local.data,
        ...(local.secrets ? { secrets: local.secrets } : {}),
      });
    }
  }
  return records;
}
