import { beforeAll, describe, expect, it } from "vitest";
import {
  classSealFingerprint,
  createClassSealKeyPair,
  signWithClassSeal,
} from "./class-seal";
import {
  GUEST_PASS_CLOCK_SKEW_MS,
  GUEST_PASS_MAX_MS,
  canonicalGuestPassPayload,
  createGuestPass,
  createGuestPassCode,
  createGuestPassLink,
  guestPassMessage,
  parseGuestPassCode,
  parseGuestPassLink,
  verifyGuestPass,
  type GuestPass,
} from "./guest-pass";

const classId = "123e4567-e89b-42d3-a456-426614174001";
const issued = new Date("2026-10-26T08:00:00.000Z");
const minutes = (count: number) => count * 60_000;

let seal: Awaited<ReturnType<typeof createClassSealKeyPair>>;
let pass: GuestPass;

beforeAll(async () => {
  seal = await createClassSealKeyPair();
  pass = await createGuestPass(seal, classId, issued);
});

describe("Gast-Pass", () => {
  it("läuft 90 Minuten und trägt Klasse und öffentlichen Schlüssel", () => {
    expect(pass.payload).toMatchObject({
      v: 1,
      kind: "guest",
      classId,
      issuedAt: "2026-10-26T08:00:00.000Z",
      expiresAt: "2026-10-26T09:30:00.000Z",
      publicKey: seal.publicKey,
    });
    expect(
      Date.parse(pass.payload.expiresAt) - Date.parse(pass.payload.issuedAt),
    ).toBe(GUEST_PASS_MAX_MS);
  });

  it("gilt im Zeitfenster samt Uhrabweichung", async () => {
    for (const offset of [
      -GUEST_PASS_CLOCK_SKEW_MS,
      0,
      minutes(45),
      GUEST_PASS_MAX_MS,
    ]) {
      const check = await verifyGuestPass(
        pass,
        new Date(issued.getTime() + offset),
      );
      expect(check).toMatchObject({ ok: true, classId });
    }
  });

  it("meldet zu frühe und abgelaufene Pässe", async () => {
    expect(
      await verifyGuestPass(
        pass,
        new Date(issued.getTime() - GUEST_PASS_CLOCK_SKEW_MS - 1),
      ),
    ).toEqual({ ok: false, reason: "zu-frueh" });
    expect(
      await verifyGuestPass(
        pass,
        new Date(issued.getTime() + GUEST_PASS_MAX_MS + 1),
      ),
    ).toEqual({ ok: false, reason: "abgelaufen" });
  });

  it("lehnt veränderte Nutzdaten und fremde Signaturen ab", async () => {
    const shorter = {
      ...pass,
      payload: { ...pass.payload, expiresAt: "2026-10-26T09:29:00.000Z" },
    };
    expect(await verifyGuestPass(shorter, issued)).toEqual({
      ok: false,
      reason: "signatur",
    });
    const otherClass = {
      ...pass,
      payload: {
        ...pass.payload,
        classId: "123e4567-e89b-42d3-a456-426614174099",
      },
    };
    expect(await verifyGuestPass(otherClass, issued)).toMatchObject({
      reason: "signatur",
    });
    const other = await createGuestPass(
      await createClassSealKeyPair(),
      classId,
      issued,
    );
    expect(
      await verifyGuestPass({ ...pass, signature: other.signature }, issued),
    ).toMatchObject({ ok: false, reason: "signatur" });
    expect(
      await verifyGuestPass({ ...pass, signature: "AAAA" }, issued),
    ).toMatchObject({ ok: false, reason: "signatur" });
  });

  it("lehnt eine Laufzeit über 90 Minuten ab, auch wenn sie echt signiert ist", async () => {
    const payload = {
      ...pass.payload,
      expiresAt: new Date(
        issued.getTime() + GUEST_PASS_MAX_MS + 1,
      ).toISOString(),
    };
    const long: GuestPass = {
      payload,
      signature: await signWithClassSeal(
        seal.privateJwk,
        canonicalGuestPassPayload(payload),
      ),
    };
    expect(await verifyGuestPass(long, issued)).toEqual({
      ok: false,
      reason: "laufzeit",
    });
    const backwards = {
      ...pass,
      payload: { ...pass.payload, expiresAt: pass.payload.issuedAt },
    };
    expect(await verifyGuestPass(backwards, issued)).toMatchObject({
      reason: "laufzeit",
    });
  });

  it("lehnt Unsinn als Format ab", async () => {
    for (const value of [null, {}, "x", { payload: {}, signature: "a" }]) {
      expect(await verifyGuestPass(value, issued)).toEqual({
        ok: false,
        reason: "format",
      });
    }
  });

  it("verlangt bei bekannter Klasse den passenden Schlüssel", async () => {
    const known = await classSealFingerprint(seal.publicKey);
    expect(await verifyGuestPass(pass, issued, known)).toMatchObject({
      ok: true,
    });
    const foreign = await classSealFingerprint(
      (await createClassSealKeyPair()).publicKey,
    );
    expect(await verifyGuestPass(pass, issued, foreign)).toEqual({
      ok: false,
      reason: "andere-klasse",
    });
    // Ohne bekannte Klasse genügt die Signatur (Grenze, siehe Dateikopf).
    expect(await verifyGuestPass(pass, issued, undefined)).toMatchObject({
      ok: true,
    });
  });

  it("überträgt den Pass unverändert über Code und Link", async () => {
    const code = createGuestPassCode(pass);
    expect(code).toMatch(/^g1\.[A-Za-z0-9_.-]+$/);
    expect(code.length).toBeLessThan(300);
    expect(parseGuestPassCode(code)).toEqual(pass);
    const link = createGuestPassLink("https://lernraum.example", pass);
    expect(link.startsWith("https://lernraum.example/gast#code=g1.")).toBe(
      true,
    );
    expect(parseGuestPassLink(link)).toEqual(pass);
    expect(parseGuestPassLink(`#code=${code}`)).toEqual(pass);
    expect(
      await verifyGuestPass(parseGuestPassLink(link), issued),
    ).toMatchObject({ ok: true });
  });

  it("weist kaputte Codes und Links ab", () => {
    const code = createGuestPassCode(pass);
    expect(() => parseGuestPassCode("")).toThrow();
    expect(() => parseGuestPassCode(code.replace("g1.", "g2."))).toThrow();
    expect(() => parseGuestPassCode(`${code}.extra`)).toThrow();
    expect(() =>
      parseGuestPassCode(code.split(".").slice(0, 5).join(".")),
    ).toThrow();
    expect(() => parseGuestPassLink("https://lernraum.example/gast")).toThrow();
    expect(() => createGuestPassLink("ftp://lernraum.example", pass)).toThrow();
  });

  it("hat zu jedem Grund eine kurze Meldung", () => {
    for (const reason of [
      "format",
      "laufzeit",
      "signatur",
      "andere-klasse",
      "zu-frueh",
      "abgelaufen",
    ] as const) {
      expect(guestPassMessage(reason).length).toBeGreaterThan(20);
    }
    expect(guestPassMessage("abgelaufen")).toContain("abgelaufen");
  });
});
