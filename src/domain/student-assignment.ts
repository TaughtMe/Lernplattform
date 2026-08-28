import * as z from "zod";
import type { ClassEnrollment } from "./class-enrollment";
import {
  parseTeacherAssignmentCode,
  teacherAssignmentSubjectSchema,
} from "./teacher-workspace";

export const studentAssignmentSchema = z
  .object({
    id: z.string().uuid(),
    membershipId: z.string().uuid(),
    classId: z.string().uuid(),
    title: z.string().trim().min(1).max(160),
    instructions: z.string().trim().min(1).max(2000),
    subject: teacherAssignmentSubjectSchema,
    materialId: z.string().trim().min(1).nullable(),
    dueDate: z.union([z.literal(""), z.iso.date()]),
    issuedAt: z.iso.datetime(),
    status: z.enum(["new", "completed"]),
    completedAt: z.iso.datetime().nullable(),
    sequence: z.number().int().nonnegative(),
  })
  .strict();

export type StudentAssignment = z.infer<typeof studentAssignmentSchema>;

export function acceptStudentAssignment(
  code: string,
  memberships: readonly ClassEnrollment[],
) {
  const value = parseTeacherAssignmentCode(code);
  const membership = memberships.find(
    ({ classId, membershipId }) =>
      value.classIds.includes(classId) &&
      (value.memberIds.length === 0 || value.memberIds.includes(membershipId)),
  );
  if (!membership) {
    throw new Error(
      "Diese Aufgabe ist keiner Klasse auf diesem Gerät zugeteilt.",
    );
  }
  return studentAssignmentSchema.parse({
    id: value.assignmentId,
    membershipId: membership.membershipId,
    classId: membership.classId,
    title: value.title,
    instructions: value.instructions,
    subject: value.subject,
    materialId: value.materialId,
    dueDate: value.dueDate,
    issuedAt: value.issuedAt,
    status: "new",
    completedAt: null,
    sequence: 0,
  });
}
