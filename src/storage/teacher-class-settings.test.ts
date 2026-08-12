import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  createTeacherClassSettingsRepository,
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
});
