import "fake-indexeddb/auto";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { LOCAL_DATA_AREAS } from "../../src/storage/local-data-boundaries";
import { createTeacherClassRepository } from "../../src/storage/teacher-class-settings";
import {
  TeacherAssignmentManager,
  TeacherProfilePanel,
} from "./teacher-workspace-manager";

afterEach(async () => {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(LOCAL_DATA_AREAS.teacher);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
});

describe("teacher workspace manager", () => {
  it("stores personal teacher information locally", async () => {
    const user = userEvent.setup();
    render(<TeacherProfilePanel />);
    await user.type(
      screen.getByRole("textbox", { name: "Anzeigename" }),
      "Frau Beispiel",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Schule" }),
      "Lernschule",
    );
    await user.click(
      screen.getByRole("button", { name: "Informationen speichern" }),
    );
    expect(
      await screen.findByText(
        "Persönliche Informationen wurden lokal gespeichert.",
      ),
    ).toBeVisible();
  });

  it("assigns work to a class and creates a readable QR payload", async () => {
    const user = userEvent.setup();
    await createTeacherClassRepository().put({
      id: "123e4567-e89b-42d3-a456-426614174001",
      name: "Klasse 8a",
      teacherName: "Frau Beispiel",
      schoolYear: "2026/27",
      enabledModules: ["german"],
      createdAt: "2026-08-28T10:00:00.000Z",
      updatedAt: "2026-08-28T10:00:00.000Z",
    });
    render(<TeacherAssignmentManager />);

    await user.type(
      screen.getByRole("textbox", { name: "Titel" }),
      "Lernwörter üben",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Arbeitsauftrag" }),
      "Bearbeite die Lernwort-Runde.",
    );
    await user.click(
      await screen.findByRole("checkbox", { name: "Klasse 8a" }),
    );
    await user.click(screen.getByRole("button", { name: "Aufgabe zuteilen" }));

    expect(
      await screen.findByText(
        "Aufgabe wurde erstellt und den Klassen zugeteilt.",
      ),
    ).toBeVisible();
    const code = screen.getByRole("textbox", {
      name: "Aufgabencode",
    }) as HTMLTextAreaElement;
    expect(code.value).toContain("lernraum:assignment:");

    fireEvent.change(screen.getByRole("textbox", { name: "Code einfügen" }), {
      target: { value: code.value },
    });
    await user.click(screen.getByRole("button", { name: "Code prüfen" }));
    expect(screen.getAllByText("Lernwörter üben")).toHaveLength(3);
  });
});
