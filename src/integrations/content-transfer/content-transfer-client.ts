import type { SupabaseClient } from "@supabase/supabase-js";
import type { LearningBundleV1 } from "../../domain/learning-bundle";
import {
  decryptLearningBundle,
  encryptLearningBundle,
  type DownloadedEncryptedBundle,
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

function downloadPayload(row: TransferDownloadRow): DownloadedEncryptedBundle {
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

export async function publishLearningBundle(
  client: SupabaseClient,
  bundle: LearningBundleV1,
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

  const encrypted = await encryptLearningBundle(bundle, {
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

export async function retrieveLearningBundleByQr(
  client: SupabaseClient,
  payload: TransferQrPayload,
): Promise<LearningBundleV1> {
  if (payload.version !== 1) throw new Error("Unbekannter Transfer-QR-Code.");
  const response = await client.rpc("retrieve_content_transfer_by_qr", {
    p_transfer_id: payload.transferId,
    p_retrieval_token: payload.retrievalToken,
  });
  if (response.error)
    throw new Error(transferErrorMessage(response.error.message));
  const row = firstRow<TransferDownloadRow>(response.data);
  if (!row) throw new Error("Das Paket ist ungültig oder bereits abgelaufen.");
  return decryptLearningBundle(downloadPayload(row), {
    kind: "qr",
    secret: payload.retrievalToken,
  });
}

export async function retrieveLearningBundleByCode(
  client: SupabaseClient,
  transferCode: string,
): Promise<LearningBundleV1> {
  const response = await client.rpc("retrieve_content_transfer_by_code", {
    p_transfer_code: transferCode,
  });
  if (response.error)
    throw new Error(transferErrorMessage(response.error.message));
  const row = firstRow<TransferDownloadRow>(response.data);
  if (!row) throw new Error("Der Code ist ungültig, gesperrt oder abgelaufen.");
  return decryptLearningBundle(downloadPayload(row), {
    kind: "manual",
    secret: transferCode,
  });
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
const TRANSFER_LINK_KEY = "code";

/** Großbuchstaben und Ziffern, höchstens 24 Zeichen; Trennzeichen entfallen. */
export function normalizeTransferCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, TRANSFER_CODE_LENGTH);
}

/** Link für den QR-Code: öffnet die LernBox mit vorbefülltem Code-Feld. */
export function createTransferLink(origin: string, code: string) {
  const normalized = normalizeTransferCode(code);
  if (normalized.length !== TRANSFER_CODE_LENGTH) {
    throw new Error("Ungültiger Transfercode.");
  }
  const url = new URL(TRANSFER_PATH, origin);
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
