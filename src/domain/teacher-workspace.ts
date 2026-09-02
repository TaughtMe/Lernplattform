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
    memberIds: z.array(z.string().uuid()).default([]),
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
    memberIds: z.array(z.string().uuid()).default([]),
    dueDate: z.union([z.literal(""), z.iso.date()]),
    issuedAt: z.iso.datetime(),
  })
  .strict();

export type TeacherProfile = z.infer<typeof teacherProfileSchema>;
export type TeacherAssignment = z.infer<typeof teacherAssignmentSchema>;
export type TeacherAssignmentSubject = z.infer<
  typeof teacherAssignmentSubjectSchema
>;
export type TeacherAssignmentQr = z.infer<typeof teacherAssignmentQrSchema>;
export const studentPerformancePayloadSchema = z
  .object({
    version: z.literal(1),
    assignmentId: z.string().uuid(),
    classId: z.string().uuid(),
    membershipId: z.string().uuid(),
    sequence: z.number().int().positive(),
    completedAt: z.iso.datetime(),
    result: z.literal("completed"),
  })
  .strict();

export const signedStudentPerformanceSchema = studentPerformancePayloadSchema
  .extend({ signature: z.string().regex(/^[0-9a-f]{64}$/) })
  .strict();

export const teacherSubmissionSchema = signedStudentPerformanceSchema
  .extend({
    id: z.string().trim().min(1),
    receivedAt: z.iso.datetime(),
  })
  .strict();

export type StudentPerformancePayload = z.infer<
  typeof studentPerformancePayloadSchema
>;
export type SignedStudentPerformance = z.infer<
  typeof signedStudentPerformanceSchema
>;
export type TeacherSubmission = z.infer<typeof teacherSubmissionSchema>;

export const teacherWorkspaceBackupSchema = z
  .object({
    version: z.literal(1),
    exportedAt: z.iso.datetime(),
    profile: teacherProfileSchema.nullable(),
    classes: z.array(teacherClassSchema),
    members: z.array(classMemberSchema),
    materials: z.array(teacherContentPackageSchema),
    assignments: z.array(teacherAssignmentSchema),
    submissions: z.array(teacherSubmissionSchema).default([]),
  })
  .strict();

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
    memberIds: assignment.memberIds,
    dueDate: assignment.dueDate,
    issuedAt: assignment.updatedAt,
  });
  return `lernraum:assignment:${JSON.stringify(payload)}`;
}

function hexToBytes(value: string) {
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (part) =>
    Number.parseInt(part, 16),
  );
}

function bytesToHex(value: ArrayBuffer) {
  return Array.from(new Uint8Array(value), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function serializePerformancePayload(payload: StudentPerformancePayload) {
  return JSON.stringify([
    payload.version,
    payload.assignmentId,
    payload.classId,
    payload.membershipId,
    payload.sequence,
    payload.completedAt,
    payload.result,
  ]);
}

async function performanceSignature(
  payload: StudentPerformancePayload,
  enrollmentToken: string,
) {
  const token = z
    .string()
    .regex(/^[0-9a-f]{32}$/)
    .parse(enrollmentToken);
  const key = await crypto.subtle.importKey(
    "raw",
    hexToBytes(token),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToHex(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(serializePerformancePayload(payload)),
    ),
  );
}

export async function createStudentPerformanceCode(
  value: StudentPerformancePayload,
  enrollmentToken: string,
) {
  const payload = studentPerformancePayloadSchema.parse(value);
  const signed = signedStudentPerformanceSchema.parse({
    ...payload,
    signature: await performanceSignature(payload, enrollmentToken),
  });
  return `lernraum:performance:${JSON.stringify(signed)}`;
}

export function parseStudentPerformanceCode(value: string) {
  const prefix = "lernraum:performance:";
  const normalized = value.trim();
  if (!normalized.startsWith(prefix)) {
    throw new Error("Kein gültiger Lernraum-Leistungsbrief.");
  }
  return signedStudentPerformanceSchema.parse(
    JSON.parse(normalized.slice(prefix.length)),
  );
}

export async function verifyStudentPerformance(
  value: SignedStudentPerformance,
  enrollmentToken: string,
) {
  const signed = signedStudentPerformanceSchema.parse(value);
  const { signature, ...payload } = signed;
  const token = z
    .string()
    .regex(/^[0-9a-f]{32}$/)
    .parse(enrollmentToken);
  const key = await crypto.subtle.importKey(
    "raw",
    hexToBytes(token),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    hexToBytes(signature),
    new TextEncoder().encode(serializePerformancePayload(payload)),
  );
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
