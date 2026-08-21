const PBKDF2_ITERATIONS = 150_000;
const HASH_BYTES = 32;

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

async function derive(pin: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromHex(saltHex), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    HASH_BYTES * 8,
  );
  return toHex(bits);
}

export interface StoredPin {
  salt: string;
  hash: string;
}

/** Lehrer-PIN erstmalig festlegen oder ändern — nie den Klartext, nur Salt+Hash werden gespeichert. */
export async function hashPin(pin: string): Promise<StoredPin> {
  const salt = generateSalt();
  const hash = await derive(pin, salt);
  return { salt, hash };
}

export async function verifyPin(pin: string, stored: StoredPin): Promise<boolean> {
  const hash = await derive(pin, stored.salt);
  return hash === stored.hash;
}
