import { describe, expect, it } from "vitest";
import type { ClassEnrollment } from "./class-enrollment";
import {
  canonicalWritingReliefGrant,
  classSealFingerprint,
  classSealFingerprintSchema,
  createClassSealKeyPair,
  isWritingReliefActive,
  signWritingReliefGrant,
  verifyWritingReliefGrant,
  type WritingReliefGrant,
} from "./class-seal";

const classId = "123e4567-e89b-42d3-a456-426614174001";
const membershipId = "123e4567-e89b-42d3-a456-426614174002";
const grant: WritingReliefGrant = {
  v: 1,
  classId,
  membershipId,
  writingRelief: true,
  issuedAt: "2026-10-02T08:00:00.000Z",
};

async function issued(
  seal: Awaited<ReturnType<typeof createClassSealKeyPair>>,
  overrides: Partial<ClassEnrollment> = {},
): Promise<ClassEnrollment> {
  return {
    version: 1,
    classId,
    membershipId,
    className: "7b",
    teacherName: "Frau Test",
    schoolYear: "2026/27",
    displayName: "Alex",
    enrollmentToken: "0123456789abcdef0123456789abcdef",
    issuedAt: "2026-08-30T10:05:00.000Z",
    sealPublicKey: seal.publicKey,
    writingReliefGrant: grant,
    writingReliefSignature: await signWritingReliefGrant(
      seal.privateJwk,
      grant,
    ),
    ...overrides,
  };
}

describe("Klassenstempel", () => {
  it("erzeugt Schlüsselpaar und Abdruck (SHA-256, base64url)", async () => {
    const seal = await createClassSealKeyPair();
    const fingerprint = await classSealFingerprint(seal.publicKey);
    expect(classSealFingerprintSchema.safeParse(fingerprint).success).toBe(
      true,
    );
    expect(await classSealFingerprint(seal.publicKey)).toBe(fingerprint);
    const other = await createClassSealKeyPair();
    expect(await classSealFingerprint(other.publicKey)).not.toBe(fingerprint);
  });

  it("serialisiert die Freigabe in fester Reihenfolge", () => {
    const shuffled = {
      issuedAt: grant.issuedAt,
      writingRelief: true,
      membershipId,
      classId,
      v: 1,
    } as const;
    expect(canonicalWritingReliefGrant(shuffled)).toBe(
      canonicalWritingReliefGrant(grant),
    );
  });

  it("verifiziert eine gültige Freigabe", async () => {
    const seal = await createClassSealKeyPair();
    const signature = await signWritingReliefGrant(seal.privateJwk, grant);
    expect(
      await verifyWritingReliefGrant(seal.publicKey, grant, signature),
    ).toBe(true);
  });

  it("lehnt manipulierte Felder, falsche Schlüssel und Müll ab", async () => {
    const seal = await createClassSealKeyPair();
    const other = await createClassSealKeyPair();
    const signature = await signWritingReliefGrant(seal.privateJwk, grant);
    expect(
      await verifyWritingReliefGrant(
        seal.publicKey,
        { ...grant, membershipId: "123e4567-e89b-42d3-a456-426614174099" },
        signature,
      ),
    ).toBe(false);
    expect(
      await verifyWritingReliefGrant(other.publicKey, grant, signature),
    ).toBe(false);
    expect(await verifyWritingReliefGrant(seal.publicKey, grant, "AAAA")).toBe(
      false,
    );
    expect(
      await verifyWritingReliefGrant("kein-schluessel", grant, signature),
    ).toBe(false);
  });

  describe("isWritingReliefActive", () => {
    it("ist aktiv bei gültiger Freigabe und passendem Raumstempel", async () => {
      const seal = await createClassSealKeyPair();
      const fingerprint = await classSealFingerprint(seal.publicKey);
      expect(
        await isWritingReliefActive([await issued(seal)], fingerprint),
      ).toBe(true);
    });

    it("ist ohne Stempel im Raum nie aktiv", async () => {
      const seal = await createClassSealKeyPair();
      expect(await isWritingReliefActive([await issued(seal)], undefined)).toBe(
        false,
      );
    });

    it("Schummeltest: Freigabe einer selbst angelegten Klasse wirkt nicht im Raum der echten Klasse", async () => {
      const real = await createClassSealKeyPair();
      const fake = await createClassSealKeyPair();
      const realFingerprint = await classSealFingerprint(real.publicKey);
      // Selbst ausgestellt: gültig signiert, aber mit dem eigenen Schlüssel.
      expect(
        await isWritingReliefActive([await issued(fake)], realFingerprint),
      ).toBe(false);
    });

    it("lehnt eine Freigabe ab, deren Schlüssel durch den echten ersetzt wurde", async () => {
      const real = await createClassSealKeyPair();
      const fake = await createClassSealKeyPair();
      const realFingerprint = await classSealFingerprint(real.publicKey);
      // Echter Schlüssel mitgeschickt, Signatur aber vom falschen.
      const forged = await issued(fake, { sealPublicKey: real.publicKey });
      expect(await isWritingReliefActive([forged], realFingerprint)).toBe(
        false,
      );
    });

    it("lehnt Freigaben ab, die nicht zur Mitgliedschaft passen", async () => {
      const seal = await createClassSealKeyPair();
      const fingerprint = await classSealFingerprint(seal.publicKey);
      const otherMember = await issued(seal, {
        membershipId: "123e4567-e89b-42d3-a456-426614174099",
      });
      const otherClass = await issued(seal, {
        classId: "123e4567-e89b-42d3-a456-426614174098",
      });
      expect(
        await isWritingReliefActive([otherMember, otherClass], fingerprint),
      ).toBe(false);
    });

    it("ignoriert Mitgliedschaften ohne Freigabe oder mit kaputtem Schlüssel", async () => {
      const seal = await createClassSealKeyPair();
      const fingerprint = await classSealFingerprint(seal.publicKey);
      const bare = await issued(seal, {
        writingReliefGrant: undefined,
        writingReliefSignature: undefined,
      });
      const broken = await issued(seal, { sealPublicKey: "***" });
      expect(await isWritingReliefActive([bare, broken], fingerprint)).toBe(
        false,
      );
    });

    it("ist aktiv, wenn von mehreren Mitgliedschaften nur eine passt", async () => {
      const seal = await createClassSealKeyPair();
      const other = await createClassSealKeyPair();
      const fingerprint = await classSealFingerprint(seal.publicKey);
      expect(
        await isWritingReliefActive(
          [await issued(other), await issued(seal)],
          fingerprint,
        ),
      ).toBe(true);
    });
  });
});

describe("Browser-JWK mit alg", () => {
  it("akzeptiert einen privaten Schlüssel mit alg", async () => {
    const { classSealPrivateJwkSchema } = await import("./class-seal");
    expect(
      classSealPrivateJwkSchema.parse({
        kty: "EC",
        crv: "P-256",
        x: "x",
        y: "y",
        d: "d",
        alg: "ES256",
      }),
    ).toMatchObject({ alg: "ES256" });
  });
});
