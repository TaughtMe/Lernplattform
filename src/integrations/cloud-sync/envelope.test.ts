import { describe, expect, it } from "vitest";
import { contentHash } from "./hash";
import {
  createSyncKey,
  openEnvelope,
  parseLegacyBackup,
  readEnvelopeHeader,
  serializeEnvelope,
  syncPayloadSchema,
  unlockSyncKey,
  type SyncPayload,
} from "./envelope";
import { formatHlc } from "./hlc";

const data = { id: "m1", title: "Diktat" };
const payload: SyncPayload = {
  records: [
    {
      table: "contentPackages",
      id: "m1",
      hlc: formatHlc({ ms: 5, counter: 0, device: "d-1" }),
      device: "d-1",
      hash: contentHash(data),
      data,
    },
  ],
  tombstones: [],
  resolved: ["abc"],
  devices: [
    {
      id: "d-1",
      name: "Tafel 2b",
      revision: 4,
      seenAt: "2026-10-05T10:00:00Z",
    },
  ],
};
const writtenBy = {
  device: "d-1",
  name: "Tafel 2b",
  at: "2026-10-05T10:00:00Z",
};

describe("sync envelope", () => {
  it("writes and reads an unencrypted file", async () => {
    const text = await serializeEnvelope({ revision: 5, writtenBy, payload });
    expect(readEnvelopeHeader(text)).toMatchObject({
      revision: 5,
      encryption: null,
    });
    const opened = await openEnvelope(text);
    expect(opened.payload).toEqual(payload);
    expect(opened.header.writtenBy.name).toBe("Tafel 2b");
  });

  it("keeps the header readable and the payload secret when encrypted", async () => {
    const key = await createSyncKey("pferd-batterie-klammer", 1000);
    const text = await serializeEnvelope({
      revision: 6,
      writtenBy,
      payload,
      key,
    });
    expect(text).not.toContain("Diktat");
    expect(readEnvelopeHeader(text)).toMatchObject({
      revision: 6,
      encryption: { algorithm: "AES-GCM", iterations: 1000 },
    });
    expect((await openEnvelope(text, key.key)).payload).toEqual(payload);
  });

  it("unlocks a second device with the password and rejects a wrong one", async () => {
    const key = await createSyncKey("pferd-batterie-klammer", 1000);
    const text = await serializeEnvelope({
      revision: 1,
      writtenBy,
      payload,
      key,
    });
    const header = readEnvelopeHeader(text);
    const other = await unlockSyncKey(
      "pferd-batterie-klammer",
      header.encryption as NonNullable<typeof header.encryption>,
    );
    expect((await openEnvelope(text, other.key)).payload).toEqual(payload);
    await expect(
      unlockSyncKey(
        "falsch",
        header.encryption as NonNullable<typeof header.encryption>,
      ),
    ).rejects.toMatchObject({ code: "locked" });
  });

  it("asks for the password when the file is encrypted and none is given", async () => {
    const key = await createSyncKey("pferd-batterie-klammer", 1000);
    const text = await serializeEnvelope({
      revision: 1,
      writtenBy,
      payload,
      key,
    });
    await expect(openEnvelope(text)).rejects.toMatchObject({ code: "locked" });
    const wrong = await createSyncKey("anderes-passwort-12", 1000);
    await expect(openEnvelope(text, wrong.key)).rejects.toMatchObject({
      code: "locked",
    });
  });

  it("detects a changed password by the key check", async () => {
    const first = await createSyncKey("pferd-batterie-klammer", 1000);
    const second = await createSyncKey("pferd-batterie-klammer", 1000);
    // Neues Salz ergibt einen anderen Schlüssel, auch bei gleichem Passwort.
    expect(first.encryption.salt).not.toBe(second.encryption.salt);
    const text = await serializeEnvelope({
      revision: 1,
      writtenBy,
      payload,
      key: second,
    });
    await expect(openEnvelope(text, first.key)).rejects.toMatchObject({
      code: "locked",
    });
  });

  it("reports damaged files in German instead of throwing raw errors", async () => {
    await expect(openEnvelope("{kaputt")).rejects.toMatchObject({
      code: "server",
    });
    expect(() => readEnvelopeHeader("{kaputt")).toThrow(/beschädigt/);
    expect(() => readEnvelopeHeader('{"format":"x"}')).toThrow(/Format/);
    await expect(openEnvelope('{"format":"x"}')).rejects.toMatchObject({
      code: "server",
    });
    const text = await serializeEnvelope({ revision: 1, writtenBy, payload });
    const tampered = text
      .replace('"title":"Diktat"', '"title":"Diktat"')
      .replace('"hash":"', '"hash":"zz');
    await expect(openEnvelope(tampered)).rejects.toMatchObject({
      code: "server",
    });
  });

  it("rejects encrypted files with garbled ciphertext or missing nonce", async () => {
    const key = await createSyncKey("pferd-batterie-klammer", 1000);
    const text = await serializeEnvelope({
      revision: 1,
      writtenBy,
      payload,
      key,
    });
    const value = JSON.parse(text) as Record<string, string>;
    await expect(
      openEnvelope(JSON.stringify({ ...value, payload: "AAAA" }), key.key),
    ).rejects.toMatchObject({ code: "server" });
    const withoutNonce = { ...value };
    delete withoutNonce["nonce"];
    await expect(
      openEnvelope(JSON.stringify(withoutNonce), key.key),
    ).rejects.toMatchObject({ code: "server" });
    await expect(
      openEnvelope(
        JSON.stringify({
          ...value,
          encryption: null,
        }),
      ),
    ).rejects.toMatchObject({ code: "server" });
  });

  it("limits the key derivation cost a file may demand", async () => {
    const text = await serializeEnvelope({ revision: 1, writtenBy, payload });
    const hostile = JSON.stringify({
      ...JSON.parse(text),
      encryption: {
        algorithm: "AES-GCM",
        keyDerivation: "PBKDF2-SHA-256",
        iterations: 900_000_000,
        salt: "AA==",
        keyCheck: "AA==.AA==",
      },
    });
    expect(() => readEnvelopeHeader(hostile)).toThrow(/Format/);
  });

  it("validates the payload shape", () => {
    expect(syncPayloadSchema.safeParse({ records: [] }).success).toBe(false);
  });

  it("recognises the former v1 backup and nothing else", () => {
    const backup = {
      version: 1,
      exportedAt: "2026-10-01T10:00:00Z",
      profile: null,
      classes: [],
      members: [],
      materials: [],
      assignments: [],
      submissions: [],
    };
    expect(parseLegacyBackup(JSON.stringify(backup))).toMatchObject({
      version: 1,
    });
    expect(parseLegacyBackup("{kaputt")).toBeNull();
    expect(parseLegacyBackup('{"format":"lernraum-sync"}')).toBeNull();
  });
});
