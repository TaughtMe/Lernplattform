import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { buildTeacherVocabularyBundle } from "../../domain/teacher-content-transfer";
import { buildWordListPackage } from "../../domain/word-list-package";
import {
  createTransferLink,
  extractTransferCode,
  parseTransferQrPayload,
  publishTransferPayload,
  retrieveLearningBundleByCode,
  retrieveLearningBundleByQr,
  retrieveTransferByCode,
  retrieveTransferByQr,
  serializeTransferQrPayload,
  transferErrorMessage,
} from "./content-transfer-client";
import { encryptTransferPayload } from "./crypto";

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
      publishTransferPayload(
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
    const encrypted = await encryptTransferPayload(bundle, {
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
function fakeTransferServer(
  payload: { id: string; schemaVersion: string; revision: number } = bundle,
) {
  let stored: Record<string, unknown> | null = null;
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === "reserve_content_transfer") {
      return { data: [reservationRow], error: null };
    }
    if (name === "upload_content_transfer") {
      stored = {
        package_id: payload.id,
        schema_version: payload.schemaVersion,
        content_version: payload.revision,
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
    const published = await publishTransferPayload(client, bundle, 60);

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
      publishTransferPayload(
        clientWithRpc({ data: null, error: { message: "Failed to fetch" } }),
        bundle,
      ),
    ).rejects.toThrow("Keine Verbindung zum Server");
  });

  it("reports a missing transfer room", async () => {
    await expect(
      publishTransferPayload(clientWithRpc({ data: [], error: null }), bundle),
    ).rejects.toThrow("Transferraum konnte nicht angelegt werden");
    await expect(
      publishTransferPayload(
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
      publishTransferPayload(
        withUpload({ data: null, error: { message: "network down" } }),
        bundle,
      ),
    ).rejects.toThrow("Keine Verbindung zum Server");
    await expect(
      publishTransferPayload(withUpload({ data: false, error: null }), bundle),
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
    await publishTransferPayload(client, bundle);
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

describe("Lernwortliste in der Übertragung", () => {
  const wordList = buildWordListPackage({
    id: "teacher-package-wl",
    revision: 1,
    title: "Wörter mit ie",
    text: "Brief, Sieb",
    now: "2026-10-30T10:00:00.000Z",
  });
  const qr = (payload: { retrievalToken: string }) => ({
    version: 1 as const,
    transferId: "transfer-1",
    retrievalToken: payload.retrievalToken,
  });

  it("geht verschlüsselt hin und kommt unverändert an", async () => {
    const { client, rpc } = fakeTransferServer(wordList);
    const published = await publishTransferPayload(client, wordList);

    expect(rpc).toHaveBeenCalledWith(
      "reserve_content_transfer",
      expect.objectContaining({
        p_package_id: "teacher-package-wl",
        p_schema_version: "1.1.0",
        p_ttl_minutes: 1440,
      }),
    );
    const upload = rpc.mock.calls.find(
      ([name]) => name === "upload_content_transfer",
    );
    // Auf dem Server liegt nur Chiffretext, keine Wörter und kein Titel.
    expect(JSON.stringify(upload)).not.toMatch(/Brief|Sieb|Wörter mit ie/);

    await expect(
      retrieveTransferByQr(client, qr(published.qrPayload)),
    ).resolves.toEqual(wordList);
    await expect(
      retrieveTransferByCode(client, published.manualTransferCode),
    ).resolves.toEqual(wordList);
  });

  it("wird von der LernBox mit einem Hinweis abgelehnt, nicht übernommen", async () => {
    const { client } = fakeTransferServer(wordList);
    const published = await publishTransferPayload(client, wordList);
    await expect(
      retrieveLearningBundleByCode(client, published.manualTransferCode),
    ).rejects.toThrow("Das ist eine Lernwortliste");
    await expect(
      retrieveLearningBundleByQr(client, qr(published.qrPayload)),
    ).rejects.toThrow("Lernwerkstatt");
  });

  it("lehnt eine unbekannte Version schon an der Zeile ab, ohne zu entschlüsseln", async () => {
    const future = { ...wordList, schemaVersion: "9.0.0" };
    const client = clientWithRpc({
      error: null,
      data: [
        {
          package_id: "p",
          schema_version: future.schemaVersion,
          content_version: 1,
          ciphertext: "x",
          nonce: "x",
          wrapped_key: "x",
          crypto_metadata: {},
          expires_at: "2026-10-31T10:00:00.000Z",
        },
      ],
    });
    await expect(retrieveTransferByCode(client, manualCode)).rejects.toThrow(
      "neuer als deine App",
    );
    await expect(
      retrieveTransferByQr(client, qr({ retrievalToken })),
    ).rejects.toThrow("neuer als deine App");
  });

  it("baut den Link für die Lernwerkstatt mit dem Code im Hash", () => {
    expect(
      createTransferLink("https://x.example", manualCode, "/lernen/material"),
    ).toBe(`https://x.example/lernen/material#code=${manualCode}`);
  });
});
