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
  if (reservation.error) throw new Error(reservation.error.message);
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
  if (upload.error) throw new Error(upload.error.message);
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
  if (response.error) throw new Error(response.error.message);
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
  if (response.error) throw new Error(response.error.message);
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
