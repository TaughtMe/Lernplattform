import type { SyncTable } from "../integrations/cloud-sync/model";
import type { TeacherClassDatabase } from "./teacher-class-settings";

/**
 * Personendaten in der Lehrerdatenbank (Regel D3-3): Klassen mit Schülerliste,
 * Einstellungen der Klassen, Lehrerprofil, Aufgaben und Abgaben. Material
 * (`contentPackages`) gehört nie dazu. Auf einer Tafel soll nichts davon
 * liegen; wer neue Tabellen mit Personenbezug anlegt, trägt sie hier ein.
 */
export const TEACHER_PERSONAL_TABLES: readonly SyncTable[] = [
  "classes",
  "members",
  "classSettings",
  "profiles",
  "assignments",
  "submissions",
];

export type TeacherPersonalDataCount = {
  classes: number;
  students: number;
  assignments: number;
  submissions: number;
  /** Alles zusammen, auch Einstellungen und Profil. */
  total: number;
};

/** Was liegt an Personendaten auf diesem Gerät? Für das Angebot zum Löschen. */
export async function countTeacherPersonalData(
  database: TeacherClassDatabase,
): Promise<TeacherPersonalDataCount> {
  const counts = await Promise.all(
    TEACHER_PERSONAL_TABLES.map((name) => database.table(name).count()),
  );
  const byName = Object.fromEntries(
    TEACHER_PERSONAL_TABLES.map((name, index) => [name, counts[index] ?? 0]),
  ) as Record<SyncTable, number>;
  return {
    classes: byName.classes,
    students: byName.members,
    assignments: byName.assignments,
    submissions: byName.submissions,
    total: counts.reduce((sum, count) => sum + count, 0),
  };
}

/**
 * Löscht alle Personendaten dieses Geräts, das Material bleibt. Mit den Zeilen
 * gehen auch ihre Abgleich-Stempel, Grabsteine und Konflikte, damit der
 * Abgleich das Löschen nicht für eine Änderung hält und die Daten nicht auch in
 * der Cloud entfernt: Kommt das Gerät später als „Mein Gerät“ zurück, holt es
 * sie wieder von dort. Material und die Einstellungen des Abgleichs bleiben
 * unberührt (nur die Marke „etwas wartet“ wird gesetzt).
 */
export async function deleteTeacherPersonalData(
  database: TeacherClassDatabase,
): Promise<void> {
  const personal = new Set<string>(TEACHER_PERSONAL_TABLES);
  await database.transaction(
    "rw",
    [
      ...TEACHER_PERSONAL_TABLES.map((name) => database.table(name)),
      database.syncStamps,
      database.tombstones,
      database.syncConflicts,
      database.syncState,
    ],
    async () => {
      for (const name of TEACHER_PERSONAL_TABLES) {
        await database.table(name).clear();
      }
      await database.syncStamps
        .where("table")
        .anyOf([...personal])
        .delete();
      await database.tombstones
        .where("table")
        .anyOf([...personal])
        .delete();
      // Konflikte tragen Fassungen mit Namen; die Tabelle hat keinen Index dafür.
      const conflicts = await database.syncConflicts.toArray();
      await database.syncConflicts.bulkDelete(
        conflicts
          .filter((conflict) => personal.has(conflict.table))
          .map((conflict) => conflict.id),
      );
      // Der nächste Abgleich liest die Cloud-Datei neu, auch wenn sich deren
      // Version nicht geändert hat (sonst käme auf „Mein Gerät“ nichts zurück).
      const state = await database.syncState.get("main");
      if (state) await database.syncState.put({ ...state, dirty: true });
    },
  );
}
