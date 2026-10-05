import * as z from "zod";
import type { ClassEnrollment } from "./class-enrollment";

/**
 * Klassenstempel: Jede Klasse hat ein eigenes ECDSA-P-256-Schlüsselpaar. Der
 * Abdruck des öffentlichen Schlüssels steht im Raum, die Freigabe für ein Kind
 * liegt signiert im Einschreibe-QR. Es gibt keine Logins; Ziel ist allein, dass
 * eine selbst ausgestellte Freigabe im Raum der echten Lehrkraft nichts bewirkt.
 */

export const classSealPrivateJwkSchema = z
  .object({
    kty: z.literal("EC"),
    crv: z.literal("P-256"),
    x: z.string().min(1),
    y: z.string().min(1),
    d: z.string().min(1),
    // Manche Browser (z. B. Safari) ergänzen beim JWK-Export `alg`.
    alg: z.string().optional(),
    ext: z.boolean().optional(),
    key_ops: z.array(z.string()).optional(),
  })
  .strict();

export const base64UrlSchema = z.string().regex(/^[A-Za-z0-9_-]+$/);

/** Schlüsselpaar einer Klasse, wie es im Lehrer-Datenbereich liegt. */
export const classSealSchema = z
  .object({
    privateJwk: classSealPrivateJwkSchema,
    publicKey: base64UrlSchema,
  })
  .strict();
export type ClassSeal = z.infer<typeof classSealSchema>;

/** Abdruck (SHA-256 des öffentlichen Schlüssels, base64url, 43 Zeichen). */
export const classSealFingerprintSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/);

export const writingReliefGrantSchema = z
  .object({
    v: z.literal(1),
    classId: z.string().uuid(),
    membershipId: z.string().uuid(),
    writingRelief: z.literal(true),
    issuedAt: z.iso.datetime(),
  })
  .strict();
export type WritingReliefGrant = z.infer<typeof writingReliefGrantSchema>;

const ECDSA = { name: "ECDSA", namedCurve: "P-256" } as const;
const SIGN = { name: "ECDSA", hash: "SHA-256" } as const;

function toBase64Url(bytes: ArrayBuffer | Uint8Array) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(
    value.replaceAll("-", "+").replaceAll("_", "/") + padding,
  );
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/** Feste Feldreihenfolge, damit die Signatur stabil bleibt. */
export function canonicalWritingReliefGrant(grant: WritingReliefGrant) {
  return JSON.stringify([
    grant.v,
    grant.classId,
    grant.membershipId,
    grant.writingRelief,
    grant.issuedAt,
  ]);
}

export async function createClassSealKeyPair(): Promise<ClassSeal> {
  const pair = await crypto.subtle.generateKey(ECDSA, true, ["sign", "verify"]);
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const spki = await crypto.subtle.exportKey("spki", pair.publicKey);
  return classSealSchema.parse({
    privateJwk,
    publicKey: toBase64Url(spki),
  });
}

export async function classSealFingerprint(publicKeyB64u: string) {
  return toBase64Url(
    await crypto.subtle.digest("SHA-256", fromBase64Url(publicKeyB64u)),
  );
}

export async function signWritingReliefGrant(
  privateJwk: ClassSeal["privateJwk"],
  grant: WritingReliefGrant,
) {
  const key = await crypto.subtle.importKey(
    "jwk",
    privateJwk as JsonWebKey,
    ECDSA,
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    SIGN,
    key,
    new TextEncoder().encode(
      canonicalWritingReliefGrant(writingReliefGrantSchema.parse(grant)),
    ),
  );
  return toBase64Url(signature);
}

export async function verifyWritingReliefGrant(
  publicKeyB64u: string,
  grant: WritingReliefGrant,
  signatureB64u: string,
) {
  try {
    const key = await crypto.subtle.importKey(
      "spki",
      fromBase64Url(publicKeyB64u),
      ECDSA,
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      SIGN,
      key,
      fromBase64Url(signatureB64u),
      new TextEncoder().encode(canonicalWritingReliefGrant(grant)),
    );
  } catch {
    // Kaputte Schlüssel oder Signaturen sind schlicht keine gültige Freigabe.
    return false;
  }
}

/**
 * Schreiberleichterung gilt, wenn eine gespeicherte Mitgliedschaft eine
 * gültig signierte Freigabe trägt, die zu ihr passt, und der Schlüssel zum
 * Klassenstempel des Raums gehört. Ohne Stempel im Raum: nie.
 */
export async function isWritingReliefActive(
  memberships: readonly ClassEnrollment[],
  classSeal: string | undefined,
) {
  if (!classSeal) return false;
  for (const membership of memberships) {
    const { sealPublicKey, writingReliefGrant, writingReliefSignature } =
      membership;
    if (!sealPublicKey || !writingReliefGrant || !writingReliefSignature) {
      continue;
    }
    if (
      writingReliefGrant.classId !== membership.classId ||
      writingReliefGrant.membershipId !== membership.membershipId
    ) {
      continue;
    }
    const fingerprint = await classSealFingerprint(sealPublicKey).catch(
      () => "",
    );
    if (fingerprint !== classSeal) continue;
    if (
      await verifyWritingReliefGrant(
        sealPublicKey,
        writingReliefGrant,
        writingReliefSignature,
      )
    ) {
      return true;
    }
  }
  return false;
}
