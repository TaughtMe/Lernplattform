import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  createTeacherClassRepository,
  createTeacherClassSettingsRepository,
  createTeacherContentLibraryRepository,
  createTeacherAssignmentRepository,
  createTeacherProfileRepository,
  createTeacherSubmissionRepository,
  TeacherClassDatabase,
  toggleClassModule,
  type TeacherClassSettings,
} from "./teacher-class-settings";
import { createStudentPerformanceCode } from "../domain/teacher-workspace";

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
  it("stores a signed submission idempotently and rejects older letters", async () => {
    const database = new TeacherClassDatabase(`teacher-${crypto.randomUUID()}`);
    databases.push(database);
    const classId = "123e4567-e89b-42d3-a456-426614174001";
    const membershipId = "123e4567-e89b-42d3-a456-426614174002";
    const assignmentId = "123e4567-e89b-42d3-a456-426614174000";
    const enrollmentToken = "0123456789abcdef0123456789abcdef";
    const classes = createTeacherClassRepository(database);
    await classes.put({
      id: classId,
      name: "7b",
      teacherName: "Frau Test",
      schoolYear: "2026/27",
      enabledModules: ["vocabulary"],
      createdAt: "2026-08-28T09:00:00.000Z",
      updatedAt: "2026-08-28T09:00:00.000Z",
    });
    await classes.putMember({
      id: membershipId,
      classId,
      displayName: "Alex",
      enrollmentToken,
      createdAt: "2026-08-28T09:00:00.000Z",
    });
    await createTeacherAssignmentRepository(database).put({
      id: assignmentId,
      title: "Lernwörter",
      instructions: "Runde bearbeiten.",
      subject: "vocabulary",
      materialId: null,
      classIds: [classId],
      memberIds: [membershipId],
      dueDate: "",
      status: "assigned",
      createdAt: "2026-08-28T10:00:00.000Z",
      updatedAt: "2026-08-28T10:00:00.000Z",
    });
    const repository = createTeacherSubmissionRepository(database);
    const makeCode = (sequence: number) =>
      createStudentPerformanceCode(
        {
          version: 1,
          assignmentId,
          classId,
          membershipId,
          sequence,
          completedAt: `2026-08-28T1${sequence}:00:00.000Z`,
          result: "completed",
        },
        enrollmentToken,
      );
    const newer = await makeCode(2);

    await expect(repository.recordCode(newer)).resolves.toMatchObject({
      status: "accepted",
    });
    await expect(repository.recordCode(newer)).resolves.toMatchObject({
      status: "duplicate",
    });
    await expect(
      repository.recordCode(await makeCode(1)),
    ).resolves.toMatchObject({ status: "stale" });
    await expect(
      repository.listByAssignment(assignmentId),
    ).resolves.toHaveLength(1);
  });

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

  it("stores teacher profiles and assignments in the versioned database", async () => {
    const database = new TeacherClassDatabase(`teacher-${crypto.randomUUID()}`);
    databases.push(database);
    await createTeacherProfileRepository(database).put({
      id: "local-teacher",
      displayName: "Frau Test",
      school: "Testschule",
      email: "",
      subjects: ["Deutsch"],
      updatedAt: "2026-08-28T10:00:00.000Z",
    });
    await createTeacherAssignmentRepository(database).put({
      id: "123e4567-e89b-42d3-a456-426614174000",
      title: "Lernwörter",
      instructions: "Runde vollständig bearbeiten.",
      subject: "german",
      materialId: null,
      classIds: ["123e4567-e89b-42d3-a456-426614174001"],
      memberIds: [],
      dueDate: "",
      status: "assigned",
      createdAt: "2026-08-28T10:00:00.000Z",
      updatedAt: "2026-08-28T10:00:00.000Z",
    });

    await expect(
      createTeacherProfileRepository(database).get(),
    ).resolves.toMatchObject({
      displayName: "Frau Test",
    });
    await expect(
      createTeacherAssignmentRepository(database).list(),
    ).resolves.toMatchObject([
      {
        title: "Lernwörter",
        classIds: ["123e4567-e89b-42d3-a456-426614174001"],
      },
    ]);
  });
});
