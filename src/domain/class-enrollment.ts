import * as z from "zod";
import {
  base64UrlSchema,
  classSealSchema,
  writingReliefGrantSchema,
  type WritingReliefGrant,
} from "./class-seal";
import { classModuleSchema } from "./class-workspace";

export const teacherClassSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    teacherName: z.string().trim().min(1).max(120),
    schoolYear: z.string().trim().min(1).max(40),
    enabledModules: z.array(classModuleSchema).min(1),
    archivedAt: z.iso.datetime().nullable().optional(),
    /** Klassenstempel; ältere Klassen erhalten ihn beim ersten Bedarf. */
    seal: classSealSchema.optional(),
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
    /** Schreiberleichterung; Zeitpunkt und Signatur der Freigabe liegen dabei. */
    writingRelief: z.boolean().optional(),
    writingReliefIssuedAt: z.iso.datetime().optional(),
    writingReliefSignature: base64UrlSchema.optional(),
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
    enabledModules: z.array(classModuleSchema).min(1).optional(),
    /** Öffentlicher Klassenschlüssel und signierte Freigabe (optional). */
    sealPublicKey: base64UrlSchema.optional(),
    writingReliefGrant: writingReliefGrantSchema.optional(),
    writingReliefSignature: base64UrlSchema.optional(),
  })
  .strict();
export type TeacherClass = z.infer<typeof teacherClassSchema>;
export type ClassMember = z.infer<typeof classMemberSchema>;
export type ClassEnrollment = z.infer<typeof classEnrollmentSchema>;

export const CLASS_ENROLLMENT_PATH = "/lernen/klasse";
const CLASS_ENROLLMENT_FRAGMENT_KEY = "beitreten";
const CLASS_REMOVAL_FRAGMENT_KEY = "entfernen";

function encodeCompactPayload(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function decodeCompactPayload(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(
    value.replaceAll("-", "+").replaceAll("_", "/") + padding,
  );
  return JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(binary, (character) => character.charCodeAt(0)),
    ),
  );
}

/**
 * Die Freigabe der Schreiberleichterung eines Kindes; ohne Haken oder ohne
 * gespeicherte Signatur gibt es keine.
 */
function memberGrant(member: ClassMember) {
  if (
    !member.writingRelief ||
    !member.writingReliefIssuedAt ||
    !member.writingReliefSignature
  ) {
    return undefined;
  }
  return {
    grant: {
      v: 1,
      classId: member.classId,
      membershipId: member.id,
      writingRelief: true,
      issuedAt: member.writingReliefIssuedAt,
    } satisfies WritingReliefGrant,
    signature: member.writingReliefSignature,
  };
}

export function createEnrollmentCode(
  course: TeacherClass,
  member: ClassMember,
) {
  const { grant, signature } = memberGrant(member) ?? {};
  const enrollment = classEnrollmentSchema.parse({
    version: 1,
    classId: course.id,
    membershipId: member.id,
    className: course.name,
    teacherName: course.teacherName,
    schoolYear: course.schoolYear,
    displayName: member.displayName,
    enrollmentToken: member.enrollmentToken,
    issuedAt: member.createdAt,
    enabledModules: course.enabledModules,
    ...(course.seal ? { sealPublicKey: course.seal.publicKey } : {}),
    ...(course.seal && grant
      ? { writingReliefGrant: grant, writingReliefSignature: signature }
      : {}),
  });
  const base = [
    enrollment.classId,
    enrollment.membershipId,
    enrollment.className,
    enrollment.teacherName,
    enrollment.schoolYear,
    enrollment.displayName,
    enrollment.enrollmentToken,
    enrollment.issuedAt,
    enrollment.enabledModules,
  ];
  // Das Tupel wächst nur, wenn die Klasse einen Stempel hat. Die Freigabe
  // trägt nur ihren Zeitpunkt, Klasse und Kind stehen schon im Tupel.
  return `lernraum:c2:${encodeCompactPayload(
    enrollment.sealPublicKey
      ? [
          ...base,
          {
            k: enrollment.sealPublicKey,
            g: enrollment.writingReliefGrant?.issuedAt ?? null,
            s: enrollment.writingReliefSignature ?? null,
          },
        ]
      : base,
  )}`;
}
export function parseEnrollmentCode(value: string) {
  const normalized = value.trim();
  const compactPrefix = "lernraum:c2:";
  if (normalized.startsWith(compactPrefix)) {
    const payload = z
      .union([
        z.tuple([
          z.string().uuid(),
          z.string().uuid(),
          z.string(),
          z.string(),
          z.string(),
          z.string(),
          z.string(),
          z.string(),
        ]),
        z.tuple([
          z.string().uuid(),
          z.string().uuid(),
          z.string(),
          z.string(),
          z.string(),
          z.string(),
          z.string(),
          z.string(),
          z.array(classModuleSchema).min(1),
        ]),
        z.tuple([
          z.string().uuid(),
          z.string().uuid(),
          z.string(),
          z.string(),
          z.string(),
          z.string(),
          z.string(),
          z.string(),
          z.array(classModuleSchema).min(1),
          z.object({
            k: base64UrlSchema,
            g: z.iso.datetime().nullable(),
            s: base64UrlSchema.nullable(),
          }),
        ]),
      ])
      .parse(decodeCompactPayload(normalized.slice(compactPrefix.length)));
    return classEnrollmentSchema.parse({
      version: 1,
      classId: payload[0],
      membershipId: payload[1],
      className: payload[2],
      teacherName: payload[3],
      schoolYear: payload[4],
      displayName: payload[5],
      enrollmentToken: payload[6],
      issuedAt: payload[7],
      ...(payload.length >= 9 ? { enabledModules: payload[8] } : {}),
      ...(payload.length === 10
        ? {
            sealPublicKey: payload[9].k,
            // Fehlt eine Hälfte der Freigabe, gilt sie als nicht vorhanden.
            ...(payload[9].g && payload[9].s
              ? {
                  writingReliefGrant: {
                    v: 1,
                    classId: payload[0],
                    membershipId: payload[1],
                    writingRelief: true,
                    issuedAt: payload[9].g,
                  },
                  writingReliefSignature: payload[9].s,
                }
              : {}),
          }
        : {}),
    });
  }
  const legacyPrefix = "lernraum:class:";
  if (!normalized.startsWith(legacyPrefix))
    throw new Error("Kein gültiger Lernraum-Klassencode.");
  return classEnrollmentSchema.parse(
    JSON.parse(normalized.slice(legacyPrefix.length)),
  );
}

export function createClassRemovalCode(classId: string) {
  return `lernraum:remove:${z.string().uuid().parse(classId)}`;
}

export function parseClassRemovalCode(value: string) {
  const prefix = "lernraum:remove:";
  const normalized = value.trim();
  if (!normalized.startsWith(prefix)) {
    throw new Error("Kein gültiger Lernraum-Entfernungscode.");
  }
  return z.string().uuid().parse(normalized.slice(prefix.length));
}

export function createEnrollmentLink(origin: string, code: string) {
  parseEnrollmentCode(code);
  const url = new URL(CLASS_ENROLLMENT_PATH, origin);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Der Klassencode benötigt eine Lernraum-Webadresse.");
  }
  url.search = "";
  url.hash = new URLSearchParams([
    [CLASS_ENROLLMENT_FRAGMENT_KEY, code.trim()],
  ]).toString();
  return url.toString();
}

export function parseEnrollmentLink(value: string) {
  const url = new URL(value);
  if (url.pathname.replace(/\/$/, "") !== CLASS_ENROLLMENT_PATH) {
    throw new Error("Kein gültiger Lernraum-Einschreibungslink.");
  }
  const code = new URLSearchParams(url.hash.slice(1)).get(
    CLASS_ENROLLMENT_FRAGMENT_KEY,
  );
  if (!code) throw new Error("Der Einschreibungslink enthält keinen Code.");
  return { code, enrollment: parseEnrollmentCode(code) };
}

export function createClassRemovalLink(origin: string, classId: string) {
  const url = new URL(CLASS_ENROLLMENT_PATH, origin);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Der Entfernungscode benötigt eine Lernraum-Webadresse.");
  }
  url.search = "";
  url.hash = new URLSearchParams([
    [CLASS_REMOVAL_FRAGMENT_KEY, createClassRemovalCode(classId)],
  ]).toString();
  return url.toString();
}

export function parseClassRemovalLink(value: string) {
  const url = new URL(value);
  if (url.pathname.replace(/\/$/, "") !== CLASS_ENROLLMENT_PATH) {
    throw new Error("Kein gültiger Lernraum-Entfernungslink.");
  }
  const code = new URLSearchParams(url.hash.slice(1)).get(
    CLASS_REMOVAL_FRAGMENT_KEY,
  );
  if (!code) throw new Error("Der Entfernungslink enthält keinen Code.");
  return { code, classId: parseClassRemovalCode(code) };
}
