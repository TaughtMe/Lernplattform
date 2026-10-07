import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  createTeacherClassRepository,
  createTeacherContentLibraryRepository,
  TeacherClassDatabase,
} from "../../storage/teacher-class-settings";
import { createTeacherSyncStore } from "../../storage/teacher-sync-store";
import { MAX_WRITE_ATTEMPTS, statusForError, syncOnce } from "./engine";
import {
  SYNC_FILE_V2,
  createSyncKey,
  openEnvelope,
  readEnvelopeHeader,
} from "./envelope";
import { SYNC_FILES } from "./sync";
import { NO_ENROLLMENT_KEY } from "./model";
import {
  CloudSyncError,
  type CloudSyncTarget,
  type UploadOptions,
} from "./types";

type Cloud = CloudSyncTarget & {
  files: Map<string, { text: string; etag: string }>;
  calls: string[];
  offline: boolean;
};

function memoryCloud(): Cloud {
  let counter = 0;
  const files = new Map<string, { text: string; etag: string }>();
  const cloud: Cloud = {
    provider: "webdav",
    files,
    calls: [],
    offline: false,
    async upload(name: string, text: string, options: UploadOptions = {}) {
      cloud.calls.push("upload");
      if (cloud.offline) throw new CloudSyncError("network", "offline");
      const current = files.get(name);
      if (options.ifMatch !== undefined) {
        const expected = options.ifMatch;
        if ((current?.etag ?? null) !== expected) {
          throw new CloudSyncError("precondition", "412");
        }
      }
      counter += 1;
      const etag = `"e${counter}"`;
      files.set(name, { text, etag });
      return { etag };
    },
    async download(name: string) {
      cloud.calls.push("download");
      return files.get(name)?.text ?? null;
    },
    async stat(name: string) {
      cloud.calls.push("stat");
      if (cloud.offline) throw new CloudSyncError("network", "offline");
      const file = files.get(name);
      return file ? { etag: file.etag } : null;
    },
    async remove(name: string) {
      cloud.calls.push("remove");
      files.delete(name);
    },
    async read(name: string) {
      cloud.calls.push("read");
      if (cloud.offline) throw new CloudSyncError("network", "offline");
      const file = files.get(name);
      return file ? { text: file.text, etag: file.etag } : null;
    },
  };
  return cloud;
}

const databases: TeacherClassDatabase[] = [];
afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

async function device(
  name: string,
  scope: Partial<
    Record<
      "material" | "assignments" | "classes" | "students" | "results" | "keys",
      boolean
    >
  > = {},
) {
  const database = new TeacherClassDatabase(
    `sync-${name}-${crypto.randomUUID()}`,
  );
  databases.push(database);
  const store = createTeacherSyncStore(database);
  const state = await store.getState();
  await store.patchState({
    enabled: true,
    provider: "webdav",
    deviceName: name,
    scope: { ...state.scope, ...scope },
  });
  return {
    database,
    store,
    classes: createTeacherClassRepository(database),
    material: createTeacherContentLibraryRepository(database),
  };
}

const CLASS_ID = "123e4567-e89b-42d3-a456-426614174001";
const KID_ID = "123e4567-e89b-42d3-a456-426614174002";

const klasse = (id = CLASS_ID, name = "5b") => ({
  id,
  name,
  teacherName: "Frau Lenz",
  schoolYear: "2026/27",
  enabledModules: ["vocabulary" as const],
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-01T08:00:00.000Z",
});

const material = (
  id: string,
  title: string,
  updatedAt = "2026-09-02T08:00:00.000Z",
) => ({
  id,
  revision: 1,
  title,
  source: "Hund;dog",
  promptLocale: "de",
  answerLocale: "en",
  createdAt: "2026-09-02T08:00:00.000Z",
  updatedAt,
});

let clockMs = Date.parse("2026-10-05T10:00:00.000Z");
const clock = () => (clockMs += 1000);

function run(
  d: Awaited<ReturnType<typeof device>>,
  cloud: CloudSyncTarget,
  extra: Partial<Parameters<typeof syncOnce>[0]> = {},
  options?: Parameters<typeof syncOnce>[1],
) {
  return syncOnce(
    { database: d.database, target: cloud, now: clock, ...extra },
    options,
  );
}

describe("syncOnce", () => {
  it("does nothing while sync is off", async () => {
    const d = await device("A");
    await d.store.patchState({ enabled: false });
    const cloud = memoryCloud();
    expect((await run(d, cloud)).status).toBe("off");
    expect(cloud.calls).toEqual([]);
  });

  it("shares material and classes between two devices", async () => {
    const cloud = memoryCloud();
    const a = await device("Laptop");
    const b = await device("Tafel");
    await a.classes.put(klasse());
    await a.material.put(material("m1", "Diktat"));
    const first = await run(a, cloud);
    expect(first).toMatchObject({
      status: "idle",
      uploaded: true,
      revision: 1,
    });
    const second = await run(b, cloud);
    expect(second).toMatchObject({ received: true, revision: 2 });
    expect((await b.material.list()).map((m) => m.title)).toEqual(["Diktat"]);
    expect((await b.classes.list()).map((c) => c.name)).toEqual(["5b"]);
    const header = readEnvelopeHeader(
      cloud.files.get(SYNC_FILE_V2)?.text ?? "",
    );
    expect(header.writtenBy.name).toBe("Tafel");
    const devices = (await b.store.getState()).devices.map((d) => d.name);
    expect(devices.sort()).toEqual(["Laptop", "Tafel"]);
  });

  it("carries edits and deletions to the other device", async () => {
    const cloud = memoryCloud();
    const a = await device("Laptop");
    const b = await device("Tafel");
    await a.material.put(material("m1", "Diktat"));
    await a.material.put(material("m2", "Vokabeln"));
    await run(a, cloud);
    await run(b, cloud);
    await b.material.put(
      material("m1", "Diktat 2", "2026-10-05T11:00:00.000Z"),
    );
    await b.material.remove("m2");
    await run(b, cloud);
    await run(a, cloud);
    expect((await a.material.list()).map((m) => m.title)).toEqual(["Diktat 2"]);
    // Der gelöschte Eintrag kehrt nicht zurück.
    await run(b, cloud);
    await run(a, cloud);
    expect((await a.material.list()).map((m) => m.id)).toEqual(["m1"]);
    expect((await b.material.list()).map((m) => m.id)).toEqual(["m1"]);
  });

  it("takes the fast path when nothing changed", async () => {
    const cloud = memoryCloud();
    const a = await device("Laptop");
    await a.material.put(material("m1", "Diktat"));
    await run(a, cloud);
    cloud.calls.length = 0;
    const idle = await run(a, cloud);
    expect(idle).toMatchObject({ status: "idle", uploaded: false });
    expect(cloud.calls).toEqual(["stat"]);
    // Eine lokale Änderung bricht den schnellen Weg und wird hochgeladen.
    await a.material.put(
      material("m1", "Diktat neu", "2026-10-05T12:00:00.000Z"),
    );
    cloud.calls.length = 0;
    expect((await run(a, cloud)).uploaded).toBe(true);
  });

  it("records a double edit as conflict and keeps the newer version", async () => {
    const cloud = memoryCloud();
    const a = await device("Laptop");
    const b = await device("Tafel");
    await a.material.put(material("m1", "Start"));
    await run(a, cloud);
    await run(b, cloud);
    await a.material.put(material("m1", "Von A", "2026-10-05T11:00:00.000Z"));
    await b.material.put(material("m1", "Von B", "2026-10-05T11:00:01.000Z"));
    await run(a, cloud);
    const result = await run(b, cloud);
    expect(result).toMatchObject({ status: "conflict", newConflicts: 1 });
    const open = await b.store.listConflicts();
    expect(open).toHaveLength(1);
    expect(open[0]?.other?.data["title"]).toBe("Von A");
    // Der nächste Takt ohne Änderung (schneller Weg) meldet den offenen
    // Konflikt weiter, statt den Zustand auf „abgeglichen“ zu setzen.
    expect(await run(b, cloud)).toMatchObject({ status: "conflict" });
    expect((await b.store.getState()).status).toBe("conflict");
    await run(a, cloud);
    expect((await a.material.get("m1"))?.title).toBe(
      (await b.material.get("m1"))?.title,
    );
  });

  it("retries after losing a write race and gives up after three attempts", async () => {
    const cloud = memoryCloud();
    const a = await device("Laptop");
    const b = await device("Tafel");
    await a.material.put(material("m1", "Eins"));
    await run(a, cloud);
    await run(b, cloud);
    await b.material.put(material("m2", "Zwei"));
    await a.material.put(material("m3", "Drei"));
    // B schreibt zwischen Lesen und Schreiben von A.
    let raced = false;
    const raceTarget: CloudSyncTarget = {
      ...cloud,
      upload: async (name, text, options) => {
        if (!raced) {
          raced = true;
          await run(b, cloud);
        }
        return cloud.upload(name, text, options);
      },
    };
    expect((await run(a, raceTarget)).status).toBe("idle");
    await run(b, cloud);
    expect((await a.material.list()).map((m) => m.id).sort()).toEqual([
      "m1",
      "m2",
      "m3",
    ]);
    expect((await b.material.list()).map((m) => m.id).sort()).toEqual([
      "m1",
      "m2",
      "m3",
    ]);

    await a.material.put(material("m4", "Vier"));
    let writes = 0;
    const loser: CloudSyncTarget = {
      ...cloud,
      upload: async () => {
        writes += 1;
        throw new CloudSyncError("precondition", "412");
      },
    };
    const failed = await run(a, loser);
    expect(writes).toBe(MAX_WRITE_ATTEMPTS);
    expect(failed.status).toBe("error");
    expect(failed.error).toMatch(/Konflikt beim Schreiben/);
    // Lokal nichts verloren, der nächste Abgleich holt es nach.
    expect((await a.material.get("m4"))?.title).toBe("Vier");
    expect((await run(a, cloud)).status).toBe("idle");
    await run(b, cloud);
    expect((await b.material.get("m4"))?.title).toBe("Vier");
  });

  it("goes offline without touching local data and recovers", async () => {
    const cloud = memoryCloud();
    const a = await device("Laptop");
    await a.material.put(material("m1", "Eins"));
    cloud.offline = true;
    const result = await run(a, cloud);
    expect(result.status).toBe("offline");
    expect((await a.store.getState()).status).toBe("offline");
    expect((await a.material.list()).map((m) => m.id)).toEqual(["m1"]);
    cloud.offline = false;
    expect((await run(a, cloud)).status).toBe("idle");
  });

  it("encrypts the file and asks for the password on another device", async () => {
    const cloud = memoryCloud();
    const a = await device("Laptop");
    const b = await device("Tafel");
    const key = await createSyncKey("pferd-batterie-klammer", 1000);
    await a.material.put(material("m1", "Geheim"));
    await run(a, cloud, { syncKey: key });
    const text = cloud.files.get(SYNC_FILE_V2)?.text ?? "";
    expect(text).not.toContain("Geheim");
    const locked = await run(b, cloud);
    expect(locked.status).toBe("locked");
    expect((await b.store.getState()).status).toBe("locked");
    const wrong = await createSyncKey("anderes-passwort-12", 1000);
    expect((await run(b, cloud, { syncKey: wrong })).status).toBe("locked");
    const ok = await run(b, cloud, { syncKey: key });
    expect(ok.status).toBe("idle");
    expect((await b.material.list()).map((m) => m.title)).toEqual(["Geheim"]);
    expect((await openEnvelope(text, key.key)).payload.records).toHaveLength(1);
  });

  it("re-encrypts when the password is changed", async () => {
    const cloud = memoryCloud();
    const a = await device("Laptop");
    const first = await createSyncKey("pferd-batterie-klammer", 1000);
    await a.material.put(material("m1", "Eins"));
    await run(a, cloud, { syncKey: first });
    // Das Passwort wird auf A geändert: gelesen mit dem alten, geschrieben mit dem neuen Schlüssel.
    const second = await createSyncKey("neues-passwort-xyz1", 1000);
    const changed = await run(a, cloud, {
      syncKey: second,
      readKey: first.key,
    });
    expect(changed).toMatchObject({ status: "idle", uploaded: true });
    const header = readEnvelopeHeader(
      cloud.files.get(SYNC_FILE_V2)?.text ?? "",
    );
    expect(header.encryption?.salt).toBe(second.encryption.salt);
    // Ein anderes Gerät mit dem alten Schlüssel ist gesperrt.
    const b = await device("Tafel");
    expect((await run(b, cloud, { syncKey: first })).status).toBe("locked");
  });

  it("encrypts an existing plain file when encryption is switched on", async () => {
    const cloud = memoryCloud();
    const a = await device("Laptop");
    await a.material.put(material("m1", "Eins"));
    await run(a, cloud);
    expect(cloud.files.get(SYNC_FILE_V2)?.text).toContain("Eins");
    const key = await createSyncKey("pferd-batterie-klammer", 1000);
    const result = await run(a, cloud, { syncKey: key });
    expect(result.uploaded).toBe(true);
    expect(cloud.files.get(SYNC_FILE_V2)?.text).not.toContain("Eins");
    expect((await a.store.getState()).encrypted).toBe(true);
  });

  it("keeps data of areas this device does not sync", async () => {
    const cloud = memoryCloud();
    const a = await device("Laptop", { students: true });
    const b = await device("Tafel", { students: false });
    await a.classes.put(klasse());
    await a.classes.putMember({
      id: KID_ID,
      classId: CLASS_ID,
      displayName: "Fuchs",
      enrollmentToken: "0123456789abcdef0123456789abcdef",
      createdAt: "2026-09-01T08:00:00.000Z",
    });
    await run(a, cloud);
    await run(b, cloud);
    expect(await b.database.members.count()).toBe(0);
    await b.material.put(material("m1", "Neu"));
    await run(b, cloud);
    const payload = (
      await openEnvelope(cloud.files.get(SYNC_FILE_V2)?.text ?? "")
    ).payload;
    expect(payload.records.map((r) => r.table).sort()).toEqual([
      "classes",
      "contentPackages",
      "members",
    ]);
  });

  it("syncs seals and enrollment keys only when keys are switched on", async () => {
    const cloud = memoryCloud();
    const a = await device("Laptop", { students: true, keys: true });
    await a.classes.put(klasse());
    await a.classes.ensureSeal(CLASS_ID);
    await a.classes.putMember({
      id: KID_ID,
      classId: CLASS_ID,
      displayName: "Fuchs",
      enrollmentToken: "0123456789abcdef0123456789abcdef",
      createdAt: "2026-09-01T08:00:00.000Z",
    });
    await run(a, cloud);
    const raw = cloud.files.get(SYNC_FILE_V2)?.text ?? "";
    expect(raw).toContain("privateJwk");
    expect(raw).toContain("0123456789abcdef0123456789abcdef");

    const withKeys = await device("Tafel", { students: true, keys: true });
    await run(withKeys, cloud);
    expect((await withKeys.database.classes.get(CLASS_ID))?.seal).toBeDefined();
    expect((await withKeys.database.members.get(KID_ID))?.enrollmentToken).toBe(
      "0123456789abcdef0123456789abcdef",
    );

    const withoutKeys = await device("Pult", { students: true, keys: false });
    await run(withoutKeys, cloud);
    expect(
      (await withoutKeys.database.classes.get(CLASS_ID))?.seal,
    ).toBeUndefined();
    expect(
      (await withoutKeys.database.members.get(KID_ID))?.enrollmentToken,
    ).toBe(NO_ENROLLMENT_KEY);
    // Ein Gerät ohne Schlüssel darf die Schlüssel in der Cloud nicht löschen.
    await withoutKeys.material.put(material("m1", "Neu"));
    await run(withoutKeys, cloud);
    expect(cloud.files.get(SYNC_FILE_V2)?.text).toContain("privateJwk");
  });

  it("never writes secrets to the cloud when keys are off", async () => {
    const cloud = memoryCloud();
    const a = await device("Laptop", { students: true, keys: false });
    await a.classes.put(klasse());
    await a.classes.ensureSeal(CLASS_ID);
    await a.classes.putMember({
      id: KID_ID,
      classId: CLASS_ID,
      displayName: "Fuchs",
      enrollmentToken: "0123456789abcdef0123456789abcdef",
      createdAt: "2026-09-01T08:00:00.000Z",
    });
    await run(a, cloud);
    const raw = cloud.files.get(SYNC_FILE_V2)?.text ?? "";
    expect(raw).not.toContain("privateJwk");
    expect(raw).not.toContain("0123456789abcdef0123456789abcdef");
    expect(raw).toContain("Fuchs");
  });

  it("merges the same class created on both devices before the first sync", async () => {
    const cloud = memoryCloud();
    const a = await device("Laptop");
    const b = await device("Tafel");
    const other = "123e4567-e89b-42d3-a456-426614174999";
    await a.classes.put(klasse());
    await b.classes.put(klasse(other));
    await run(a, cloud);
    await run(b, cloud);
    await run(a, cloud);
    expect((await a.classes.list()).map((c) => c.id)).toEqual([CLASS_ID]);
    expect((await b.classes.list()).map((c) => c.id)).toEqual([CLASS_ID]);
  });

  it("takes over a former v1 file once as starting point", async () => {
    const cloud = memoryCloud();
    cloud.files.set(SYNC_FILES.teacher, {
      etag: '"v1"',
      text: JSON.stringify({
        version: 1,
        exportedAt: "2026-10-01T10:00:00.000Z",
        profile: null,
        classes: [klasse()],
        members: [],
        materials: [material("m1", "Alt")],
        assignments: [],
        submissions: [],
      }),
    });
    const a = await device("Laptop");
    const result = await run(a, cloud);
    expect(result).toMatchObject({ status: "idle", uploaded: true });
    expect((await a.material.list()).map((m) => m.title)).toEqual(["Alt"]);
    expect(cloud.files.has(SYNC_FILE_V2)).toBe(true);
    expect(cloud.files.get(SYNC_FILES.teacher)?.etag).toBe('"v1"');
  });

  it("reports damaged cloud files without changing local data", async () => {
    const cloud = memoryCloud();
    cloud.files.set(SYNC_FILE_V2, { etag: '"x"', text: "{kaputt" });
    const a = await device("Laptop");
    await a.material.put(material("m1", "Eins"));
    const result = await run(a, cloud);
    expect(result.status).toBe("error");
    expect(result.error).toMatch(/beschädigt/);
    expect((await a.material.list()).map((m) => m.id)).toEqual(["m1"]);
  });

  it("skips records that fail validation and keeps the rest", async () => {
    const cloud = memoryCloud();
    const a = await device("Laptop");
    const b = await device("Tafel");
    await a.material.put(material("m1", "Gut"));
    await a.material.put(material("m2", "Wird kaputt"));
    await run(a, cloud);
    const file = cloud.files.get(SYNC_FILE_V2);
    const payload = JSON.parse(file?.text ?? "{}") as {
      payload: {
        records: Array<{ id: string; data: Record<string, unknown> }>;
      };
    };
    for (const record of payload.payload.records) {
      if (record.id === "m2") record.data["title"] = "";
    }
    cloud.files.set(SYNC_FILE_V2, {
      etag: '"z"',
      text: JSON.stringify(payload),
    });
    expect((await run(b, cloud)).status).toBe("idle");
    expect((await b.material.list()).map((m) => m.id)).toEqual(["m1"]);
  });

  it("drops tombstones after the retention time", async () => {
    const cloud = memoryCloud();
    const a = await device("Laptop");
    await a.material.put(material("m1", "Eins"));
    await run(a, cloud);
    await a.material.remove("m1");
    await run(a, cloud);
    const tombstones = async () =>
      (await openEnvelope(cloud.files.get(SYNC_FILE_V2)?.text ?? "")).payload
        .tombstones.length;
    expect(await tombstones()).toBe(1);
    clockMs += 91 * 24 * 60 * 60 * 1000;
    await run(a, cloud, {}, { force: true });
    expect(await tombstones()).toBe(0);
  });
});

describe("statusForError", () => {
  it("maps provider errors to states of the cloud icon", () => {
    const map = (error: unknown, provider: "webdav" | "onedrive" = "webdav") =>
      statusForError(error, provider).status;
    expect(map(new CloudSyncError("locked", "x"))).toBe("locked");
    expect(map(new CloudSyncError("reauth", "x"))).toBe("reauth");
    expect(map(new CloudSyncError("unauthorized", "x"))).toBe("error");
    expect(map(new CloudSyncError("unauthorized", "x"), "onedrive")).toBe(
      "reauth",
    );
    expect(map(new CloudSyncError("network", "x"))).toBe("offline");
    expect(map(new CloudSyncError("server", "x"))).toBe("error");
    expect(map(new Error("kaputt"))).toBe("error");
    expect(statusForError("?", "webdav").message).toMatch(/fehlgeschlagen/);
  });
});
