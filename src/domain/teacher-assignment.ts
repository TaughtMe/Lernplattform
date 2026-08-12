import * as z from "zod";
import { classModuleSchema } from "./class-workspace";

export const assignmentPlacementSchema = z.enum(["today", "assignments"]);
export const teacherAssignmentStatusSchema = z.enum(["draft", "ready"]);

export const teacherAssignmentDraftSchema = z
  .object({
    id: z.string().trim().min(1),
    classId: z.string().trim().min(1),
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(3).max(500),
    module: classModuleSchema,
    placement: assignmentPlacementSchema,
    status: teacherAssignmentStatusSchema,
    rankingEligible: z.boolean(),
    dueLabel: z.string().trim().min(1).max(100).optional(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export type AssignmentPlacement = z.infer<typeof assignmentPlacementSchema>;
export type TeacherAssignmentStatus = z.infer<
  typeof teacherAssignmentStatusSchema
>;
export type TeacherAssignmentDraft = z.infer<
  typeof teacherAssignmentDraftSchema
>;

export function createTeacherAssignmentDraft(input: {
  classId: string;
  title: string;
  description: string;
  module: TeacherAssignmentDraft["module"];
  placement: AssignmentPlacement;
  dueLabel?: string;
  now: string;
  id: string;
}): TeacherAssignmentDraft {
  const normalizedDueLabel = input.dueLabel?.trim();

  return teacherAssignmentDraftSchema.parse({
    id: input.id,
    classId: input.classId,
    title: input.title,
    description: input.description,
    module: input.module,
    placement: input.placement,
    ...(normalizedDueLabel ? { dueLabel: normalizedDueLabel } : {}),
    status: "draft",
    rankingEligible: true,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function markAssignmentReady(
  assignment: TeacherAssignmentDraft,
  now: string,
): TeacherAssignmentDraft {
  return teacherAssignmentDraftSchema.parse({
    ...assignment,
    status: "ready",
    updatedAt: now,
  });
}
