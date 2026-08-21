import { base64UrlEncode, encodeText, decodeText } from "./base64url.ts";

export interface ClassV1 {
  id: string;
  name: string;
  createdAt: string;
}

/**
 * Ein Schüler ist immer über eine pseudonyme Mitgliedschafts-ID identifiziert,
 * niemals über eine Gerätekennung. `displayName` ist die ausdrücklich lokal
 * aktivierte Klarnamen-Zuordnung aus "13 - Datenschutz und Rollen" — optional,
 * standardmäßig leer. `secret` ist das gemeinsame HMAC-Geheimnis für den
 * Leistungsbrief (siehe leistungsbrief.ts): einmal bei der Einschreibung
 * erzeugt, auf Lehrer- und Schülergerät identisch gespeichert.
 */
export interface StudentV1 {
  id: string;
  classId: string;
  alias: string;
  displayName?: string;
  secret: string;
  createdAt: string;
  /** Optionale Hauszugehörigkeit — siehe haus.ts. Ohne Zuordnung, bis die Lehrkraft ein Haus vergibt. */
  houseId?: string;
}

export function randomId(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function generateSecret(): string {
  return randomId(24);
}

/**
 * Kurze zufällige IDs statt volle UUIDs — der Eindeutigkeitsraum einer
 * einzelnen Lehrkraft ist winzig, aber jedes Zeichen zählt für die Dichte
 * des Einschreibungs-QR (siehe leistungsbrief.ts/roster.ts-Nutzung dort).
 */
export function createClass(name: string, now: string = new Date().toISOString()): ClassV1 {
  return { id: randomId(9), name, createdAt: now };
}

export function createStudent(classId: string, alias: string, now: string = new Date().toISOString()): StudentV1 {
  return { id: randomId(9), classId, alias, secret: generateSecret(), createdAt: now };
}

/** Enthält bewusst kein Signaturfeld — Vertrauen entsteht dadurch, dass der Code direkt vom Lehrergerät stammt, nicht durch Kryptografie (siehe "Air-Gap ohne Rückkanal", das gilt nur für den Leistungsbrief-Rückweg). */
export interface EnrollmentPayloadV1 {
  v: 1;
  classId: string;
  className: string;
  studentId: string;
  alias: string;
  secret: string;
}

export function encodeEnrollment(payload: EnrollmentPayloadV1): string {
  return encodeText(JSON.stringify(payload));
}

export function decodeEnrollment(encoded: string): EnrollmentPayloadV1 | null {
  let json: string;
  try {
    json = decodeText(encoded);
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as Record<string, unknown>).v !== 1 ||
    typeof (parsed as Record<string, unknown>).classId !== "string" ||
    typeof (parsed as Record<string, unknown>).className !== "string" ||
    typeof (parsed as Record<string, unknown>).studentId !== "string" ||
    typeof (parsed as Record<string, unknown>).alias !== "string" ||
    typeof (parsed as Record<string, unknown>).secret !== "string"
  ) {
    return null;
  }
  return parsed as EnrollmentPayloadV1;
}
