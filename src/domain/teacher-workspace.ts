import * as z from "zod";
import { classMemberSchema, teacherClassSchema } from "./class-enrollment";
import { teacherContentPackageSchema } from "./teacher-content-library";

export const teacherProfileSchema = z
  .object({
    id: z.literal("local-teacher"),
    displayName: z.string().trim().min(1).max(120),
    school: z.string().trim().max(160),
    email: z.union([z.literal(""), z.email()]),
    subjects: z.array(z.string().trim().min(1).max(80)).max(20),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const teacherAssignmentSubjectSchema = z.enum([
  "german",
  "vocabulary",
  "mathematics",
  "typing",
  "custom",
]);

export const teacherAssignmentSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().trim().min(1).max(160),
    instructions: z.string().trim().min(1).max(2000),
    subject: teacherAssignmentSubjectSchema,
    materialId: z.string().trim().min(1).nullable(),
    classIds: z.array(z.string().uuid()).min(1),
    dueDate: z.union([z.literal(""), z.iso.date()]),
    status: z.enum(["draft", "assigned"]),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict()
  .superRefine((assignment, context) => {
    if (new Set(assignment.classIds).size !== assignment.classIds.length) {
      context.addIssue({
        code: "custom",
        message: "Eine Klasse darf nur einmal zugeteilt werden.",
        path: ["classIds"],
      });
    }
  });

export const teacherAssignmentQrSchema = z
  .object({
    version: z.literal(1),
    assignmentId: z.string().uuid(),
    title: z.string().trim().min(1).max(160),
    instructions: z.string().trim().min(1).max(2000),
    subject: teacherAssignmentSubjectSchema,
    materialId: z.string().trim().min(1).nullable(),
    classIds: z.array(z.string().uuid()).min(1),
    dueDate: z.union([z.literal(""), z.iso.date()]),
    issuedAt: z.iso.datetime(),
  })
  .strict();

export const teacherWorkspaceBackupSchema = z
  .object({
    version: z.literal(1),
    exportedAt: z.iso.datetime(),
    profile: teacherProfileSchema.nullable(),
    classes: z.array(teacherClassSchema),
    members: z.array(classMemberSchema),
    materials: z.array(teacherContentPackageSchema),
    assignments: z.array(teacherAssignmentSchema),
  })
  .strict();

export type TeacherProfile = z.infer<typeof teacherProfileSchema>;
export type TeacherAssignment = z.infer<typeof teacherAssignmentSchema>;
export type TeacherAssignmentSubject = z.infer<
  typeof teacherAssignmentSubjectSchema
>;
export type TeacherAssignmentQr = z.infer<typeof teacherAssignmentQrSchema>;
export type TeacherWorkspaceBackup = z.infer<
  typeof teacherWorkspaceBackupSchema
>;

export const TEACHER_SUBJECT_LABELS: Record<TeacherAssignmentSubject, string> =
  {
    german: "Deutsch",
    vocabulary: "Vokabeln",
    mathematics: "Mathematik",
    typing: "Tastschreiben",
    custom: "Sonstiges",
  };

export function createTeacherAssignmentCode(assignment: TeacherAssignment) {
  const payload = teacherAssignmentQrSchema.parse({
    version: 1,
    assignmentId: assignment.id,
    title: assignment.title,
    instructions: assignment.instructions,
    subject: assignment.subject,
    materialId: assignment.materialId,
    classIds: assignment.classIds,
    dueDate: assignment.dueDate,
    issuedAt: assignment.updatedAt,
  });
  return `lernraum:assignment:${JSON.stringify(payload)}`;
}

export function parseTeacherAssignmentCode(value: string) {
  const prefix = "lernraum:assignment:";
  const normalized = value.trim();
  if (!normalized.startsWith(prefix)) {
    throw new Error("Kein gültiger Lernraum-Aufgabencode.");
  }
  return teacherAssignmentQrSchema.parse(
    JSON.parse(normalized.slice(prefix.length)),
  );
}
