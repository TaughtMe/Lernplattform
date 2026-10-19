import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { buildTeacherVocabularyBundle } from "../../domain/teacher-content-transfer";
import {
  createTransferLink,
  extractTransferCode,
  parseTransferQrPayload,
  publishLearningBundle,
  retrieveLearningBundleByCode,
  retrieveLearningBundleByQr,
  serializeTransferQrPayload,
  transferErrorMessage,
} from "./content-transfer-client";
import { encryptLearningBundle } from "./crypto";

const manualCode = "23456789ABCDEFGHJKLMNPQR";
const retrievalToken = "retrieval-token-with-enough-entropy";
const bundle = buildTeacherVocabularyBundle({
  id: "package-1",
  revision: 1,
  title: "Unit 1",
  source: "school;Schule",
  now: "2026-08-25T12:00:00.000Z",
});

function clientWithRpc(result: unknown) {
  return {
    rpc: vi.fn().mockResolvedValue(result),
  } as unknown as SupabaseClient;
}

describe("content transfer client failures", () => {
  it("surfaces network failures without exposing package data", async () => {
    await expect(
      retrieveLearningBundleByCode(
        clientWithRpc({ data: null, error: { message: "Failed to fetch" } }),
        manualCode,
      ),
    ).rejects.toThrow("Keine Verbindung zum Server");
  });

  it("explains missing database rights instead of the raw error", async () => {
    await expect(
      publishLearningBundle(
        clientWithRpc({
          data: null,
          error: {
            message: "permission denied for function reserve_content_transfer",
          },
        }),
        bundle,
      ),
    ).rejects.toThrow("Supabase-Migration");
  });

  it("rejects expired or locked manual codes", async () => {
    await expect(
      retrieveLearningBundleByCode(
        clientWithRpc({ data: [], error: null }),
        manualCode,
      ),
    ).rejects.toThrow("ungültig, gesperrt oder abgelaufen");
  });

  it("rejects damaged ciphertext before it reaches the LernBox", async () => {
    const encrypted = await encryptLearningBundle(bundle, {
      retrievalToken,
      manualTransferCode: manualCode,
    });
    const damaged = `${encrypted.ciphertext.slice(0, -2)}AA`;
    const client = clientWithRpc({
      error: null,
      data: [
        {
          package_id: bundle.id,
          schema_version: bundle.schemaVersion,
          content_version: bundle.revision,
          ciphertext: damaged,
          nonce: encrypted.nonce,
          wrapped_key: encrypted.wrappedKeyQr,
          crypto_metadata: encrypted.cryptoMetadata,
          expires_at: "2026-08-26T12:00:00.000Z",
        },
      ],
    });

    await expect(
      retrieveLearningBundleByQr(client, {
        version: 1,
        transferId: "transfer-1",
        retrievalToken,
      }),
    ).rejects.toThrow();
  });
});

const reservationRow = {
  transfer_id: "transfer-1",
  upload_token: "upload-token",
  retrieval_token: retrievalToken,
  manual_transfer_code: manualCode,
  expires_at: "2026-08-26T12:00:00.000Z",
};

/** Bildet Reservieren, Hochladen und Abrufen der Datenbankfunktionen nach. */
function fakeTransferServer() {
  let stored: Record<string, unknown> | null = null;
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === "reserve_content_transfer") {
      return { data: [reservationRow], error: null };
    }
    if (name === "upload_content_transfer") {
      stored = {
        package_id: bundle.id,
        schema_version: bundle.schemaVersion,
        content_version: bundle.revision,
        ciphertext: args["p_ciphertext"],
        nonce: args["p_nonce"],
        wrapped_key: args["p_wrapped_key_qr"],
        wrapped_key_manual: args["p_wrapped_key_manual"],
        crypto_metadata: args["p_crypto_metadata"],
        expires_at: reservationRow.expires_at,
      };
      return { data: true, error: null };
    }
    if (name === "retrieve_content_transfer_by_qr") {
      return { data: [stored], error: null };
    }
    return {
      data: [{ ...stored, wrapped_key: stored?.["wrapped_key_manual"] }],
      error: null,
    };
  });
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

describe("content transfer client round trip", () => {
  it("publishes a bundle and retrieves it by QR payload and by manual code", async () => {
    const { client, rpc } = fakeTransferServer();
    const published = await publishLearningBundle(client, bundle, 60);

    expect(rpc).toHaveBeenCalledWith(
      "reserve_content_transfer",
      expect.objectContaining({ p_package_id: bundle.id, p_ttl_minutes: 60 }),
    );
    expect(published).toEqual({
      qrPayload: { version: 1, transferId: "transfer-1", retrievalToken },
      manualTransferCode: manualCode,
      expiresAt: reservationRow.expires_at,
    });

    await expect(
      retrieveLearningBundleByQr(client, published.qrPayload),
    ).resolves.toEqual(bundle);
    await expect(
      retrieveLearningBundleByCode(client, published.manualTransferCode),
    ).resolves.toEqual(bundle);
  });
});

describe("content transfer client publishing failures", () => {
  it("reports a failed reservation", async () => {
    await expect(
      publishLearningBundle(
        clientWithRpc({ data: null, error: { message: "Failed to fetch" } }),
        bundle,
      ),
    ).rejects.toThrow("Keine Verbindung zum Server");
  });

  it("reports a missing transfer room", async () => {
    await expect(
      publishLearningBundle(clientWithRpc({ data: [], error: null }), bundle),
    ).rejects.toThrow("Transferraum konnte nicht angelegt werden");
    await expect(
      publishLearningBundle(
        clientWithRpc({ data: "kein-array", error: null }),
        bundle,
      ),
    ).rejects.toThrow("Transferraum konnte nicht angelegt werden");
  });

  it("reports a failed or refused upload", async () => {
    const withUpload = (upload: unknown) =>
      ({
        rpc: vi.fn(async (name: string) =>
          name === "reserve_content_transfer"
            ? { data: [reservationRow], error: null }
            : upload,
        ),
      }) as unknown as SupabaseClient;

    await expect(
      publishLearningBundle(
        withUpload({ data: null, error: { message: "network down" } }),
        bundle,
      ),
    ).rejects.toThrow("Keine Verbindung zum Server");
    await expect(
      publishLearningBundle(withUpload({ data: false, error: null }), bundle),
    ).rejects.toThrow("nicht übernommen");
  });
});

describe("content transfer client retrieval failures", () => {
  const payload = { version: 1 as const, transferId: "t", retrievalToken };

  it("rejects unknown QR versions without calling the server", async () => {
    const client = clientWithRpc({ data: [], error: null });
    await expect(
      retrieveLearningBundleByQr(client, {
        ...payload,
        version: 2 as unknown as 1,
      }),
    ).rejects.toThrow("Unbekannter Transfer-QR-Code");
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("reports network errors and expired packages for QR retrieval", async () => {
    await expect(
      retrieveLearningBundleByQr(
        clientWithRpc({ data: null, error: { message: "Failed to fetch" } }),
        payload,
      ),
    ).rejects.toThrow("Keine Verbindung zum Server");
    await expect(
      retrieveLearningBundleByQr(
        clientWithRpc({ data: [], error: null }),
        payload,
      ),
    ).rejects.toThrow("ungültig oder bereits abgelaufen");
  });

  it("rejects a manual code that does not match the stored package", async () => {
    const { client } = fakeTransferServer();
    await publishLearningBundle(client, bundle);
    await expect(
      retrieveLearningBundleByCode(client, "FALSCHER-CODE-000000000"),
    ).rejects.toThrow();
  });
});

describe("transfer messages and QR text", () => {
  it("passes unknown errors through unchanged", () => {
    expect(transferErrorMessage("Etwas anderes")).toBe("Etwas anderes");
  });

  it("round-trips the QR payload", () => {
    const payload = { version: 1 as const, transferId: "t-1", retrievalToken };
    const text = serializeTransferQrPayload(payload);
    expect(text.startsWith("lernraum:transfer:")).toBe(true);
    expect(parseTransferQrPayload(text)).toEqual(payload);
  });

  it("rejects foreign and damaged QR text", () => {
    expect(() => parseTransferQrPayload("https://example.org")).toThrow(
      "Kein Lernraum-Transfercode",
    );
    const damaged = (value: unknown) =>
      `lernraum:transfer:${btoa(JSON.stringify(value))}`;
    expect(() =>
      parseTransferQrPayload(damaged({ version: 2, transferId: "t" })),
    ).toThrow("Beschädigter Lernraum-Transfercode");
    expect(() =>
      parseTransferQrPayload(
        damaged({ version: 1, transferId: 5, retrievalToken }),
      ),
    ).toThrow("Beschädigter Lernraum-Transfercode");
  });
});

describe("transfer link and scanned text", () => {
  it("round-trips the link with the code in the hash", () => {
    const link = createTransferLink("https://lernraum.example", manualCode);
    expect(link).toBe(`https://lernraum.example/lernbox#code=${manualCode}`);
    expect(extractTransferCode(link)).toBe(manualCode);
  });

  it("reads codes from query links, bare codes and grouped codes", () => {
    expect(
      extractTransferCode(`https://x.example/lernbox?code=${manualCode}`),
    ).toBe(manualCode);
    expect(extractTransferCode(manualCode)).toBe(manualCode);
    expect(
      extractTransferCode("2345-6789-ABCD-EFGH-JKLM-NPQR".toLowerCase()),
    ).toBe(manualCode);
  });

  it("rejects text without a complete code", () => {
    expect(extractTransferCode("https://example.org")).toBeNull();
    expect(extractTransferCode("hallo welt!")).toBeNull();
    expect(extractTransferCode("2345-6789")).toBeNull();
    expect(() => createTransferLink("https://x.example", "ABC")).toThrow();
  });
});
