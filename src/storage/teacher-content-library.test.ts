import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { TeacherClass } from "../domain/class-enrollment";
import {
  createTeacherContentLibraryFile,
  parseTeacherContentLibraryFile,
  type TeacherContentPackage,
} from "../domain/teacher-content-library";
import {
  createTeacherClassRepository,
  createTeacherContentLibraryRepository,
  createTeacherWorkspaceRepository,
  TeacherClassDatabase,
} from "./teacher-class-settings";

const CLASS_A = "123e4567-e89b-42d3-a456-426614174001";
const CLASS_B = "123e4567-e89b-42d3-a456-426614174002";

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
  const database = new TeacherClassDatabase(`teacher-${crypto.randomUUID()}`);
  databases.push(database);
  return database;
}

const entry = (id: string, extra: Partial<TeacherContentPackage> = {}) =>
  ({
    id,
    revision: 3,
    title: id,
    source: "go;gehen",
    promptLocale: "en",
    answerLocale: "de",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-02T10:00:00.000Z",
    ...extra,
  }) satisfies TeacherContentPackage;

const course = (id: string, archivedAt?: string): TeacherClass => ({
  id,
  name: `Klasse ${id.slice(-1)}`,
  teacherName: "Frau Test",
  schoolYear: "2026/27",
  enabledModules: ["vocabulary"],
  createdAt: "2026-08-25T10:00:00.000Z",
  updatedAt: "2026-08-25T10:00:00.000Z",
  ...(archivedAt ? { archivedAt } : {}),
});

describe("Ablage nach Klassen", () => {
  it("filtert nach Klasse und „ohne“ und beachtet archivierte Klassen", async () => {
    const database = open();
    const classes = createTeacherClassRepository(database);
    await classes.put(course(CLASS_A));
    await classes.put(course(CLASS_B, "2026-09-01T10:00:00.000Z"));
    const library = createTeacherContentLibraryRepository(database);
    await library.putMany([
      entry("alt"),
      entry("a", { classIds: [CLASS_A] }),
      entry("nur-archiviert", { classIds: [CLASS_B] }),
      entry("beide", { classIds: [CLASS_A, CLASS_B] }),
    ]);

    expect(
      (await library.listForClass(CLASS_A)).map((e) => e.id).sort(),
    ).toEqual(["a", "beide"]);
    expect(
      (await library.listForClass("ohne")).map((e) => e.id).sort(),
    ).toEqual(["alt", "nur-archiviert"]);
  });

  it("wechselt durch Zuordnen und Entfernen aller Klassen zwischen den Ansichten", async () => {
    const database = open();
    await createTeacherClassRepository(database).put(course(CLASS_A));
    const library = createTeacherContentLibraryRepository(database);
    await library.put(entry("x"));

    await expect(
      library.assignClasses(
        "x",
        [CLASS_A, CLASS_A],
        "2026-09-03T10:00:00.000Z",
      ),
    ).resolves.toBe(true);
    expect((await library.listForClass(CLASS_A)).map((e) => e.id)).toEqual([
      "x",
    ]);
    expect(await library.listForClass("ohne")).toEqual([]);
    // Doppelte Häkchen zählen einmal; Revision bleibt, nur updatedAt ändert sich.
    expect(await library.get("x")).toMatchObject({
      classIds: [CLASS_A],
      revision: 3,
      updatedAt: "2026-09-03T10:00:00.000Z",
    });

    await library.assignClasses("x", []);
    expect(await library.listForClass(CLASS_A)).toEqual([]);
    expect((await library.listForClass("ohne")).map((e) => e.id)).toEqual([
      "x",
    ]);
    await expect(library.assignClasses("fehlt", [CLASS_A])).resolves.toBe(
      false,
    );
  });

  it("weist ungültige Klassen-IDs beim Zuordnen ab", async () => {
    const library = createTeacherContentLibraryRepository(open());
    await library.put(entry("x"));
    await expect(library.assignClasses("x", ["keine-id"])).rejects.toThrow();
    expect((await library.get("x"))?.classIds).toBeUndefined();
  });

  it("merkt den letzten Raumstart, ohne Titel oder Revision zu ändern", async () => {
    const library = createTeacherContentLibraryRepository(open());
    await library.put(entry("x"));
    await expect(
      library.markUsed("x", "2026-09-10T08:00:00.000Z"),
    ).resolves.toBe(true);
    expect(await library.get("x")).toMatchObject({
      lastUsedAt: "2026-09-10T08:00:00.000Z",
      revision: 3,
      updatedAt: "2026-09-02T10:00:00.000Z",
    });
    await expect(
      library.markUsed("fehlt", "2026-09-10T08:00:00.000Z"),
    ).resolves.toBe(false);
    await expect(library.markUsed("x", "gestern")).rejects.toThrow();
  });

  it("sortiert die Ablage nach letzter Nutzung vor Änderung", async () => {
    const library = createTeacherContentLibraryRepository(open());
    await library.putMany([
      entry("neu-geaendert", { updatedAt: "2026-09-08T10:00:00.000Z" }),
      entry("benutzt", { lastUsedAt: "2026-09-12T10:00:00.000Z" }),
    ]);
    expect((await library.listForClass("ohne")).map((e) => e.id)).toEqual([
      "benutzt",
      "neu-geaendert",
    ]);
  });
});

describe("Sicherung und Export mit neuen Feldern", () => {
  it("übersteht Export und Import der Gesamtsicherung mit und ohne neue Felder", async () => {
    const source = open();
    const library = createTeacherContentLibraryRepository(source);
    await library.putMany([
      entry("alt"),
      entry("neu", {
        kind: "text",
        classIds: [CLASS_A],
        lastUsedAt: "2026-09-10T10:00:00.000Z",
        textSplit: "zeile",
      }),
    ]);
    const backup = await createTeacherWorkspaceRepository(source).exportData();

    const target = open();
    await createTeacherWorkspaceRepository(target).importData(backup);
    const restored = await createTeacherContentLibraryRepository(target).list();
    expect(restored.find((e) => e.id === "alt")?.kind).toBeUndefined();
    expect(restored.find((e) => e.id === "neu")).toMatchObject({
      kind: "text",
      classIds: [CLASS_A],
      textSplit: "zeile",
    });
  });

  it("übersteht die Bibliotheksdatei als Roundtrip", () => {
    const packages = [
      entry("alt"),
      entry("neu", { kind: "math", classIds: [CLASS_A, CLASS_B] }),
    ];
    const file = createTeacherContentLibraryFile(
      packages,
      "2026-09-10T10:00:00.000Z",
    );
    expect(
      parseTeacherContentLibraryFile(JSON.parse(JSON.stringify(file))).packages,
    ).toEqual(file.packages);
  });
});
