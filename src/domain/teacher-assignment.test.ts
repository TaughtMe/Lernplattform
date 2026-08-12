import { describe, expect, it } from "vitest";
import {
  createTeacherAssignmentDraft,
  markAssignmentReady,
} from "./teacher-assignment";

const input = {
  classId: "klasse-7b",
  title: "School words · Teil 2",
  description: "Übe die nächsten zehn Vokabeln.",
  module: "vocabulary" as const,
  placement: "assignments" as const,
  now: "2026-08-12T10:00:00.000Z",
  id: "assignment-1",
};

describe("teacher assignment", () => {
  it("creates a ranking-eligible draft", () => {
    expect(createTeacherAssignmentDraft(input)).toMatchObject({
      status: "draft",
      rankingEligible: true,
      placement: "assignments",
    });
  });

  it("omits an empty optional due label", () => {
    expect(
      createTeacherAssignmentDraft({ ...input, dueLabel: "" }),
    ).not.toHaveProperty("dueLabel");
  });

  it("marks a validated draft ready without changing its identity", () => {
    const draft = createTeacherAssignmentDraft(input);
    expect(
      markAssignmentReady(draft, "2026-08-12T11:00:00.000Z"),
    ).toMatchObject({
      id: "assignment-1",
      status: "ready",
      updatedAt: "2026-08-12T11:00:00.000Z",
    });
  });
});
