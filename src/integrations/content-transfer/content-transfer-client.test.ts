import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { buildTeacherVocabularyBundle } from "../../domain/teacher-content-transfer";
import {
  retrieveLearningBundleByCode,
  retrieveLearningBundleByQr,
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
    ).rejects.toThrow("Failed to fetch");
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
