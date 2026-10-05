import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import {
  NO_ENROLLMENT_KEY,
  DEFAULT_SYNC_SCOPE,
} from "../integrations/cloud-sync/model";
import {
  createTeacherClassRepository,
  createTeacherContentLibraryRepository,
  createTeacherWorkspaceRepository,
  TeacherClassDatabase,
} from "./teacher-class-settings";
import { createTeacherSyncStore } from "./teacher-sync-store";
import {
  recordsFromBackup,
  rowFromRecord,
  toLocalRow,
} from "./teacher-sync-rows";

const databases: TeacherClassDatabase[] = [];
afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

function open() {
  const database = new TeacherClassDatabase(`store-${crypto.randomUUID()}`);
  databases.push(database);
  return database;
}

const CLASS_ID = "123e4567-e89b-42d3-a456-426614174001";
const KID_ID = "123e4567-e89b-42d3-a456-426614174002";
const TOKEN = "0123456789abcdef0123456789abcdef";

const klasse = (over = {}) => ({
  id: CLASS_ID,
  name: "5b",
  teacherName: "Frau Lenz",
  schoolYear: "2026/27",
  enabledModules: ["vocabulary" as const],
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-01T08:00:00.000Z",
  ...over,
});

const material = (title: string, updatedAt: string) => ({
  id: "m1",
  revision: 1,
  title,
  source: "Hund;dog",
  promptLocale: "de",
  answerLocale: "en",
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt,
});

const backupOf = (over: Record<string, unknown> = {}) => ({
  version: 1 as const,
  exportedAt: "2026-10-01T10:00:00.000Z",
  profile: null,
  classes: [],
  members: [],
  materials: [],
  assignments: [],
  submissions: [],
  classSettings: [],
  ...over,
});

describe("Dexie version 6", () => {
  it("upgrades an existing version 5 database without touching its data", async () => {
    const name = `upgrade-${crypto.randomUUID()}`;
    const old = new Dexie(name);
    old.version(5).stores({
      classSettings: "id, updatedAt",
      classes: "id, updatedAt",
      members: "id, classId, createdAt",
      contentPackages: "id, updatedAt",
      profiles: "id, updatedAt",
      assignments: "id, status, dueDate, updatedAt, *classIds, *memberIds",
      submissions: "id, assignmentId, classId, membershipId, receivedAt",
    });
    await old.table("classes").put(klasse());
    old.close();
    const database = new TeacherClassDatabase(name);
    databases.push(database);
    expect(await database.classes.get(CLASS_ID)).toMatchObject({ name: "5b" });
    expect(await database.syncStamps.count()).toBe(0);
    expect((await createTeacherSyncStore(database).getState()).enabled).toBe(
      false,
    );
  });
});

describe("sync state", () => {
  it("creates one device identity even when read in parallel", async () => {
    const store = createTeacherSyncStore(open());
    const [first, second] = await Promise.all([
      store.getState(),
      store.getState(),
    ]);
    expect(first.device).toBe(second.device);
    expect(first.scope).toEqual(DEFAULT_SYNC_SCOPE);
    const patched = await store.patchState({
      deviceName: "Tafel",
      enabled: true,
    });
    expect(patched).toMatchObject({
      deviceName: "Tafel",
      device: first.device,
    });
    expect((await store.getState()).enabled).toBe(true);
  });
});

describe("rows", () => {
  it("keeps secrets out of the content and only exposes them with keys on", () => {
    const seal = {
      privateJwk: {
        kty: "EC" as const,
        crv: "P-256" as const,
        x: "x",
        y: "y",
        d: "d",
      },
      publicKey: "p",
    };
    const course = { ...klasse(), seal };
    const without = toLocalRow("classes", course, { keys: false });
    expect(without.data).not.toHaveProperty("seal");
    expect(without.secrets).toBeUndefined();
    expect(toLocalRow("classes", course, { keys: true }).secrets).toEqual({
      seal,
    });
    const member = {
      id: KID_ID,
      classId: CLASS_ID,
      displayName: "Fuchs",
      enrollmentToken: TOKEN,
      createdAt: "2026-09-01T08:00:00.000Z",
    };
    expect(toLocalRow("members", member, { keys: false }).data).toMatchObject({
      enrollmentToken: NO_ENROLLMENT_KEY,
    });
    expect(toLocalRow("members", member, { keys: true }).secrets).toEqual({
      enrollmentToken: TOKEN,
    });
    expect(
      toLocalRow(
        "members",
        { ...member, enrollmentToken: NO_ENROLLMENT_KEY },
        { keys: true },
      ).secrets,
    ).toBeUndefined();
  });

  it("restores rows without replacing an existing key by a placeholder", () => {
    const placeholder = {
      table: "members" as const,
      data: { id: KID_ID, enrollmentToken: NO_ENROLLMENT_KEY },
    };
    expect(
      rowFromRecord(placeholder, { enrollmentToken: TOKEN }, { keys: false })[
        "enrollmentToken"
      ],
    ).toBe(TOKEN);
    expect(
      rowFromRecord(placeholder, undefined, { keys: false })["enrollmentToken"],
    ).toBe(NO_ENROLLMENT_KEY);
    expect(
      rowFromRecord(
        { ...placeholder, secrets: { enrollmentToken: TOKEN } },
        undefined,
        { keys: true },
      )["enrollmentToken"],
    ).toBe(TOKEN);
    expect(
      rowFromRecord(
        { ...placeholder, secrets: { enrollmentToken: TOKEN } },
        undefined,
        { keys: false },
      )["enrollmentToken"],
    ).toBe(NO_ENROLLMENT_KEY);
    const course = { table: "classes" as const, data: { id: CLASS_ID } };
    expect(
      rowFromRecord(course, { seal: "lokal" }, { keys: false })["seal"],
    ).toBe("lokal");
    expect(
      rowFromRecord(course, undefined, { keys: false }),
    ).not.toHaveProperty("seal");
  });

  it("derives record times from updatedAt, receivedAt or createdAt", () => {
    const records = recordsFromBackup(
      backupOf({
        classes: [klasse()],
        profile: {
          id: "local-teacher",
          displayName: "Lenz",
          school: "",
          email: "",
          subjects: [],
          updatedAt: "2026-09-10T08:00:00.000Z",
        },
      }),
      { ...DEFAULT_SYNC_SCOPE, students: true },
      "datei",
    );
    expect(records.map((r) => r.table).sort()).toEqual(["classes", "profiles"]);
    expect(records.find((r) => r.table === "classes")?.hlc).toMatch(
      /^\d{15}-00000-datei$/,
    );
  });
});

describe("importData merges instead of overwriting", () => {
  it("keeps a newer local version and takes a newer file version", async () => {
    const database = open();
    const library = createTeacherContentLibraryRepository(database);
    const workspace = createTeacherWorkspaceRepository(database);
    await library.put(material("Lokal neu", "2026-10-03T08:00:00.000Z"));
    await workspace.importData(
      backupOf({
        materials: [material("Datei alt", "2026-10-01T08:00:00.000Z")],
      }),
    );
    expect((await library.get("m1"))?.title).toBe("Lokal neu");
    const store = createTeacherSyncStore(database);
    expect(await store.listConflicts()).toHaveLength(0);

    await workspace.importData(
      backupOf({
        materials: [material("Datei neu", "2026-10-04T08:00:00.000Z")],
      }),
    );
    expect((await library.get("m1"))?.title).toBe("Datei neu");
    // Die überschriebene lokale Fassung bleibt als Konflikt erhalten.
    expect(await store.listConflicts()).toMatchObject([
      { kind: "changed", other: { data: { title: "Lokal neu" } } },
    ]);
  });

  it("does not bring back what was deleted after it was last synced", async () => {
    const database = open();
    const library = createTeacherContentLibraryRepository(database);
    const workspace = createTeacherWorkspaceRepository(database);
    const store = createTeacherSyncStore(database);
    await library.put(material("Eins", "2026-09-02T08:00:00.000Z"));
    await workspace.importData(backupOf());
    // Einmal abgeglichen ...
    const state = await store.getState();
    await store.patchState({ enabled: false });
    expect(state.device).toBeTruthy();
    const local = await store.prepare({
      scope: { ...DEFAULT_SYNC_SCOPE },
      device: state.device,
      tick: () => "000000001800000000-00000-x".slice(3),
    });
    await store.apply(
      {
        records: local.records.map((r) => ({
          table: r.table,
          id: r.id,
          hlc: r.hlc,
          device: r.device,
          hash: r.hash,
          data: r.data,
        })),
        put: [],
        remove: [],
        tombstones: [],
        needsUpload: false,
        conflicts: [],
      },
      { scope: { ...DEFAULT_SYNC_SCOPE }, resolved: [] },
    );
    await store.confirm(
      {
        records: local.records,
        put: [],
        needsUpload: false,
      },
      { ...DEFAULT_SYNC_SCOPE },
    );
    // ... dann gelöscht.
    await library.remove("m1");
    await workspace.importData(
      backupOf({ materials: [material("Eins", "2026-09-02T08:00:00.000Z")] }),
    );
    expect(await library.get("m1")).toBeUndefined();
  });

  it("reports a conflict when both versions changed", async () => {
    const database = open();
    const library = createTeacherContentLibraryRepository(database);
    const workspace = createTeacherWorkspaceRepository(database);
    await library.put(material("Lokal", "2026-10-03T08:00:00.000Z"));
    await workspace.importData(backupOf());
    // Erster Import hat Stempel gesetzt, aber noch keinen Abgleichstand.
    const store = createTeacherSyncStore(database);
    const state = await store.getState();
    await store.patchState({ enabled: true });
    expect(state.enabled).toBe(false);
    await workspace.importData(
      backupOf({ materials: [material("Datei", "2026-10-04T08:00:00.000Z")] }),
    );
    expect((await library.get("m1"))?.title).toBe("Datei");
    expect((await store.getState()).dirty).toBe(true);
    expect(await store.listConflicts()).toHaveLength(1);
  });

  it("round-trips class settings through export and import", async () => {
    const database = open();
    const workspace = createTeacherWorkspaceRepository(database);
    await database.classSettings.put({
      id: CLASS_ID,
      enabledModules: ["vocabulary"],
      updatedAt: "2026-09-01T08:00:00.000Z",
    });
    const backup = await workspace.exportData();
    expect(backup.classSettings).toHaveLength(1);
    const other = open();
    await createTeacherWorkspaceRepository(other).importData(backup);
    expect(await other.classSettings.get(CLASS_ID)).toMatchObject({
      enabledModules: ["vocabulary"],
    });
    // Ältere Sicherungen ohne Klasseneinstellungen bleiben lesbar.
    const legacy: Record<string, unknown> = { ...backup };
    delete legacy["classSettings"];
    await expect(
      createTeacherWorkspaceRepository(open()).importData(legacy),
    ).resolves.toMatchObject({ classSettings: [] });
  });

  it("returns the merged profile", async () => {
    const database = open();
    const profile = (displayName: string, updatedAt: string) => ({
      id: "local-teacher" as const,
      displayName,
      school: "",
      email: "",
      subjects: [],
      updatedAt,
    });
    await database.profiles.put(profile("Neu", "2026-10-03T08:00:00.000Z"));
    const result = await createTeacherWorkspaceRepository(database).importData(
      backupOf({ profile: profile("Alt", "2026-10-01T08:00:00.000Z") }),
    );
    expect(result.profile?.displayName).toBe("Neu");
  });
});

describe("apply", () => {
  it("removes the children of a class deleted on another device", async () => {
    const database = open();
    const classes = createTeacherClassRepository(database);
    await classes.put(klasse());
    await classes.putMember({
      id: KID_ID,
      classId: CLASS_ID,
      displayName: "Fuchs",
      enrollmentToken: TOKEN,
      createdAt: "2026-09-01T08:00:00.000Z",
    });
    const store = createTeacherSyncStore(database);
    await store.apply(
      {
        records: [],
        put: [],
        remove: [{ table: "classes", id: CLASS_ID }],
        tombstones: [],
        needsUpload: false,
        conflicts: [],
      },
      { scope: { ...DEFAULT_SYNC_SCOPE }, resolved: ["x"] },
    );
    expect(await database.classes.count()).toBe(0);
    expect(await database.members.count()).toBe(0);
    expect((await store.getState()).resolved).toEqual(["x"]);
  });

  it("skips records that fail validation and does not stamp them", async () => {
    const database = open();
    const store = createTeacherSyncStore(database);
    const bad = {
      table: "contentPackages" as const,
      id: "kaputt",
      hlc: "000000000000001-00000-x",
      device: "x",
      hash: "0".repeat(64),
      data: { id: "kaputt" },
    };
    const result = await store.apply(
      {
        records: [bad],
        put: [bad],
        remove: [],
        tombstones: [],
        needsUpload: false,
        conflicts: [],
      },
      { scope: { ...DEFAULT_SYNC_SCOPE }, resolved: [] },
    );
    expect(result.rejected).toEqual(["contentPackages:kaputt"]);
    expect(await database.contentPackages.count()).toBe(0);
    expect(await database.syncStamps.count()).toBe(0);
  });
});
