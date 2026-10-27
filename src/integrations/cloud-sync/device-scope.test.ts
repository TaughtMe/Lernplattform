import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { TeacherDeviceType } from "../../domain/teacher-device";
import {
  createTeacherClassRepository,
  createTeacherContentLibraryRepository,
  createTeacherProfileRepository,
  TeacherClassDatabase,
} from "../../storage/teacher-class-settings";
import {
  countTeacherPersonalData,
  deleteTeacherPersonalData,
} from "../../storage/teacher-personal-data";
import { createTeacherSyncStore } from "../../storage/teacher-sync-store";
import { scopeForDevice } from "./device-scope";
import { syncOnce } from "./engine";
import { SYNC_FILE_V2, openEnvelope } from "./envelope";
import { DEFAULT_SYNC_SCOPE, tablesInScope, type SyncScope } from "./model";
import type { CloudSyncTarget } from "./types";

// Regel D3-3 und D3-5: Auf einer Tafel gleicht die Runde nur Material ab.
// Nach dem Abgleich steht kein Schülername in der Datenbank.

const everything: SyncScope = {
  material: true,
  assignments: true,
  classes: true,
  students: true,
  results: true,
  keys: true,
};

function memoryCloud(): CloudSyncTarget {
  let counter = 0;
  const files = new Map<string, { text: string; etag: string }>();
  return {
    provider: "webdav",
    async upload(name, text, options = {}) {
      if (options.ifMatch !== undefined) {
        if ((files.get(name)?.etag ?? null) !== options.ifMatch) {
          throw new Error("412");
        }
      }
      counter += 1;
      const etag = `"e${counter}"`;
      files.set(name, { text, etag });
      return { etag };
    },
    async download(name) {
      return files.get(name)?.text ?? null;
    },
    async stat(name) {
      const file = files.get(name);
      return file ? { etag: file.etag } : null;
    },
    async remove(name) {
      files.delete(name);
    },
    async read(name) {
      const file = files.get(name);
      return file ? { text: file.text, etag: file.etag } : null;
    },
  };
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

async function device(name: string) {
  const database = new TeacherClassDatabase(
    `scope-${name}-${crypto.randomUUID()}`,
  );
  databases.push(database);
  const store = createTeacherSyncStore(database);
  await store.patchState({
    enabled: true,
    provider: "webdav",
    deviceName: name,
    // Die Lehrkraft hat alles gewählt; die Tafel darf trotzdem nur Material.
    scope: { ...everything },
  });
  return {
    database,
    classes: createTeacherClassRepository(database),
    material: createTeacherContentLibraryRepository(database),
    profile: createTeacherProfileRepository(database),
  };
}

const CLASS_ID = "123e4567-e89b-42d3-a456-426614174001";
const KID_ID = "123e4567-e89b-42d3-a456-426614174002";
const KID_NAME = "Mia Musterkind";

let clockMs = Date.parse("2026-10-05T10:00:00.000Z");
const now = () => (clockMs += 1000);

function run(
  d: Awaited<ReturnType<typeof device>>,
  cloud: CloudSyncTarget,
  type: TeacherDeviceType,
) {
  return syncOnce({
    database: d.database,
    target: cloud,
    now,
    deviceType: () => type,
  });
}

/** Das Laptop-Gerät: Klasse, Schüler, Profil und Material. */
async function seededLaptop() {
  const laptop = await device("Laptop");
  await laptop.classes.put({
    id: CLASS_ID,
    name: "5b",
    teacherName: "Frau Lenz",
    schoolYear: "2026/27",
    enabledModules: ["vocabulary"],
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
  });
  await laptop.classes.putMember({
    id: KID_ID,
    classId: CLASS_ID,
    displayName: KID_NAME,
    enrollmentToken: "0123456789abcdef0123456789abcdef",
    createdAt: "2026-09-01T08:00:00.000Z",
  });
  await laptop.profile.put({
    id: "local-teacher",
    displayName: "Frau Lenz",
    school: "Grundschule Nord",
    email: "lenz@example.org",
    subjects: ["Deutsch"],
    updatedAt: "2026-09-01T08:00:00.000Z",
  });
  await laptop.material.put({
    id: "m1",
    revision: 1,
    title: "Diktat",
    source: "Hund;dog",
    promptLocale: "de",
    answerLocale: "en",
    createdAt: "2026-09-02T08:00:00.000Z",
    updatedAt: "2026-09-02T08:00:00.000Z",
  });
  return laptop;
}

/** Der gesamte Inhalt aller Tabellen als Text, um nach Namen zu suchen. */
async function dump(database: TeacherClassDatabase) {
  const rows = await Promise.all(
    database.tables.map(async (table) => [table.name, await table.toArray()]),
  );
  return JSON.stringify(rows);
}

describe("Umfang je Gerätetyp", () => {
  it("lässt „Mein Gerät“ unverändert", () => {
    expect(scopeForDevice(everything, "own")).toEqual(everything);
    expect(scopeForDevice(DEFAULT_SYNC_SCOPE, "own")).toEqual(
      DEFAULT_SYNC_SCOPE,
    );
  });

  it("beschränkt die Tafel auf Material, auch wenn alles gewählt war", () => {
    const scope = scopeForDevice(everything, "board");
    expect(scope).toEqual({
      material: true,
      assignments: false,
      classes: false,
      students: false,
      results: false,
      keys: false,
    });
    expect([...tablesInScope(scope)]).toEqual(["contentPackages"]);
  });

  it("schaltet auf der Tafel auch Material aus, wenn es abgewählt war", () => {
    const scope = scopeForDevice({ ...everything, material: false }, "board");
    expect(tablesInScope(scope).size).toBe(0);
  });
});

describe("Abgleich auf der Tafel", () => {
  it("übernimmt Material, aber keine Klassen, Schüler und Profile", async () => {
    const cloud = memoryCloud();
    const laptop = await seededLaptop();
    const board = await device("Tafel");
    await run(laptop, cloud, "own");
    await run(board, cloud, "board");

    expect((await board.material.list()).map((m) => m.title)).toEqual([
      "Diktat",
    ]);
    expect(await countTeacherPersonalData(board.database)).toMatchObject({
      total: 0,
    });
    // D3-5: Kein Schülername irgendwo in der Datenbank.
    const content = await dump(board.database);
    expect(content).not.toContain(KID_NAME);
    expect(content).not.toContain("Grundschule Nord");
    expect(content).not.toContain("lenz@example.org");
  });

  it("lässt die Personendaten in der Cloud stehen, wenn die Tafel schreibt", async () => {
    const cloud = memoryCloud();
    const laptop = await seededLaptop();
    const board = await device("Tafel");
    await run(laptop, cloud, "own");
    await run(board, cloud, "board");
    await board.material.put({
      id: "m2",
      revision: 1,
      title: "Neu von der Tafel",
      source: "Katze;cat",
      promptLocale: "de",
      answerLocale: "en",
      createdAt: "2026-09-03T08:00:00.000Z",
      updatedAt: "2026-09-03T08:00:00.000Z",
    });
    expect((await run(board, cloud, "board")).uploaded).toBe(true);

    const file = (await cloud.read(SYNC_FILE_V2))!;
    const payload = (await openEnvelope(file.text)).payload;
    const tables = payload.records.map((r) => r.table);
    expect(tables).toContain("members");
    expect(tables).toContain("classes");
    expect(payload.tombstones).toEqual([]);

    // Das Laptop bekommt das neue Material und behält seine Klasse.
    await run(laptop, cloud, "own");
    expect((await laptop.material.list()).map((m) => m.id).sort()).toEqual([
      "m1",
      "m2",
    ]);
    expect(await laptop.database.members.count()).toBe(1);
  });
});

describe("Personendaten vom Gerät löschen", () => {
  it("löscht alle Personendaten, lässt Material und Abgleich-Einstellungen", async () => {
    const cloud = memoryCloud();
    const laptop = await seededLaptop();
    await run(laptop, cloud, "own");
    expect(await countTeacherPersonalData(laptop.database)).toMatchObject({
      classes: 1,
      students: 1,
    });

    await deleteTeacherPersonalData(laptop.database);

    expect(await countTeacherPersonalData(laptop.database)).toMatchObject({
      total: 0,
    });
    expect(await dump(laptop.database)).not.toContain(KID_NAME);
    expect((await laptop.material.list()).map((m) => m.title)).toEqual([
      "Diktat",
    ]);
    const state = await createTeacherSyncStore(laptop.database).getState();
    expect(state.enabled).toBe(true);
    const stamps = await laptop.database.syncStamps.toArray();
    expect(stamps.map((stamp) => stamp.table)).toEqual(["contentPackages"]);
    expect(await laptop.database.tombstones.count()).toBe(0);
  });

  it("wird nicht als Löschung in die Cloud getragen; „Mein Gerät“ holt die Daten zurück", async () => {
    const cloud = memoryCloud();
    const laptop = await seededLaptop();
    await run(laptop, cloud, "own");
    await deleteTeacherPersonalData(laptop.database);

    await run(laptop, cloud, "board");
    await run(laptop, cloud, "own");

    // Die Cloud hat die Klasse nie verloren und das Gerät bekommt sie wieder.
    expect(await laptop.database.members.count()).toBe(1);
    expect((await laptop.database.members.get(KID_ID))?.displayName).toBe(
      KID_NAME,
    );
    const file = (await cloud.read(SYNC_FILE_V2))!;
    expect((await openEnvelope(file.text)).payload.tombstones).toEqual([]);
  });
});
