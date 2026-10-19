import "fake-indexeddb/auto";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createTeacherAssignmentCode } from "../../src/domain/teacher-workspace";
import { LOCAL_DATA_AREAS } from "../../src/storage/local-data-boundaries";
import {
  createTeacherClassRepository,
  createTeacherProfileRepository,
  createTeacherWorkspaceRepository,
} from "../../src/storage/teacher-class-settings";
import {
  TeacherAssignmentManager,
  TeacherDataPanel,
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
  it("stores personal teacher information while typing", async () => {
    const user = userEvent.setup();
    render(<TeacherProfilePanel />);
    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: "Anzeigename" }),
      ).toBeEnabled(),
    );
    // Ohne Speichern-Knopf: Die Angaben landen kurz nach dem Tippen im Speicher.
    expect(screen.queryByRole("button", { name: /speichern/i })).toBeNull();
    expect(screen.getByText("Wird beim Tippen gespeichert")).toBeVisible();
    await user.type(
      screen.getByRole("textbox", { name: "Anzeigename" }),
      "Frau Beispiel",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Schule" }),
      "Lernschule",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Fächer" }),
      "Deutsch, Mathematik",
    );
    await waitFor(async () =>
      expect(await createTeacherProfileRepository().get()).toMatchObject({
        displayName: "Frau Beispiel",
        school: "Lernschule",
        subjects: ["Deutsch", "Mathematik"],
      }),
    );
  });

  it("saves nothing without a display name", async () => {
    const user = userEvent.setup();
    render(<TeacherProfilePanel />);
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Schule" })).toBeEnabled(),
    );
    await user.type(screen.getByRole("textbox", { name: "Schule" }), "X");
    expect(
      screen.getByText("Ohne Anzeigenamen wird nichts gespeichert."),
    ).toBeVisible();
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(await createTeacherProfileRepository().get()).toBeUndefined();
  });

  it("shows the local numbers and reloads the profile after an import", async () => {
    const user = userEvent.setup();
    await createTeacherClassRepository().put({
      id: "123e4567-e89b-42d3-a456-426614174009",
      name: "Klasse 7b",
      teacherName: "Frau Beispiel",
      schoolYear: "2026/27",
      enabledModules: ["german"],
      createdAt: "2026-08-28T10:00:00.000Z",
      updatedAt: "2026-08-28T10:00:00.000Z",
    });
    const backup = await createTeacherWorkspaceRepository().exportData();
    render(
      <>
        <TeacherProfilePanel />
        <TeacherDataPanel />
      </>,
    );
    const classes = await screen.findByText("Klassen");
    await waitFor(() =>
      expect(classes.parentElement).toHaveTextContent("Klassen1"),
    );
    const file = new File(
      [
        JSON.stringify({
          ...backup,
          profile: {
            id: "local-teacher",
            displayName: "Herr Import",
            school: "",
            email: "",
            subjects: [],
            updatedAt: "2026-09-01T10:00:00.000Z",
          },
        }),
      ],
      "sicherung.json",
      { type: "application/json" },
    );
    await user.upload(screen.getByLabelText("Lehrerdatenbank auswählen"), file);
    expect(
      await screen.findByText(
        "Die geprüfte Lehrerdatenbank wurde lokal zusammengeführt.",
      ),
    ).toBeVisible();
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Anzeigename" })).toHaveValue(
        "Herr Import",
      ),
    );
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
    const code = createTeacherAssignmentCode({
      id: "123e4567-e89b-42d3-a456-426614174003",
      title: "Lernwörter üben",
      instructions: "Bearbeite die Lernwort-Runde.",
      subject: "german",
      materialId: null,
      classIds: ["123e4567-e89b-42d3-a456-426614174001"],
      memberIds: [],
      dueDate: "",
      status: "assigned",
      createdAt: "2026-09-20T10:00:00.000Z",
      updatedAt: "2026-09-20T10:00:00.000Z",
    });

    fireEvent.change(
      screen.getByRole("textbox", { name: "Code manuell prüfen" }),
      {
        target: { value: code },
      },
    );
    await user.click(screen.getByRole("button", { name: "Code prüfen" }));
    await waitFor(() =>
      expect(
        screen.getByRole("article", { name: "Eingelesene Aufgabe" }),
      ).toHaveTextContent("Lernwörter üben"),
    );
  });
});
