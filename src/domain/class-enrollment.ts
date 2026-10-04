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

const COMPACT_V3_PREFIX = "lernraum:c3:";
const MODULE_ORDER = classModuleSchema.options;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(
    atob(value.replaceAll("-", "+").replaceAll("_", "/") + padding),
    (character) => character.charCodeAt(0),
  );
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function uuidToBytes(value: string) {
  return hexToBytes(value.replaceAll("-", ""));
}

function bytesToUuid(bytes: Uint8Array) {
  const hex = bytesToHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Zeitpunkt als 48-Bit-Millisekunden; nur, wenn er exakt zurückführbar ist. */
function timestampToBytes(iso: string) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== iso) {
    throw new Error("Zeitpunkt nicht kompakt darstellbar.");
  }
  const bytes = new Uint8Array(6);
  let rest = ms;
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = rest % 256;
    rest = Math.floor(rest / 256);
  }
  return bytes;
}

function bytesToTimestamp(bytes: Uint8Array) {
  let ms = 0;
  for (const byte of bytes) ms = ms * 256 + byte;
  return new Date(ms).toISOString();
}

/** Kompaktes Binärformat: Kennungen als Rohbytes statt als Text. */
function encodeEnrollmentV3(enrollment: ClassEnrollment) {
  const encoder = new TextEncoder();
  const parts: number[] = [];
  const push = (bytes: ArrayLike<number>) => {
    for (let index = 0; index < bytes.length; index += 1) {
      parts.push(bytes[index] as number);
    }
  };
  const pushText = (text: string) => {
    const bytes = encoder.encode(text);
    if (bytes.length > 0x3fff) throw new Error("Text zu lang.");
    // Länge als 1–2 Bytes (hohes Bit zeigt ein zweites Byte an).
    if (bytes.length < 0x80) parts.push(bytes.length);
    else parts.push(0x80 | (bytes.length >> 8), bytes.length & 0xff);
    push(bytes);
  };
  const hasGrant = Boolean(
    enrollment.sealPublicKey &&
    enrollment.writingReliefGrant &&
    enrollment.writingReliefSignature,
  );
  parts.push(
    (enrollment.enabledModules ? 1 : 0) |
      (enrollment.sealPublicKey ? 2 : 0) |
      (hasGrant ? 4 : 0),
  );
  push(uuidToBytes(enrollment.classId));
  push(uuidToBytes(enrollment.membershipId));
  push(hexToBytes(enrollment.enrollmentToken));
  push(timestampToBytes(enrollment.issuedAt));
  if (enrollment.enabledModules) {
    let mask = 0;
    for (const moduleName of enrollment.enabledModules) {
      mask |= 1 << MODULE_ORDER.indexOf(moduleName);
    }
    parts.push(mask);
  }
  pushText(enrollment.className);
  pushText(enrollment.teacherName);
  pushText(enrollment.schoolYear);
  pushText(enrollment.displayName);
  if (enrollment.sealPublicKey) {
    const key = base64UrlToBytes(enrollment.sealPublicKey);
    if (
      bytesToBase64Url(key) !== enrollment.sealPublicKey ||
      key.length > 255
    ) {
      throw new Error("Schlüssel nicht kompakt darstellbar.");
    }
    parts.push(key.length);
    push(key);
  }
  if (hasGrant) {
    const signature = base64UrlToBytes(
      enrollment.writingReliefSignature as string,
    );
    if (
      bytesToBase64Url(signature) !== enrollment.writingReliefSignature ||
      signature.length > 255
    ) {
      throw new Error("Signatur nicht kompakt darstellbar.");
    }
    push(
      timestampToBytes(
        (enrollment.writingReliefGrant as WritingReliefGrant).issuedAt,
      ),
    );
    parts.push(signature.length);
    push(signature);
  }
  return bytesToBase64Url(Uint8Array.from(parts));
}

function decodeEnrollmentV3(value: string) {
  const bytes = base64UrlToBytes(value);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let at = 0;
  const take = (length: number) => {
    if (at + length > bytes.length) throw new Error("Code unvollständig.");
    const slice = bytes.slice(at, at + length);
    at += length;
    return slice;
  };
  const takeText = () => {
    const first = take(1)[0] as number;
    const length =
      first & 0x80 ? ((first & 0x7f) << 8) | (take(1)[0] as number) : first;
    return decoder.decode(take(length));
  };
  const flags = take(1)[0] as number;
  const classId = bytesToUuid(take(16));
  const membershipId = bytesToUuid(take(16));
  const enrollmentToken = bytesToHex(take(16));
  const issuedAt = bytesToTimestamp(take(6));
  let enabledModules: Array<(typeof MODULE_ORDER)[number]> | undefined;
  if (flags & 1) {
    const mask = take(1)[0] as number;
    enabledModules = MODULE_ORDER.filter((_, index) => mask & (1 << index));
  }
  const className = takeText();
  const teacherName = takeText();
  const schoolYear = takeText();
  const displayName = takeText();
  let sealPublicKey: string | undefined;
  if (flags & 2) sealPublicKey = bytesToBase64Url(take(take(1)[0] as number));
  let writingReliefGrant: WritingReliefGrant | undefined;
  let writingReliefSignature: string | undefined;
  if (flags & 4) {
    const grantIssuedAt = bytesToTimestamp(take(6));
    writingReliefSignature = bytesToBase64Url(take(take(1)[0] as number));
    writingReliefGrant = {
      v: 1,
      classId,
      membershipId,
      writingRelief: true,
      issuedAt: grantIssuedAt,
    };
  }
  if (at !== bytes.length) throw new Error("Code enthält Restdaten.");
  return classEnrollmentSchema.parse({
    version: 1,
    classId,
    membershipId,
    className,
    teacherName,
    schoolYear,
    displayName,
    enrollmentToken,
    issuedAt,
    ...(enabledModules ? { enabledModules } : {}),
    ...(sealPublicKey ? { sealPublicKey } : {}),
    ...(writingReliefGrant && writingReliefSignature
      ? { writingReliefGrant, writingReliefSignature }
      : {}),
  });
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

function buildEnrollment(course: TeacherClass, member: ClassMember) {
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
  return enrollment;
}

/** Älteres, größeres Textformat (c2); bleibt les- und erzeugbar. */
export function createEnrollmentCodeV2(
  course: TeacherClass,
  member: ClassMember,
) {
  const enrollment = buildEnrollment(course, member);
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
export function createEnrollmentCode(
  course: TeacherClass,
  member: ClassMember,
) {
  const enrollment = buildEnrollment(course, member);
  try {
    return `${COMPACT_V3_PREFIX}${encodeEnrollmentV3(enrollment)}`;
  } catch {
    // Nicht kanonische Werte (z. B. ältere Zeitstempel): Textformat nutzen.
    return createEnrollmentCodeV2(course, member);
  }
}

export function parseEnrollmentCode(value: string) {
  const normalized = value.trim();
  if (normalized.startsWith(COMPACT_V3_PREFIX)) {
    return decodeEnrollmentV3(normalized.slice(COMPACT_V3_PREFIX.length));
  }
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
  // Base64url und „:“ bleiben unkodiert: Das hält den QR-Code klein.
  url.hash = `${CLASS_ENROLLMENT_FRAGMENT_KEY}=${code
    .trim()
    .replace(/[^A-Za-z0-9_:.-]/g, encodeURIComponent)}`;
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
