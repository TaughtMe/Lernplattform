import * as z from "zod";
import { classModuleSchema } from "./class-workspace";

export const teacherClassSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    teacherName: z.string().trim().min(1).max(120),
    schoolYear: z.string().trim().min(1).max(40),
    enabledModules: z.array(classModuleSchema).min(1),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();
export const classMemberSchema = z
  .object({
    id: z.string().uuid(),
    classId: z.string().uuid(),
    displayName: z.string().trim().min(1).max(80),
    enrollmentToken: z.string().regex(/^[0-9a-f]{32}$/),
    createdAt: z.iso.datetime(),
  })
  .strict();
export const classEnrollmentSchema = z
  .object({
    version: z.literal(1),
    classId: z.string().uuid(),
    membershipId: z.string().uuid(),
    className: z.string().trim().min(1).max(120),
    teacherName: z.string().trim().min(1).max(120),
    schoolYear: z.string().trim().min(1).max(40),
    displayName: z.string().trim().min(1).max(80),
    enrollmentToken: z.string().regex(/^[0-9a-f]{32}$/),
    issuedAt: z.iso.datetime(),
  })
  .strict();
export type TeacherClass = z.infer<typeof teacherClassSchema>;
export type ClassMember = z.infer<typeof classMemberSchema>;
export type ClassEnrollment = z.infer<typeof classEnrollmentSchema>;

export function createEnrollmentCode(
  course: TeacherClass,
  member: ClassMember,
) {
  return `lernraum:class:${JSON.stringify(classEnrollmentSchema.parse({ version: 1, classId: course.id, membershipId: member.id, className: course.name, teacherName: course.teacherName, schoolYear: course.schoolYear, displayName: member.displayName, enrollmentToken: member.enrollmentToken, issuedAt: member.createdAt }))}`;
}
export function parseEnrollmentCode(value: string) {
  const prefix = "lernraum:class:";
  if (!value.trim().startsWith(prefix))
    throw new Error("Kein gültiger Lernraum-Klassencode.");
  return classEnrollmentSchema.parse(
    JSON.parse(value.trim().slice(prefix.length)),
  );
}
