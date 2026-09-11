import "fake-indexeddb/auto";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  createEnrollmentCode,
  createEnrollmentLink,
  type ClassMember,
  type TeacherClass,
} from "../../src/domain/class-enrollment";
import { LOCAL_DATA_AREAS } from "../../src/storage/local-data-boundaries";
import { StudentClassEnrollment } from "./student-class-enrollment";

const course: TeacherClass = {
  id: "123e4567-e89b-42d3-a456-426614174001",
  name: "Klasse 7b",
  teacherName: "Frau Beispiel",
  schoolYear: "2026/27",
  enabledModules: ["vocabulary"],
  createdAt: "2026-08-30T10:00:00.000Z",
  updatedAt: "2026-08-30T10:00:00.000Z",
};

const member: ClassMember = {
  id: "123e4567-e89b-42d3-a456-426614174002",
  classId: course.id,
  displayName: "Léa",
  enrollmentToken: "0123456789abcdef0123456789abcdef",
  createdAt: "2026-08-30T10:05:00.000Z",
};

const enrollmentCode = createEnrollmentCode(course, member);

afterEach(async () => {
  window.history.replaceState(null, "", "/lernen/klasse");
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(LOCAL_DATA_AREAS.classes);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
});

describe("StudentClassEnrollment", () => {
  it("reads an enrollment link, asks for the name and stores only after confirmation", async () => {
    const user = userEvent.setup();
    const link = new URL(
      createEnrollmentLink("https://lernraum.example", enrollmentCode),
    );
    window.history.replaceState(null, "", `${link.pathname}${link.hash}`);

    render(<StudentClassEnrollment />);

    expect(
      await screen.findByRole("heading", { name: "Bist du Léa?" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /Klasse 7b/ }),
    ).not.toBeInTheDocument();
    expect(window.location.hash).toBe("");

    await user.click(screen.getByRole("button", { name: "Ja, ich bin Léa" }));

    expect(
      await screen.findByRole("link", { name: /Klasse 7b/ }),
    ).toBeVisible();
    expect(
      screen.getByText("Klasse 7b wurde deinem Lernraum hinzugefügt."),
    ).toBeVisible();
  });

  it("checks a manually entered code and lets the student reject the identity", async () => {
    const user = userEvent.setup();
    render(<StudentClassEnrollment />);
    const input = await screen.findByRole("textbox", {
      name: "Einschreibecode",
    });

    await user.click(input);
    await user.paste(enrollmentCode);
    await user.click(screen.getByRole("button", { name: "Code prüfen" }));
    expect(screen.getByRole("heading", { name: "Bist du Léa?" })).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Nein, anderen Code verwenden" }),
    );
    const changedInput = await screen.findByRole("textbox", {
      name: "Einschreibecode",
    });
    await waitFor(() => expect(changedInput).toHaveFocus());
    expect(changedInput).toHaveValue("");
    expect(
      screen.queryByRole("link", { name: /Klasse 7b/ }),
    ).not.toBeInTheDocument();
  });

  it("keeps an invalid manual code so it can be corrected", async () => {
    const user = userEvent.setup();
    render(<StudentClassEnrollment />);
    const input = await screen.findByRole("textbox", {
      name: "Einschreibecode",
    });

    await user.type(input, "unvollständiger Code");
    await user.click(screen.getByRole("button", { name: "Code prüfen" }));

    expect(input).toHaveValue("unvollständiger Code");
    expect(
      screen.getByText("Der Einschreibecode ist ungültig oder unvollständig."),
    ).toBeVisible();
  });
});
