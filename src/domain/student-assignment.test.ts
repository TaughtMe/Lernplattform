import { describe, expect, it } from "vitest";
import { acceptStudentAssignment } from "./student-assignment";
import {
  createStudentPerformanceCode,
  createTeacherAssignmentCode,
  parseStudentPerformanceCode,
  verifyStudentPerformance,
  type TeacherAssignment,
} from "./teacher-workspace";

const classId = "123e4567-e89b-42d3-a456-426614174001";
const membershipId = "123e4567-e89b-42d3-a456-426614174002";
const otherMembershipId = "123e4567-e89b-42d3-a456-426614174003";
const enrollmentToken = "0123456789abcdef0123456789abcdef";

const assignment: TeacherAssignment = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  title: "Lernwörter",
  instructions: "Bearbeite die Runde vollständig.",
  subject: "vocabulary",
  materialId: null,
  classIds: [classId],
  memberIds: [membershipId],
  dueDate: "2026-09-01",
  status: "assigned",
  createdAt: "2026-08-28T10:00:00.000Z",
  updatedAt: "2026-08-28T10:00:00.000Z",
};

const enrollment = {
  version: 1 as const,
  classId,
  membershipId,
  className: "7b",
  teacherName: "Frau Test",
  schoolYear: "2026/27",
  displayName: "Alex",
  enrollmentToken,
  issuedAt: "2026-08-28T09:00:00.000Z",
};

describe("student assignments", () => {
  it("accepts an individually assigned task for the matching membership", () => {
    expect(
      acceptStudentAssignment(createTeacherAssignmentCode(assignment), [
        enrollment,
      ]),
    ).toMatchObject({
      id: assignment.id,
      membershipId,
      status: "new",
    });
  });

  it("rejects a task assigned to another student", () => {
    expect(() =>
      acceptStudentAssignment(
        createTeacherAssignmentCode({
          ...assignment,
          memberIds: [otherMembershipId],
        }),
        [enrollment],
      ),
    ).toThrow("keiner Klasse auf diesem Gerät zugeteilt");
  });

  it("signs performance letters and detects tampering", async () => {
    const code = await createStudentPerformanceCode(
      {
        version: 1,
        assignmentId: assignment.id,
        classId,
        membershipId,
        sequence: 1,
        completedAt: "2026-08-28T11:00:00.000Z",
        result: "completed",
      },
      enrollmentToken,
    );
    const signed = parseStudentPerformanceCode(code);

    await expect(
      verifyStudentPerformance(signed, enrollmentToken),
    ).resolves.toBe(true);
    await expect(
      verifyStudentPerformance(
        { ...signed, completedAt: "2026-08-28T12:00:00.000Z" },
        enrollmentToken,
      ),
    ).resolves.toBe(false);
  });
});
