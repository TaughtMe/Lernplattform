import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { classEnrollmentSchema } from "../domain/class-enrollment";
import {
  createStudentAssignmentRepository,
  createStudentClassesRepository,
  StudentClassesDatabase,
} from "./student-classes";

const databases: StudentClassesDatabase[] = [];

afterEach(async () => {
  await Promise.all(databases.map((database) => database.delete()));
  databases.length = 0;
});

describe("student class storage", () => {
  it("keeps assignments tied to a locally known class membership", async () => {
    const database = new StudentClassesDatabase(
      `student-classes-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const classes = createStudentClassesRepository(database);
    const assignments = createStudentAssignmentRepository(database);
    const membership = {
      version: 1 as const,
      classId: "123e4567-e89b-42d3-a456-426614174001",
      membershipId: "123e4567-e89b-42d3-a456-426614174002",
      className: "Klasse 7b",
      teacherName: "Frau Beispiel",
      schoolYear: "2026/27",
      displayName: "Léa",
      enrollmentToken: "0123456789abcdef0123456789abcdef",
      issuedAt: "2026-08-30T10:05:00.000Z",
      enabledModules: ["vocabulary" as const],
    };
    await classes.put(membership);

    const assignment = {
      id: "123e4567-e89b-42d3-a456-426614174003",
      membershipId: membership.membershipId,
      classId: membership.classId,
      title: "Unit 1",
      instructions: "Übe die Wörter.",
      subject: "vocabulary" as const,
      materialId: null,
      dueDate: "",
      issuedAt: "2026-08-30T10:10:00.000Z",
      status: "new" as const,
      completedAt: null,
      sequence: 0,
    };
    await assignments.put(assignment);
    expect(await assignments.get(assignment.id)).toEqual(assignment);

    await expect(
      assignments.put({
        ...assignment,
        id: "123e4567-e89b-42d3-a456-426614174004",
        classId: "123e4567-e89b-42d3-a456-426614174005",
      }),
    ).rejects.toThrow("keiner bekannten Klasseneinschreibung");

    await classes.removeClass(membership.classId);
    expect(await assignments.list()).toEqual([]);
  });

  it("ersetzt eine Mitgliedschaft samt Freigabe beim erneuten Scannen", async () => {
    const database = new StudentClassesDatabase(
      `student-classes-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const classes = createStudentClassesRepository(database);
    const membership = {
      version: 1 as const,
      classId: "123e4567-e89b-42d3-a456-426614174001",
      membershipId: "123e4567-e89b-42d3-a456-426614174002",
      className: "Klasse 7b",
      teacherName: "Frau Beispiel",
      schoolYear: "2026/27",
      displayName: "Léa",
      enrollmentToken: "0123456789abcdef0123456789abcdef",
      issuedAt: "2026-08-30T10:05:00.000Z",
      sealPublicKey: "A".repeat(122),
      writingReliefGrant: {
        v: 1 as const,
        classId: "123e4567-e89b-42d3-a456-426614174001",
        membershipId: "123e4567-e89b-42d3-a456-426614174002",
        writingRelief: true as const,
        issuedAt: "2026-10-02T08:00:00.000Z",
      },
      writingReliefSignature: "B".repeat(86),
    };
    await classes.put(membership);
    await expect(classes.list()).resolves.toEqual([membership]);

    await classes.put(
      classEnrollmentSchema.parse(
        Object.fromEntries(
          Object.entries(membership).filter(
            ([key]) =>
              key !== "writingReliefGrant" && key !== "writingReliefSignature",
          ),
        ),
      ),
    );
    const [stored] = await classes.list();
    expect(stored).not.toHaveProperty("writingReliefGrant");
    expect(stored).not.toHaveProperty("writingReliefSignature");
    expect(await classes.list()).toHaveLength(1);
  });
});
