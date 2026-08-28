import { describe, expect, it } from "vitest";
import {
  createTeacherAssignmentCode,
  parseTeacherAssignmentCode,
  teacherAssignmentSchema,
} from "./teacher-workspace";

const assignment = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  title: "Wörter üben",
  instructions: "Bearbeite die zehn Lernwörter.",
  subject: "german" as const,
  materialId: null,
  classIds: ["123e4567-e89b-42d3-a456-426614174001"],
  dueDate: "2026-09-01",
  status: "assigned" as const,
  createdAt: "2026-08-28T10:00:00.000Z",
  updatedAt: "2026-08-28T11:00:00.000Z",
};

describe("teacher workspace", () => {
  it("round-trips an assignment without student identities", () => {
    const code = createTeacherAssignmentCode(
      teacherAssignmentSchema.parse(assignment),
    );
    expect(code).toContain("lernraum:assignment:");
    expect(parseTeacherAssignmentCode(code)).toMatchObject({
      assignmentId: assignment.id,
      title: assignment.title,
      classIds: assignment.classIds,
    });
    expect(code).not.toContain("student");
  });

  it("rejects duplicate class assignments", () => {
    expect(() =>
      teacherAssignmentSchema.parse({
        ...assignment,
        classIds: [assignment.classIds[0], assignment.classIds[0]],
      }),
    ).toThrow(/Klasse darf nur einmal/);
  });
});
