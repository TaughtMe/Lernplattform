/**
 * Passwort-Verschlüsselung für Dateien in fremdem Speicher: PBKDF2-SHA-256 →
 * AES-GCM-256, frische Nonce je Schreibvorgang. Der abgeleitete Schlüssel ist
 * nicht exportierbar und lässt sich als `CryptoKey` in IndexedDB merken.
 */
import { base64ToBytes, bytesToBase64 } from "./base64";

export const DEFAULT_KDF_ITERATIONS = 600_000;
export const MAX_KDF_ITERATIONS = 2_000_000;

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export async function derivePassphraseKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function randomSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}

export async function encryptText(key: CryptoKey, text: string) {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    encoder.encode(text),
  );
  return {
    nonce: bytesToBase64(nonce),
    ciphertext: bytesToBase64(new Uint8Array(cipher)),
  };
}

/** Wirft, wenn Schlüssel oder Daten nicht passen. */
export async function decryptText(
  key: CryptoKey,
  nonce: string,
  ciphertext: string,
) {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(nonce) },
    key,
    base64ToBytes(ciphertext),
  );
  return decoder.decode(plain);
}
