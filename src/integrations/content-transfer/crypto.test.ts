import { describe, expect, it } from "vitest";
import {
  LEARNING_BUNDLE_VERSION,
  parseLearningBundleV1,
} from "../../domain/learning-bundle";
import { decryptLearningBundle, encryptLearningBundle } from "./crypto";

const bundle = parseLearningBundleV1({
  schemaVersion: LEARNING_BUNDLE_VERSION,
  id: "bundle:test",
  revision: 1,
  createdAt: "2026-08-25T12:00:00.000Z",
  source: { kind: "teacher", id: "teacher-list:test" },
  vocabulary: [
    {
      kind: "vocabulary",
      id: "word:1",
      prompt: { text: "Haus", locale: "de" },
      answer: { text: "house", locale: "en" },
      tagIds: [],
      createdAt: "2026-08-25T12:00:00.000Z",
      updatedAt: "2026-08-25T12:00:00.000Z",
    },
  ],
  stacks: [
    { id: "stack:1", title: "Woche 1", itemIds: ["word:1"], tagIds: [] },
  ],
});

describe("encrypted content transfer", () => {
  it("decrypts the same bundle with the QR proof and manual code", async () => {
    const secrets = {
      retrievalToken: "qr-token-with-at-least-sixteen-characters",
      manualTransferCode: "ABCD-EFGH-JKLM-NPQR-STUV-WXYZ",
    };
    const encrypted = await encryptLearningBundle(bundle, secrets);

    await expect(
      decryptLearningBundle(
        {
          ciphertext: encrypted.ciphertext,
          nonce: encrypted.nonce,
          wrappedKey: encrypted.wrappedKeyQr,
          cryptoMetadata: encrypted.cryptoMetadata,
        },
        { kind: "qr", secret: secrets.retrievalToken },
      ),
    ).resolves.toEqual(bundle);

    await expect(
      decryptLearningBundle(
        {
          ciphertext: encrypted.ciphertext,
          nonce: encrypted.nonce,
          wrappedKey: encrypted.wrappedKeyManual,
          cryptoMetadata: encrypted.cryptoMetadata,
        },
        { kind: "manual", secret: secrets.manualTransferCode.toLowerCase() },
      ),
    ).resolves.toEqual(bundle);
  });

  it("rejects a wrong retrieval proof", async () => {
    const encrypted = await encryptLearningBundle(bundle, {
      retrievalToken: "correct-qr-token-with-enough-entropy",
      manualTransferCode: "ABCD-EFGH-JKLM-NPQR-STUV-WXYZ",
    });
    await expect(
      decryptLearningBundle(
        {
          ciphertext: encrypted.ciphertext,
          nonce: encrypted.nonce,
          wrappedKey: encrypted.wrappedKeyQr,
          cryptoMetadata: encrypted.cryptoMetadata,
        },
        { kind: "qr", secret: "wrong-qr-token-with-enough-entropy" },
      ),
    ).rejects.toThrow();
  });
});
