import {
  parseLearningBundleV1,
  type LearningBundleV1,
} from "../../domain/learning-bundle";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const KDF_ITERATIONS = 210_000;

export type TransferCryptoMetadata = {
  version: 1;
  payloadAlgorithm: "AES-GCM";
  wrapAlgorithm: "AES-GCM";
  keyDerivation: "PBKDF2-SHA-256";
  iterations: number;
  salt: string;
  encoding: "base64";
};

export type EncryptedLearningBundle = {
  ciphertext: string;
  nonce: string;
  wrappedKeyQr: string;
  wrappedKeyManual: string;
  cryptoMetadata: TransferCryptoMetadata;
};

export type DownloadedEncryptedBundle = {
  ciphertext: string;
  nonce: string;
  wrappedKey: string;
  cryptoMetadata: unknown;
};

function bytesToBase64(value: Uint8Array): string {
  const chunks: string[] = [];
  for (let offset = 0; offset < value.length; offset += 0x8000) {
    chunks.push(
      String.fromCharCode(...value.subarray(offset, offset + 0x8000)),
    );
  }
  return btoa(chunks.join(""));
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const result = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    result[index] = binary.charCodeAt(index);
  }
  return result;
}

function normalizeManualCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function deriveWrappingKey(
  secret: string,
  purpose: "qr" | "manual",
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const normalized =
    purpose === "manual" ? normalizeManualCode(secret) : secret.trim();
  if (normalized.length < 16) throw new Error("Ungültiger Abrufnachweis.");

  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`${purpose}:${normalized}`),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function wrapContentKey(
  rawContentKey: ArrayBuffer,
  wrappingKey: CryptoKey,
): Promise<string> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    wrappingKey,
    rawContentKey,
  );
  return `${bytesToBase64(nonce)}.${bytesToBase64(new Uint8Array(wrapped))}`;
}

async function unwrapContentKey(
  wrappedValue: string,
  wrappingKey: CryptoKey,
): Promise<CryptoKey> {
  const [encodedNonce, encodedCiphertext, extra] = wrappedValue.split(".");
  if (!encodedNonce || !encodedCiphertext || extra) {
    throw new Error("Beschädigter Schlüsselumschlag.");
  }
  const rawKey = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(encodedNonce) },
    wrappingKey,
    base64ToBytes(encodedCiphertext),
  );
  return crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}

function parseMetadata(value: unknown): TransferCryptoMetadata {
  if (
    typeof value !== "object" ||
    value === null ||
    !("version" in value) ||
    value.version !== 1 ||
    !("payloadAlgorithm" in value) ||
    value.payloadAlgorithm !== "AES-GCM" ||
    !("wrapAlgorithm" in value) ||
    value.wrapAlgorithm !== "AES-GCM" ||
    !("keyDerivation" in value) ||
    value.keyDerivation !== "PBKDF2-SHA-256" ||
    !("iterations" in value) ||
    value.iterations !== KDF_ITERATIONS ||
    !("salt" in value) ||
    typeof value.salt !== "string" ||
    !("encoding" in value) ||
    value.encoding !== "base64"
  ) {
    throw new Error("Nicht unterstützte Transfer-Verschlüsselung.");
  }
  return value as TransferCryptoMetadata;
}

export async function encryptLearningBundle(
  bundle: LearningBundleV1,
  secrets: { retrievalToken: string; manualTransferCode: string },
): Promise<EncryptedLearningBundle> {
  const validated = parseLearningBundleV1(bundle);
  const contentKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const rawContentKey = await crypto.subtle.exportKey("raw", contentKey);
  const payloadNonce = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const [qrWrappingKey, manualWrappingKey] = await Promise.all([
    deriveWrappingKey(secrets.retrievalToken, "qr", salt, KDF_ITERATIONS),
    deriveWrappingKey(
      secrets.manualTransferCode,
      "manual",
      salt,
      KDF_ITERATIONS,
    ),
  ]);
  const [ciphertext, wrappedKeyQr, wrappedKeyManual] = await Promise.all([
    crypto.subtle.encrypt(
      { name: "AES-GCM", iv: payloadNonce },
      contentKey,
      encoder.encode(JSON.stringify(validated)),
    ),
    wrapContentKey(rawContentKey, qrWrappingKey),
    wrapContentKey(rawContentKey, manualWrappingKey),
  ]);

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    nonce: bytesToBase64(payloadNonce),
    wrappedKeyQr,
    wrappedKeyManual,
    cryptoMetadata: {
      version: 1,
      payloadAlgorithm: "AES-GCM",
      wrapAlgorithm: "AES-GCM",
      keyDerivation: "PBKDF2-SHA-256",
      iterations: KDF_ITERATIONS,
      salt: bytesToBase64(salt),
      encoding: "base64",
    },
  };
}

export async function decryptLearningBundle(
  encrypted: DownloadedEncryptedBundle,
  credential: { kind: "qr" | "manual"; secret: string },
): Promise<LearningBundleV1> {
  const metadata = parseMetadata(encrypted.cryptoMetadata);
  const wrappingKey = await deriveWrappingKey(
    credential.secret,
    credential.kind,
    base64ToBytes(metadata.salt),
    metadata.iterations,
  );
  const contentKey = await unwrapContentKey(encrypted.wrappedKey, wrappingKey);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(encrypted.nonce) },
    contentKey,
    base64ToBytes(encrypted.ciphertext),
  );
  return parseLearningBundleV1(JSON.parse(decoder.decode(plaintext)));
}
