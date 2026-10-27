/**
 * Prüfwert für die PIN der Lehrer-Sperre (Regel D3-4): PBKDF2-SHA-256 mit
 * frischem Salz, dieselbe Iterationszahl wie bei der Passwort-Verschlüsselung.
 * Gespeichert wird nie die PIN, nur Salz, Iterationszahl und Ableitung. Das ist
 * ein Sichtschutz: Sechs Ziffern lassen sich bei Zugriff auf den Prüfwert
 * durchprobieren, die Iterationen bremsen das nur.
 */
import * as z from "zod";
import { base64ToBytes, bytesToBase64 } from "./base64";
import {
  DEFAULT_KDF_ITERATIONS,
  MAX_KDF_ITERATIONS,
  randomSalt,
} from "./passphrase";

const encoder = new TextEncoder();
const HASH_BYTES = 32;

export const pinVerifierSchema = z.object({
  v: z.literal(1),
  salt: z.string().min(8).max(64),
  iterations: z.number().int().min(1).max(MAX_KDF_ITERATIONS),
  hash: z.string().min(8).max(128),
});
export type PinVerifier = z.infer<typeof pinVerifierSchema>;

async function derive(
  pin: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
) {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

/** Neuer Prüfwert; die Iterationszahl wird nur in Tests gesenkt. */
export async function createPinVerifier(
  pin: string,
  iterations = DEFAULT_KDF_ITERATIONS,
): Promise<PinVerifier> {
  const salt = randomSalt();
  const hash = await derive(pin, salt, iterations);
  return {
    v: 1,
    salt: bytesToBase64(salt),
    iterations,
    hash: bytesToBase64(hash),
  };
}

/** Stimmt die PIN? Vergleich in gleichbleibender Zeit; Fehler zählen als „nein“. */
export async function verifyPin(
  pin: string,
  verifier: PinVerifier,
): Promise<boolean> {
  try {
    const expected = base64ToBytes(verifier.hash);
    const actual = await derive(
      pin,
      base64ToBytes(verifier.salt),
      verifier.iterations,
    );
    if (expected.length !== actual.length) return false;
    let difference = 0;
    for (let index = 0; index < expected.length; index += 1) {
      difference |= expected[index]! ^ actual[index]!;
    }
    return difference === 0;
  } catch {
    return false;
  }
}
