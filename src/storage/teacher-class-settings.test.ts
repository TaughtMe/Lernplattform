import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  createTeacherClassRepository,
  createTeacherClassSettingsRepository,
  createTeacherContentLibraryRepository,
  TeacherClassDatabase,
  toggleClassModule,
  type TeacherClassSettings,
} from "./teacher-class-settings";

const databases: TeacherClassDatabase[] = [];

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

describe("teacher class settings", () => {
  it("lists persisted classes after reopening the teacher area", async () => {
    const name = `teacher-${crypto.randomUUID()}`;
    const firstDatabase = new TeacherClassDatabase(name);
    const firstRepository = createTeacherClassRepository(firstDatabase);
    await firstRepository.put({
      id: crypto.randomUUID(),
      name: "Testklasse 1",
      teacherName: "Testlehrkraft",
      schoolYear: "2026/27",
      enabledModules: ["vocabulary"],
      createdAt: "2026-08-25T10:00:00.000Z",
      updatedAt: "2026-08-25T10:00:00.000Z",
    });
    firstDatabase.close();

    const reopenedDatabase = new TeacherClassDatabase(name);
    databases.push(reopenedDatabase);
    await expect(
      createTeacherClassRepository(reopenedDatabase).list(),
    ).resolves.toMatchObject([{ name: "Testklasse 1" }]);
  });

  it("stores module choices in the separate teacher area", async () => {
    const database = new TeacherClassDatabase(`teacher-${crypto.randomUUID()}`);
    databases.push(database);
    const repository = createTeacherClassSettingsRepository(database);
    const settings: TeacherClassSettings = {
      id: "klasse-7b",
      enabledModules: ["vocabulary", "typing"],
      updatedAt: "2026-08-12T10:00:00.000Z",
    };

    await repository.put(settings);
    await expect(repository.get("klasse-7b")).resolves.toEqual(settings);
  });

  it("enables and disables modules without allowing an empty class", () => {
    expect(toggleClassModule(["vocabulary", "typing"], "typing")).toEqual([
      "vocabulary",
    ]);
    expect(toggleClassModule(["vocabulary"], "vocabulary")).toEqual([
      "vocabulary",
    ]);
    expect(toggleClassModule(["vocabulary"], "mathematics")).toEqual([
      "vocabulary",
      "mathematics",
    ]);
  });

  it("stores and restores the local teacher content library", async () => {
    const name = `teacher-${crypto.randomUUID()}`;
    const firstDatabase = new TeacherClassDatabase(name);
    await createTeacherContentLibraryRepository(firstDatabase).put({
      id: "package-1",
      revision: 1,
      title: "Englisch · Schule",
      source: "school;Schule",
      promptLocale: "en",
      answerLocale: "de",
      createdAt: "2026-08-25T10:00:00.000Z",
      updatedAt: "2026-08-25T11:00:00.000Z",
    });
    firstDatabase.close();

    const reopenedDatabase = new TeacherClassDatabase(name);
    databases.push(reopenedDatabase);
    const repository = createTeacherContentLibraryRepository(reopenedDatabase);
    await expect(repository.list()).resolves.toMatchObject([
      { id: "package-1", revision: 1, title: "Englisch · Schule" },
    ]);
    await repository.remove("package-1");
    await expect(repository.list()).resolves.toEqual([]);
  });
});
