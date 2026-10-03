import Dexie, { type Table } from "dexie";
import * as z from "zod";
import { classModuleSchema, type ClassModule } from "../domain/class-workspace";
import { LOCAL_DATA_AREAS } from "./local-data-boundaries";
import {
  filterByClass,
  sortForLibrary,
} from "../domain/teacher-content-summary";
import {
  classMemberSchema,
  teacherClassSchema,
  type ClassMember,
  type TeacherClass,
} from "../domain/class-enrollment";
import {
  createClassSealKeyPair,
  signWritingReliefGrant,
  type ClassSeal,
} from "../domain/class-seal";
import {
  teacherContentPackageSchema,
  type TeacherContentPackage,
} from "../domain/teacher-content-library";
import {
  teacherAssignmentSchema,
  teacherProfileSchema,
  teacherSubmissionSchema,
  teacherWorkspaceBackupSchema,
  parseStudentPerformanceCode,
  verifyStudentPerformance,
  type TeacherAssignment,
  type TeacherProfile,
  type TeacherSubmission,
} from "../domain/teacher-workspace";

export const teacherClassSettingsSchema = z
  .object({
    id: z.string().trim().min(1),
    enabledModules: z.array(classModuleSchema).min(1),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .superRefine((settings, context) => {
    if (
      new Set(settings.enabledModules).size !== settings.enabledModules.length
    ) {
      context.addIssue({
        code: "custom",
        message: "Ein Modul darf nur einmal aktiviert sein.",
        path: ["enabledModules"],
      });
    }
  });

export type TeacherClassSettings = z.infer<typeof teacherClassSettingsSchema>;

export class TeacherClassDatabase extends Dexie {
  classSettings!: Table<TeacherClassSettings, string>;
  classes!: Table<TeacherClass, string>;
  members!: Table<ClassMember, string>;
  contentPackages!: Table<TeacherContentPackage, string>;
  profiles!: Table<TeacherProfile, string>;
  assignments!: Table<TeacherAssignment, string>;
  submissions!: Table<TeacherSubmission, string>;

  constructor(name: string = LOCAL_DATA_AREAS.teacher) {
    super(name);
    this.version(1).stores({ classSettings: "id, updatedAt" });
    this.version(2).stores({
      classSettings: "id, updatedAt",
      classes: "id, updatedAt",
      members: "id, classId, createdAt",
    });
    this.version(3).stores({
      classSettings: "id, updatedAt",
      classes: "id, updatedAt",
      members: "id, classId, createdAt",
      contentPackages: "id, updatedAt",
    });
    this.version(4).stores({
      classSettings: "id, updatedAt",
      classes: "id, updatedAt",
      members: "id, classId, createdAt",
      contentPackages: "id, updatedAt",
      profiles: "id, updatedAt",
      assignments: "id, status, dueDate, updatedAt, *classIds",
    });
    this.version(5)
      .stores({
        classSettings: "id, updatedAt",
        classes: "id, updatedAt",
        members: "id, classId, createdAt",
        contentPackages: "id, updatedAt",
        profiles: "id, updatedAt",
        assignments: "id, status, dueDate, updatedAt, *classIds, *memberIds",
        submissions: "id, assignmentId, classId, membershipId, receivedAt",
      })
      .upgrade((transaction) =>
        transaction
          .table<TeacherAssignment, string>("assignments")
          .toCollection()
          .modify((assignment) => {
            assignment.memberIds ??= [];
          }),
      );
  }
}

export function createTeacherSubmissionRepository(
  database = new TeacherClassDatabase(),
) {
  return {
    listByAssignment: (assignmentId: string) =>
      database.submissions
        .where("assignmentId")
        .equals(assignmentId)
        .sortBy("receivedAt"),
    recordCode: async (code: string) => {
      const value = parseStudentPerformanceCode(code);
      const [member, assignment] = await Promise.all([
        database.members.get(value.membershipId),
        database.assignments.get(value.assignmentId),
      ]);
      if (!member || member.classId !== value.classId) {
        throw new Error(
          "Der Leistungsbrief gehört zu keinem bekannten Schüler.",
        );
      }
      if (!assignment || !assignment.classIds.includes(value.classId)) {
        throw new Error("Die Aufgabe ist dieser Klasse nicht zugeteilt.");
      }
      if (
        (assignment.memberIds ?? []).length > 0 &&
        !assignment.memberIds.includes(value.membershipId)
      ) {
        throw new Error("Die Aufgabe ist diesem Schüler nicht zugeteilt.");
      }
      if (!(await verifyStudentPerformance(value, member.enrollmentToken))) {
        throw new Error("Die Signatur des Leistungsbriefs ist ungültig.");
      }
      const id = `${value.assignmentId}:${value.membershipId}`;
      const existing = await database.submissions.get(id);
      if (existing?.sequence === value.sequence) {
        return { status: "duplicate" as const, submission: existing };
      }
      if (existing && existing.sequence > value.sequence) {
        return { status: "stale" as const, submission: existing };
      }
      const submission = teacherSubmissionSchema.parse({
        ...value,
        id,
        receivedAt: new Date().toISOString(),
      });
      await database.submissions.put(submission);
      return { status: "accepted" as const, submission };
    },
  };
}

export function createTeacherProfileRepository(
  database = new TeacherClassDatabase(),
) {
  return {
    get: () => database.profiles.get("local-teacher"),
    put: async (value: TeacherProfile) => {
      await database.profiles.put(teacherProfileSchema.parse(value));
    },
  };
}

export function createTeacherAssignmentRepository(
  database = new TeacherClassDatabase(),
) {
  return {
    list: () => database.assignments.orderBy("updatedAt").reverse().toArray(),
    put: async (value: TeacherAssignment) => {
      await database.assignments.put(teacherAssignmentSchema.parse(value));
    },
    remove: async (id: string) =>
      database.transaction(
        "rw",
        database.assignments,
        database.submissions,
        async () => {
          await database.assignments.delete(id);
          await database.submissions.where("assignmentId").equals(id).delete();
        },
      ),
  };
}

export function createTeacherWorkspaceRepository(
  database = new TeacherClassDatabase(),
) {
  return {
    exportData: async () =>
      teacherWorkspaceBackupSchema.parse({
        version: 1,
        exportedAt: new Date().toISOString(),
        profile: (await database.profiles.get("local-teacher")) ?? null,
        classes: await database.classes.toArray(),
        members: await database.members.toArray(),
        materials: await database.contentPackages.toArray(),
        assignments: await database.assignments.toArray(),
        submissions: await database.submissions.toArray(),
      }),
    importData: async (value: unknown) => {
      const backup = teacherWorkspaceBackupSchema.parse(value);
      await database.transaction(
        "rw",
        [
          database.profiles,
          database.classes,
          database.members,
          database.contentPackages,
          database.assignments,
          database.submissions,
        ],
        async () => {
          if (backup.profile) await database.profiles.put(backup.profile);
          await database.classes.bulkPut(backup.classes);
          await database.members.bulkPut(backup.members);
          await database.contentPackages.bulkPut(backup.materials);
          await database.assignments.bulkPut(backup.assignments);
          await database.submissions.bulkPut(backup.submissions);
        },
      );
      return backup;
    },
  };
}

export function createTeacherContentLibraryRepository(
  database = new TeacherClassDatabase(),
) {
  return {
    get: (id: string) => database.contentPackages.get(id),
    list: () =>
      database.contentPackages.orderBy("updatedAt").reverse().toArray(),
    put: async (value: TeacherContentPackage) => {
      await database.contentPackages.put(
        teacherContentPackageSchema.parse(value),
      );
    },
    putMany: async (values: readonly TeacherContentPackage[]) => {
      const parsed = values.map((value) =>
        teacherContentPackageSchema.parse(value),
      );
      await database.contentPackages.bulkPut(parsed);
    },
    remove: async (id: string) => {
      await database.contentPackages.delete(id);
    },
    /**
     * Inhalte einer Klasse bzw. (`"ohne"`) die ohne aktive Klasse, neueste
     * zuerst. Archivierte Klassen zählen nicht; ihre Inhalte stehen unter
     * „Nicht zugeordnet“.
     */
    listForClass: async (selection: string) => {
      const [entries, classes] = await Promise.all([
        database.contentPackages.toArray(),
        database.classes.toArray(),
      ]);
      const active = new Set(
        classes.filter(({ archivedAt }) => !archivedAt).map(({ id }) => id),
      );
      return sortForLibrary(filterByClass(entries, selection, active));
    },
    /** Merkt den letzten Raumstart; Titel, Quelle und Revision bleiben. */
    markUsed: async (id: string, at: string) => {
      const lastUsedAt = teacherContentPackageSchema.shape.lastUsedAt
        .unwrap()
        .parse(at);
      return (await database.contentPackages.update(id, { lastUsedAt })) > 0;
    },
    /**
     * Ordnet den Inhalt Klassen zu (leer = „Nicht zugeordnet“). Ändert nur
     * `updatedAt`, nicht die Revision: Der Inhalt selbst bleibt gleich.
     */
    assignClasses: async (
      id: string,
      classIds: readonly string[],
      at = new Date().toISOString(),
    ) => {
      const parsed = teacherContentPackageSchema.shape.classIds
        .unwrap()
        .parse([...new Set(classIds)]);
      return (
        (await database.contentPackages.update(id, {
          classIds: parsed,
          updatedAt: at,
        })) > 0
      );
    },
  };
}

/**
 * Gibt der Klasse ihren Stempel, falls sie noch keinen hat. Nicht im
 * Dexie-Upgrade, weil WebCrypto asynchron ist und die Upgrade-Transaktion
 * dabei schließen würde; stattdessen beim Anlegen und beim ersten Bedarf.
 * Eine neue Dexie-Version ist nicht nötig, `seal` ist kein Index.
 */
async function ensureClassSeal(
  database: TeacherClassDatabase,
  id: string,
): Promise<ClassSeal | undefined> {
  const course = await database.classes.get(id);
  if (!course) return undefined;
  if (course.seal) return course.seal;
  const seal = await createClassSealKeyPair();
  // Erst nach dem Schlüsselerzeugen erneut lesen: parallele Aufrufer dürfen
  // sich nicht gegenseitig den Schlüssel überschreiben.
  return database.transaction("rw", database.classes, async () => {
    const latest = await database.classes.get(id);
    if (!latest) return undefined;
    if (latest.seal) return latest.seal;
    await database.classes.put(teacherClassSchema.parse({ ...latest, seal }));
    return seal;
  });
}

export function createTeacherClassRepository(
  database = new TeacherClassDatabase(),
) {
  return {
    list: async () =>
      (await database.classes.toArray())
        .filter(({ archivedAt }) => !archivedAt)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    listArchived: async () =>
      (await database.classes.toArray())
        .filter(({ archivedAt }) => Boolean(archivedAt))
        .sort((left, right) =>
          (right.archivedAt ?? "").localeCompare(left.archivedAt ?? ""),
        ),
    put: (value: TeacherClass) =>
      database.classes.put(teacherClassSchema.parse(value)),
    listMembers: (classId: string) =>
      database.members.where("classId").equals(classId).sortBy("createdAt"),
    putMember: (value: ClassMember) =>
      database.members.put(classMemberSchema.parse(value)),
    archiveClass: async (id: string) => {
      await database.classes.update(id, {
        archivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    },
    restoreClass: async (id: string) => {
      await database.classes.update(id, {
        archivedAt: null,
        updatedAt: new Date().toISOString(),
      });
    },
    ensureSeal: (id: string) => ensureClassSeal(database, id),
    /**
     * Setzt oder entzieht die Schreiberleichterung. Beim Setzen wird die
     * Freigabe einmal signiert und am Kind gespeichert, damit der QR weiter
     * synchron entsteht.
     */
    setWritingRelief: async (memberId: string, enabled: boolean) => {
      const member = await database.members.get(memberId);
      if (!member) throw new Error("Das Kind ist nicht in der Klasse.");
      const rest = Object.fromEntries(
        Object.entries(member).filter(
          ([key]) =>
            key !== "writingRelief" &&
            key !== "writingReliefIssuedAt" &&
            key !== "writingReliefSignature",
        ),
      );
      if (!enabled) {
        await database.members.put(classMemberSchema.parse(rest));
        return classMemberSchema.parse(rest);
      }
      const seal = await ensureClassSeal(database, member.classId);
      if (!seal) throw new Error("Die Klasse existiert nicht mehr.");
      const issuedAt = new Date().toISOString();
      const signature = await signWritingReliefGrant(seal.privateJwk, {
        v: 1,
        classId: member.classId,
        membershipId: member.id,
        writingRelief: true,
        issuedAt,
      });
      const updated = classMemberSchema.parse({
        ...rest,
        writingRelief: true,
        writingReliefIssuedAt: issuedAt,
        writingReliefSignature: signature,
      });
      await database.members.put(updated);
      return updated;
    },
    removeMember: (id: string) =>
      database.transaction(
        "rw",
        database.members,
        database.assignments,
        database.submissions,
        async () => {
          await database.members.delete(id);
          await database.submissions.where("membershipId").equals(id).delete();
          const affected = await database.assignments
            .where("memberIds")
            .equals(id)
            .toArray();
          for (const assignment of affected) {
            const memberIds = assignment.memberIds.filter(
              (memberId) => memberId !== id,
            );
            if (memberIds.length === 0) {
              await database.assignments.delete(assignment.id);
            } else {
              await database.assignments.put({
                ...assignment,
                memberIds,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        },
      ),
    removeClass: async (id: string) => {
      await database.transaction(
        "rw",
        database.classes,
        database.members,
        database.assignments,
        database.submissions,
        async () => {
          await database.classes.delete(id);
          await database.members.where("classId").equals(id).delete();
          await database.submissions.where("classId").equals(id).delete();
          const affected = await database.assignments
            .where("classIds")
            .equals(id)
            .toArray();
          for (const assignment of affected) {
            const classIds = assignment.classIds.filter(
              (classId) => classId !== id,
            );
            if (classIds.length === 0) {
              await database.assignments.delete(assignment.id);
            } else {
              await database.assignments.put({
                ...assignment,
                classIds,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        },
      );
    },
  };
}

export function createTeacherClassSettingsRepository(
  database = new TeacherClassDatabase(),
) {
  return {
    get: (id: string) => database.classSettings.get(id),
    put: async (value: TeacherClassSettings) => {
      await database.classSettings.put(teacherClassSettingsSchema.parse(value));
    },
  };
}

export function toggleClassModule(
  enabledModules: readonly ClassModule[],
  module: ClassModule,
): ClassModule[] {
  if (enabledModules.includes(module)) {
    if (enabledModules.length === 1) return [...enabledModules];
    return enabledModules.filter((enabled) => enabled !== module);
  }
  return [...enabledModules, module];
}
