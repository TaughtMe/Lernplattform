import Dexie, { type Table } from "dexie";
import * as z from "zod";
import { classModuleSchema, type ClassModule } from "../domain/class-workspace";
import { LOCAL_DATA_AREAS } from "./local-data-boundaries";
import {
  classMemberSchema,
  teacherClassSchema,
  type ClassMember,
  type TeacherClass,
} from "../domain/class-enrollment";
import {
  teacherContentPackageSchema,
  type TeacherContentPackage,
} from "../domain/teacher-content-library";
import {
  teacherAssignmentSchema,
  teacherProfileSchema,
  teacherWorkspaceBackupSchema,
  type TeacherAssignment,
  type TeacherProfile,
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
  }
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
    remove: async (id: string) => {
      await database.assignments.delete(id);
    },
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
      }),
    importData: async (value: unknown) => {
      const backup = teacherWorkspaceBackupSchema.parse(value);
      await database.transaction(
        "rw",
        database.profiles,
        database.classes,
        database.members,
        database.contentPackages,
        database.assignments,
        async () => {
          if (backup.profile) await database.profiles.put(backup.profile);
          await database.classes.bulkPut(backup.classes);
          await database.members.bulkPut(backup.members);
          await database.contentPackages.bulkPut(backup.materials);
          await database.assignments.bulkPut(backup.assignments);
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
  };
}

export function createTeacherClassRepository(
  database = new TeacherClassDatabase(),
) {
  return {
    list: async () =>
      (await database.classes.toArray()).sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt),
      ),
    put: (value: TeacherClass) =>
      database.classes.put(teacherClassSchema.parse(value)),
    listMembers: (classId: string) =>
      database.members.where("classId").equals(classId).sortBy("createdAt"),
    putMember: (value: ClassMember) =>
      database.members.put(classMemberSchema.parse(value)),
    removeMember: (id: string) => database.members.delete(id),
    removeClass: async (id: string) => {
      await database.transaction(
        "rw",
        database.classes,
        database.members,
        database.assignments,
        async () => {
          await database.classes.delete(id);
          await database.members.where("classId").equals(id).delete();
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
