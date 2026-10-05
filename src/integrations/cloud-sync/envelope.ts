/**
 * Dateiformat v2 der Lehrer-Sicherung: ein Umschlag mit lesbarem Kopf
 * (Stand, Schreiber, Verschlüsselung) und einer Nutzlast, die verschlüsselt
 * sein kann. Der Kopf bleibt immer lesbar, damit das Cloud-Symbol den Stand
 * ohne Passwort zeigen kann.
 */
import * as z from "zod";
import { classSealSchema } from "../../domain/class-seal";
import {
  teacherWorkspaceBackupSchema,
  type TeacherWorkspaceBackup,
} from "../../domain/teacher-workspace";
import {
  DEFAULT_KDF_ITERATIONS,
  MAX_KDF_ITERATIONS,
  decryptText,
  derivePassphraseKey,
  encryptText,
  randomSalt,
} from "../crypto/passphrase";
import { base64ToBytes, bytesToBase64 } from "../crypto/base64";
import { isHlc } from "./hlc";
import { SYNC_TABLES } from "./model";
import { CloudSyncError } from "./types";

export const SYNC_FORMAT = "lernraum-sync" as const;
export const SYNC_VERSION = 2 as const;
/** Dateiname der v2-Sicherung; die v1-Datei heißt `lernraum-lehrkraft-v1.json`. */
export const SYNC_FILE_V2 = "lernraum-lehrkraft-v2.json";

const KEY_CHECK_TEXT = "lernraum-sync";

const recordSchema = z.object({
  table: z.enum(SYNC_TABLES),
  id: z.string().min(1).max(300),
  hlc: z.string().refine(isHlc),
  device: z.string().min(1).max(80),
  hash: z.string().regex(/^[0-9a-f]{64}$/),
  data: z.record(z.string(), z.unknown()),
  secrets: z
    .object({
      seal: classSealSchema.optional(),
      enrollmentToken: z
        .string()
        .regex(/^[0-9a-f]{32}$/)
        .optional(),
    })
    .strict()
    .optional(),
});

const tombstoneSchema = z.object({
  table: z.enum(SYNC_TABLES),
  id: z.string().min(1).max(300),
  hlc: z.string().refine(isHlc),
  device: z.string().min(1).max(80),
});

const deviceSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(80),
  /** Zuletzt übernommener Stand dieses Geräts. */
  revision: z.number().int().nonnegative(),
  seenAt: z.iso.datetime({ offset: true }),
});

export const syncPayloadSchema = z.object({
  records: z.array(recordSchema),
  tombstones: z.array(tombstoneSchema),
  resolved: z.array(z.string()),
  devices: z.array(deviceSchema),
});
export type SyncPayload = z.infer<typeof syncPayloadSchema>;
export type SyncDeviceEntry = z.infer<typeof deviceSchema>;

const encryptionSchema = z.object({
  algorithm: z.literal("AES-GCM"),
  keyDerivation: z.literal("PBKDF2-SHA-256"),
  iterations: z.number().int().min(1).max(MAX_KDF_ITERATIONS),
  salt: z.string().min(1),
  /** Kleiner verschlüsselter Prüfwert: erkennt ein falsches Passwort sofort. */
  keyCheck: z.string().min(1),
});
export type SyncEncryption = z.infer<typeof encryptionSchema>;

const headerSchema = z.object({
  format: z.literal(SYNC_FORMAT),
  version: z.literal(SYNC_VERSION),
  revision: z.number().int().nonnegative(),
  writtenBy: z.object({
    device: z.string().min(1).max(80),
    name: z.string().trim().min(1).max(80),
    at: z.iso.datetime({ offset: true }),
  }),
  encryption: encryptionSchema.nullable(),
});
export type SyncEnvelopeHeader = z.infer<typeof headerSchema>;

const envelopeSchema = headerSchema.extend({
  payload: z.union([syncPayloadSchema, z.string()]),
  nonce: z.string().optional(),
});

export type SyncKey = { key: CryptoKey; encryption: SyncEncryption };

/** Neues Passwort: frisches Salz, Schlüssel und Prüfwert. */
export async function createSyncKey(
  password: string,
  iterations = DEFAULT_KDF_ITERATIONS,
): Promise<SyncKey> {
  const salt = randomSalt();
  const key = await derivePassphraseKey(password, salt, iterations);
  const check = await encryptText(key, KEY_CHECK_TEXT);
  return {
    key,
    encryption: {
      algorithm: "AES-GCM",
      keyDerivation: "PBKDF2-SHA-256",
      iterations,
      salt: bytesToBase64(salt),
      keyCheck: `${check.nonce}.${check.ciphertext}`,
    },
  };
}

function locked(message: string) {
  return new CloudSyncError("locked", message);
}

/** Passwort gegen den Prüfwert einer vorhandenen Datei prüfen. */
export async function unlockSyncKey(
  password: string,
  encryption: SyncEncryption,
): Promise<SyncKey> {
  const key = await derivePassphraseKey(
    password,
    base64ToBytes(encryption.salt),
    encryption.iterations,
  );
  await verifySyncKey(key, encryption);
  return { key, encryption };
}

/** Wirft `locked`, wenn der Schlüssel nicht zum Prüfwert passt. */
export async function verifySyncKey(
  key: CryptoKey,
  encryption: SyncEncryption,
) {
  const [nonce, ciphertext, extra] = encryption.keyCheck.split(".");
  try {
    if (
      !nonce ||
      !ciphertext ||
      extra !== undefined ||
      (await decryptText(key, nonce, ciphertext)) !== KEY_CHECK_TEXT
    ) {
      throw new Error("check");
    }
  } catch {
    throw locked("Das Passwort passt nicht zur Cloud-Datei.");
  }
}

export type EnvelopeInput = {
  revision: number;
  writtenBy: SyncEnvelopeHeader["writtenBy"];
  payload: SyncPayload;
  /** Ohne Schlüssel wird unverschlüsselt geschrieben. */
  key?: SyncKey;
};

export async function serializeEnvelope(input: EnvelopeInput) {
  const payload = syncPayloadSchema.parse(input.payload);
  const header = {
    format: SYNC_FORMAT,
    version: SYNC_VERSION,
    revision: input.revision,
    writtenBy: input.writtenBy,
  };
  if (!input.key) {
    return JSON.stringify({ ...header, encryption: null, payload });
  }
  const sealed = await encryptText(input.key.key, JSON.stringify(payload));
  return JSON.stringify({
    ...header,
    encryption: input.key.encryption,
    payload: sealed.ciphertext,
    nonce: sealed.nonce,
  });
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new CloudSyncError(
      "server",
      "Die Cloud-Datei ist beschädigt und lässt sich nicht lesen.",
    );
  }
}

/** Nur der lesbare Kopf; verlangt kein Passwort. */
export function readEnvelopeHeader(text: string): SyncEnvelopeHeader {
  const parsed = headerSchema.safeParse(parseJson(text));
  if (!parsed.success) {
    throw new CloudSyncError(
      "server",
      "Die Cloud-Datei hat ein unbekanntes Format.",
    );
  }
  return parsed.data;
}

export type OpenedEnvelope = {
  header: SyncEnvelopeHeader;
  payload: SyncPayload;
};

/** Datei öffnen; verschlüsselte Dateien brauchen den passenden Schlüssel. */
export async function openEnvelope(
  text: string,
  key?: CryptoKey,
): Promise<OpenedEnvelope> {
  const parsed = envelopeSchema.safeParse(parseJson(text));
  if (!parsed.success) {
    throw new CloudSyncError(
      "server",
      "Die Cloud-Datei ist beschädigt oder hat ein unbekanntes Format.",
    );
  }
  const { payload, nonce, ...header } = parsed.data;
  if (header.encryption === null) {
    if (typeof payload === "string") {
      throw new CloudSyncError("server", "Die Cloud-Datei ist beschädigt.");
    }
    return { header, payload };
  }
  if (!key) throw locked("Die Cloud-Datei ist verschlüsselt. Passwort nötig.");
  if (typeof payload !== "string" || !nonce) {
    throw new CloudSyncError("server", "Die Cloud-Datei ist beschädigt.");
  }
  await verifySyncKey(key, header.encryption);
  let plain: string;
  try {
    plain = await decryptText(key, nonce, payload);
  } catch {
    throw new CloudSyncError(
      "server",
      "Die Cloud-Datei ist beschädigt und lässt sich nicht entschlüsseln.",
    );
  }
  const inner = syncPayloadSchema.safeParse(parseJson(plain));
  if (!inner.success) {
    throw new CloudSyncError("server", "Die Cloud-Datei ist beschädigt.");
  }
  return { header, payload: inner.data };
}

/**
 * Die bisherige v1-Datei (Sicherung der Lehrerdaten ohne Stempel) lesen, um
 * sie einmalig als Ausgangsstand zu übernehmen. `null`, wenn es keine ist.
 */
export function parseLegacyBackup(text: string): TeacherWorkspaceBackup | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = teacherWorkspaceBackupSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
