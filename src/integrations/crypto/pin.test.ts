import { describe, expect, it } from "vitest";
import { createPinVerifier, pinVerifierSchema, verifyPin } from "./pin";

// Wenige Iterationen genügen, um Ablauf und Format zu prüfen.
const ITERATIONS = 1000;

describe("PIN-Prüfwert", () => {
  it("erkennt die richtige PIN und weist falsche ab", async () => {
    const verifier = await createPinVerifier("123456", ITERATIONS);
    expect(await verifyPin("123456", verifier)).toBe(true);
    expect(await verifyPin("123457", verifier)).toBe(false);
    expect(await verifyPin("", verifier)).toBe(false);
  });

  it("speichert nie die PIN und verwendet je Prüfwert ein frisches Salz", async () => {
    const first = await createPinVerifier("123456", ITERATIONS);
    const second = await createPinVerifier("123456", ITERATIONS);
    expect(JSON.stringify(first)).not.toContain("123456");
    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
    expect(pinVerifierSchema.safeParse(first).success).toBe(true);
    expect(first).toMatchObject({ v: 1, iterations: ITERATIONS });
  });

  it("verwendet standardmäßig die Iterationszahl der Passwort-Verschlüsselung", async () => {
    const { DEFAULT_KDF_ITERATIONS } = await import("./passphrase");
    const verifier = await createPinVerifier("000000");
    expect(verifier.iterations).toBe(DEFAULT_KDF_ITERATIONS);
    expect(await verifyPin("000000", verifier)).toBe(true);
  });

  it("behandelt einen beschädigten Prüfwert als falsche PIN", async () => {
    const verifier = await createPinVerifier("123456", ITERATIONS);
    expect(await verifyPin("123456", { ...verifier, hash: "***" })).toBe(false);
    expect(await verifyPin("123456", { ...verifier, salt: "***" })).toBe(false);
  });

  it("lehnt unsinnige Iterationszahlen im Schema ab", () => {
    const base = { v: 1, salt: "AAAAAAAAAAA=", hash: "AAAAAAAAAAA=" };
    expect(
      pinVerifierSchema.safeParse({ ...base, iterations: 0 }).success,
    ).toBe(false);
    expect(
      pinVerifierSchema.safeParse({ ...base, iterations: 900_000_000 }).success,
    ).toBe(false);
  });
});
