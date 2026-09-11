import "fake-indexeddb/auto";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createTeacherAssignmentCode } from "../../src/domain/teacher-workspace";
import { LOCAL_DATA_AREAS } from "../../src/storage/local-data-boundaries";
import { createStudentClassesRepository } from "../../src/storage/student-classes";
import { StudentAssignments } from "./student-assignments";

afterEach(async () => {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(LOCAL_DATA_AREAS.classes);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
});

describe("student assignments", () => {
  it("imports a matching task into the personal learning room", async () => {
    const user = userEvent.setup();
    const classId = "123e4567-e89b-42d3-a456-426614174001";
    const membershipId = "123e4567-e89b-42d3-a456-426614174002";
    await createStudentClassesRepository().put({
      version: 1,
      classId,
      membershipId,
      className: "Klasse 8a",
      teacherName: "Frau Beispiel",
      schoolYear: "2026/27",
      displayName: "Alex",
      enrollmentToken: "0123456789abcdef0123456789abcdef",
      issuedAt: "2026-08-28T09:00:00.000Z",
    });
    const code = createTeacherAssignmentCode({
      id: "123e4567-e89b-42d3-a456-426614174000",
      title: "Lernwörter üben",
      instructions: "Bearbeite die Lernwort-Runde.",
      subject: "vocabulary",
      materialId: null,
      classIds: [classId],
      memberIds: [membershipId],
      dueDate: "",
      status: "assigned",
      createdAt: "2026-08-28T10:00:00.000Z",
      updatedAt: "2026-08-28T10:00:00.000Z",
    });
    render(<StudentAssignments />);

    fireEvent.change(screen.getByRole("textbox", { name: "Aufgabencode" }), {
      target: { value: code },
    });
    await user.click(
      screen.getByRole("button", { name: "Aufgabe übernehmen" }),
    );

    expect(await screen.findByText("Lernwörter üben")).toBeVisible();
    expect(
      screen.getByText(
        "„Lernwörter üben“ wurde in deinen Lernraum übernommen.",
      ),
    ).toBeVisible();
  });
});
