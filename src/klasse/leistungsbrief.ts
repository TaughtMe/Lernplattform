import { base64UrlEncode, base64UrlDecode, encodeText, decodeText } from "./base64url.ts";

/**
 * Abgabe-Beleg für den Klassenbriefkasten (siehe "04 - Lehrer-Cockpit" und
 * Entscheidungsprotokoll Punkt 4/6) — bewusst nur die für die Abgaberunde
 * nötigen Felder, keine aggregierten Rankingwerte (das gehört zu Häusern/
 * Punkten, einem eigenen, noch nicht gebauten Ausbauschritt).
 */
export interface SubmissionPayloadV1 {
  v: 1;
  classId: string;
  studentId: string;
  turnusId: string;
  standNr: number;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", base64UrlDecode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/** Signiert mit dem gemeinsamen, bei der Einschreibung ausgetauschten Secret — läuft auf dem Schülergerät. */
export async function signSubmission(payload: SubmissionPayloadV1, secret: string): Promise<string> {
  const json = JSON.stringify(payload);
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(json));
  return `${encodeText(json)}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export interface DecodedSubmission {
  payload: SubmissionPayloadV1;
  rawJson: string;
  signature: string;
}

/** Reine Formatprüfung ohne Signaturprüfung — das Lehrergerät braucht `payload.studentId`, um erst das passende Secret nachzuschlagen (siehe submission.ts). */
export function decodeSubmission(encoded: string): DecodedSubmission | null {
  const dotIndex = encoded.indexOf(".");
  if (dotIndex === -1) return null;
  const payloadPart = encoded.slice(0, dotIndex);
  const signature = encoded.slice(dotIndex + 1);
  if (!signature) return null;

  let rawJson: string;
  try {
    rawJson = decodeText(payloadPart);
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return null;
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as Record<string, unknown>).v !== 1 ||
    typeof (parsed as Record<string, unknown>).classId !== "string" ||
    typeof (parsed as Record<string, unknown>).studentId !== "string" ||
    typeof (parsed as Record<string, unknown>).turnusId !== "string" ||
    typeof (parsed as Record<string, unknown>).standNr !== "number"
  ) {
    return null;
  }
  return { payload: parsed as SubmissionPayloadV1, rawJson, signature };
}

/** Läuft auf dem Lehrergerät, nachdem das passende Schüler-Secret aus dem Roster nachgeschlagen wurde. */
export async function verifySubmissionSignature(decoded: DecodedSubmission, secret: string): Promise<boolean> {
  let signatureBytes: Uint8Array<ArrayBuffer>;
  try {
    signatureBytes = base64UrlDecode(decoded.signature);
  } catch {
    return false;
  }
  const key = await importHmacKey(secret);
  return crypto.subtle.verify("HMAC", key, signatureBytes, new TextEncoder().encode(decoded.rawJson));
}
