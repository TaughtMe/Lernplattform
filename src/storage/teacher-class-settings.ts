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

  constructor(name: string = LOCAL_DATA_AREAS.teacher) {
    super(name);
    this.version(1).stores({ classSettings: "id, updatedAt" });
    this.version(2).stores({
      classSettings: "id, updatedAt",
      classes: "id, updatedAt",
      members: "id, classId, createdAt",
    });
  }
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
