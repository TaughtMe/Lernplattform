import type { SupabaseClient } from "@supabase/supabase-js";
import type { LearningBundleV1 } from "../../domain/learning-bundle";
import {
  isWordListPackage,
  SUPPORTED_TRANSFER_VERSIONS,
  TransferPayloadError,
  UNKNOWN_VERSION_MESSAGE,
  type TransferPayload,
} from "../../domain/transfer-payload";
import {
  decryptTransferPayload,
  encryptTransferPayload,
  type DownloadedEncryptedPayload,
} from "./crypto";

type TransferDownloadRow = {
  package_id: string;
  schema_version: string;
  content_version: number;
  ciphertext: string;
  nonce: string;
  wrapped_key: string;
  crypto_metadata: unknown;
  expires_at: string;
};

export type TransferQrPayload = {
  version: 1;
  transferId: string;
  retrievalToken: string;
};

export type PublishedContentTransfer = {
  qrPayload: TransferQrPayload;
  manualTransferCode: string;
  expiresAt: string;
};

function firstRow<T>(data: unknown): T | undefined {
  return Array.isArray(data) ? (data[0] as T | undefined) : undefined;
}

/** Eine Version, die diese App nicht kennt, wird vor dem Entschlüsseln abgelehnt. */
function assertSupportedVersion(row: TransferDownloadRow) {
  if (!SUPPORTED_TRANSFER_VERSIONS.includes(row.schema_version)) {
    throw new TransferPayloadError(UNKNOWN_VERSION_MESSAGE);
  }
}

function downloadPayload(row: TransferDownloadRow): DownloadedEncryptedPayload {
  return {
    ciphertext: row.ciphertext,
    nonce: row.nonce,
    wrappedKey: row.wrapped_key,
    cryptoMetadata: row.crypto_metadata,
  };
}

/** Verständliche Meldung statt roher Datenbankfehler. */
export function transferErrorMessage(message: string) {
  if (/permission denied/i.test(message)) {
    return "Die Übertragung ist auf dem Server noch nicht freigeschaltet (fehlende Datenbankrechte). Bitte die aktuelle Supabase-Migration einspielen.";
  }
  if (/failed to fetch|network/i.test(message)) {
    return "Keine Verbindung zum Server. Bitte Internetverbindung prüfen und erneut versuchen.";
  }
  return message;
}

/**
 * Gibt ein Vokabelpaket oder eine Lernwortliste frei: verschlüsselt im Browser,
 * auf dem Server liegt nur Chiffretext, höchstens `ttlMinutes` lang.
 */
export async function publishTransferPayload(
  client: SupabaseClient,
  bundle: TransferPayload,
  ttlMinutes = 1440,
): Promise<PublishedContentTransfer> {
  const reservation = await client.rpc("reserve_content_transfer", {
    p_package_id: bundle.id,
    p_schema_version: bundle.schemaVersion,
    p_content_version: bundle.revision,
    p_ttl_minutes: ttlMinutes,
  });
  if (reservation.error)
    throw new Error(transferErrorMessage(reservation.error.message));
  const capability = firstRow<{
    transfer_id: string;
    upload_token: string;
    retrieval_token: string;
    manual_transfer_code: string;
    expires_at: string;
  }>(reservation.data);
  if (!capability)
    throw new Error("Der Transferraum konnte nicht angelegt werden.");

  const encrypted = await encryptTransferPayload(bundle, {
    retrievalToken: capability.retrieval_token,
    manualTransferCode: capability.manual_transfer_code,
  });
  const upload = await client.rpc("upload_content_transfer", {
    p_transfer_id: capability.transfer_id,
    p_upload_token: capability.upload_token,
    p_ciphertext: encrypted.ciphertext,
    p_nonce: encrypted.nonce,
    p_wrapped_key_qr: encrypted.wrappedKeyQr,
    p_wrapped_key_manual: encrypted.wrappedKeyManual,
    p_crypto_metadata: encrypted.cryptoMetadata,
  });
  if (upload.error) throw new Error(transferErrorMessage(upload.error.message));
  if (upload.data !== true)
    throw new Error("Das verschlüsselte Paket wurde nicht übernommen.");

  return {
    qrPayload: {
      version: 1,
      transferId: capability.transfer_id,
      retrievalToken: capability.retrieval_token,
    },
    manualTransferCode: capability.manual_transfer_code,
    expiresAt: capability.expires_at,
  };
}

export async function retrieveTransferByQr(
  client: SupabaseClient,
  payload: TransferQrPayload,
): Promise<TransferPayload> {
  if (payload.version !== 1) throw new Error("Unbekannter Transfer-QR-Code.");
  const response = await client.rpc("retrieve_content_transfer_by_qr", {
    p_transfer_id: payload.transferId,
    p_retrieval_token: payload.retrievalToken,
  });
  if (response.error)
    throw new Error(transferErrorMessage(response.error.message));
  const row = firstRow<TransferDownloadRow>(response.data);
  if (!row) throw new Error("Das Paket ist ungültig oder bereits abgelaufen.");
  assertSupportedVersion(row);
  return decryptTransferPayload(downloadPayload(row), {
    kind: "qr",
    secret: payload.retrievalToken,
  });
}

export async function retrieveTransferByCode(
  client: SupabaseClient,
  transferCode: string,
): Promise<TransferPayload> {
  const response = await client.rpc("retrieve_content_transfer_by_code", {
    p_transfer_code: transferCode,
  });
  if (response.error)
    throw new Error(transferErrorMessage(response.error.message));
  const row = firstRow<TransferDownloadRow>(response.data);
  if (!row) throw new Error("Der Code ist ungültig, gesperrt oder abgelaufen.");
  assertSupportedVersion(row);
  return decryptTransferPayload(downloadPayload(row), {
    kind: "manual",
    secret: transferCode,
  });
}

/** Die LernBox nimmt nur Vokabelpakete; eine Lernwortliste gehört in den Wortspeicher. */
export function requireVocabularyBundle(
  payload: TransferPayload,
): LearningBundleV1 {
  if (isWordListPackage(payload)) {
    throw new TransferPayloadError(
      "Das ist eine Lernwortliste. Du übernimmst sie in der Lernwerkstatt unter „Von deiner Lehrkraft“.",
    );
  }
  return payload;
}

export async function retrieveLearningBundleByQr(
  client: SupabaseClient,
  payload: TransferQrPayload,
): Promise<LearningBundleV1> {
  return requireVocabularyBundle(await retrieveTransferByQr(client, payload));
}

export async function retrieveLearningBundleByCode(
  client: SupabaseClient,
  transferCode: string,
): Promise<LearningBundleV1> {
  return requireVocabularyBundle(
    await retrieveTransferByCode(client, transferCode),
  );
}

export function serializeTransferQrPayload(payload: TransferQrPayload): string {
  return `lernraum:transfer:${btoa(JSON.stringify(payload))}`;
}

export function parseTransferQrPayload(value: string): TransferQrPayload {
  if (!value.startsWith("lernraum:transfer:")) {
    throw new Error("Kein Lernraum-Transfercode.");
  }
  const parsed = JSON.parse(
    atob(value.slice("lernraum:transfer:".length)),
  ) as Partial<TransferQrPayload>;
  if (
    parsed.version !== 1 ||
    typeof parsed.transferId !== "string" ||
    typeof parsed.retrievalToken !== "string"
  ) {
    throw new Error("Beschädigter Lernraum-Transfercode.");
  }
  return {
    version: 1,
    transferId: parsed.transferId,
    retrievalToken: parsed.retrievalToken,
  };
}

export const TRANSFER_CODE_LENGTH = 24;
const TRANSFER_PATH = "/lernbox";
/** Hier übernimmt das Kind eine Lernwortliste (Wortspeicher). */
export const WORD_LIST_TRANSFER_PATH = "/lernen/material";
const TRANSFER_LINK_KEY = "code";

/** Großbuchstaben und Ziffern, höchstens 24 Zeichen; Trennzeichen entfallen. */
export function normalizeTransferCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, TRANSFER_CODE_LENGTH);
}

/**
 * Link für den QR-Code: öffnet die LernBox (Vokabelpaket) oder mit `path` die
 * Lernwerkstatt (Lernwortliste) mit vorbefülltem Code-Feld.
 */
export function createTransferLink(
  origin: string,
  code: string,
  path = TRANSFER_PATH,
) {
  const normalized = normalizeTransferCode(code);
  if (normalized.length !== TRANSFER_CODE_LENGTH) {
    throw new Error("Ungültiger Transfercode.");
  }
  const url = new URL(path, origin);
  // Im Hash, damit der Code nie an einen Server gesendet wird.
  url.hash = `${TRANSFER_LINK_KEY}=${normalized}`;
  return url.toString();
}

/**
 * Liest den 24-stelligen Transfercode aus einem gescannten Text: Link
 * (Hash oder Query), nackter Code oder Code mit Trennzeichen.
 */
export function extractTransferCode(value: string): string | null {
  const text = value.trim();
  try {
    const url = new URL(text);
    const fromHash = new URLSearchParams(url.hash.replace(/^#/, "")).get(
      TRANSFER_LINK_KEY,
    );
    const code = normalizeTransferCode(
      fromHash ?? url.searchParams.get(TRANSFER_LINK_KEY) ?? "",
    );
    return code.length === TRANSFER_CODE_LENGTH ? code : null;
  } catch {
    // Kein Link: nackter Code.
  }
  if (!/^[A-Za-z0-9\s-]+$/.test(text)) return null;
  const code = normalizeTransferCode(text);
  return code.length === TRANSFER_CODE_LENGTH ? code : null;
}
