import { describe, expect, it } from "vitest";
import { base64ToBytes, bytesToBase64 } from "./base64";
import {
  decryptText,
  derivePassphraseKey,
  encryptText,
  randomSalt,
} from "./passphrase";

describe("base64", () => {
  it("round-trips binary data larger than one chunk", () => {
    const bytes = Uint8Array.from({ length: 70_000 }, (_, i) => i % 251);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });
});

describe("passphrase encryption", () => {
  it("decrypts with the same password and salt, never with another", async () => {
    const salt = randomSalt();
    const key = await derivePassphraseKey("richtig-pferd-batterie", salt, 1000);
    const sealed = await encryptText(key, "Grüße ✓");
    const same = await derivePassphraseKey(
      "richtig-pferd-batterie",
      salt,
      1000,
    );
    expect(await decryptText(same, sealed.nonce, sealed.ciphertext)).toBe(
      "Grüße ✓",
    );
    const wrong = await derivePassphraseKey("falsch", salt, 1000);
    await expect(
      decryptText(wrong, sealed.nonce, sealed.ciphertext),
    ).rejects.toThrow();
  });

  it("uses a fresh nonce for every write", async () => {
    const key = await derivePassphraseKey("x".repeat(12), randomSalt(), 1000);
    const first = await encryptText(key, "a");
    const second = await encryptText(key, "a");
    expect(first.nonce).not.toBe(second.nonce);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it("treats composed and decomposed umlauts as the same password", async () => {
    const salt = randomSalt();
    const a = await derivePassphraseKey("Bär-Straße-Ä1", salt, 1000);
    const b = await derivePassphraseKey("Bär-Straße-Ä1", salt, 1000);
    const sealed = await encryptText(a, "ok");
    expect(await decryptText(b, sealed.nonce, sealed.ciphertext)).toBe("ok");
  });
});
