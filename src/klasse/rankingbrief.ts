import { base64UrlEncode, base64UrlDecode, encodeText, decodeText } from "./base64url.ts";
import type { RankingTotals } from "./ranking.ts";

/**
 * Rankingbeitrag für das lokale Klassenranking (siehe "10 - Häuser, Punkte
 * und Motivation" und Entscheidungsprotokoll Punkt 4/7) — ein eigenes,
 * zum Leistungsbrief paralleles Format statt eines gemeinsamen, weil beide
 * Abläufe (Abgabeprotokoll vs. periodisches Ranking) fachlich unabhängig
 * sind. `totals` sind kumulativ seit jeher (siehe ranking.ts); derselbe Code
 * darf deshalb gefahrlos erneut gezeigt werden.
 */
export interface RankingPayloadV1 {
  v: 1;
  classId: string;
  studentId: string;
  standNr: number;
  totals: RankingTotals;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", base64UrlDecode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signRanking(payload: RankingPayloadV1, secret: string): Promise<string> {
  const json = JSON.stringify(payload);
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(json));
  return `${encodeText(json)}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export interface DecodedRanking {
  payload: RankingPayloadV1;
  rawJson: string;
  signature: string;
}

function isRankingTotals(value: unknown): value is RankingTotals {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.correctAnswers === "number" &&
    typeof t.cleanAnswers === "number" &&
    typeof t.comebackAnswers === "number" &&
    typeof t.graduatedLernwoerter === "number" &&
    typeof t.boxLevelSum === "number" &&
    typeof t.activeDays === "number"
  );
}

export function decodeRanking(encoded: string): DecodedRanking | null {
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
    typeof (parsed as Record<string, unknown>).standNr !== "number" ||
    !isRankingTotals((parsed as Record<string, unknown>).totals)
  ) {
    return null;
  }
  return { payload: parsed as RankingPayloadV1, rawJson, signature };
}

export async function verifyRankingSignature(decoded: DecodedRanking, secret: string): Promise<boolean> {
  let signatureBytes: Uint8Array<ArrayBuffer>;
  try {
    signatureBytes = base64UrlDecode(decoded.signature);
  } catch {
    return false;
  }
  const key = await importHmacKey(secret);
  return crypto.subtle.verify("HMAC", key, signatureBytes, new TextEncoder().encode(decoded.rawJson));
}
