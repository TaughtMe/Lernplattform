import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { createTeacherAssignmentDraft } from "../domain/teacher-assignment";
import {
  createTeacherAssignmentRepository,
  TeacherAssignmentDatabase,
} from "./teacher-assignments";

const databases: TeacherAssignmentDatabase[] = [];
afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

describe("teacher assignment repository", () => {
  it("stores, lists and removes drafts for one class", async () => {
    const database = new TeacherAssignmentDatabase(
      `teacher-assignments-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = createTeacherAssignmentRepository(database);
    const draft = createTeacherAssignmentDraft({
      classId: "klasse-7b",
      title: "School words · Teil 2",
      description: "Übe die nächsten zehn Vokabeln.",
      module: "vocabulary",
      placement: "assignments",
      now: "2026-08-12T10:00:00.000Z",
      id: "assignment-1",
    });

    await repository.put(draft);
    await expect(repository.listForClass("klasse-7b")).resolves.toEqual([
      draft,
    ]);
    await repository.remove(draft.id);
    await expect(repository.listForClass("klasse-7b")).resolves.toEqual([]);
  });
});
