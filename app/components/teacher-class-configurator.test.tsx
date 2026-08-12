import "fake-indexeddb/auto";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { LOCAL_DATA_AREAS } from "../../src/storage/local-data-boundaries";
import { TeacherClassConfigurator } from "./teacher-class-configurator";

afterEach(async () => {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(LOCAL_DATA_AREAS.teacher);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
});

describe("TeacherClassConfigurator", () => {
  it("updates the student preview when a teacher disables a module", async () => {
    const user = userEvent.setup();
    render(<TeacherClassConfigurator />);

    const mathematics = await screen.findByRole("checkbox", {
      name: /Mathematik/,
    });
    await waitFor(() => expect(mathematics).toBeEnabled());
    await user.click(mathematics);

    expect(mathematics).not.toBeChecked();
    expect(
      screen.getByRole("heading", { name: "In Klasse 7b sichtbar" }),
    ).toBeVisible();
    expect(screen.getByText("Ausgeblendet")).toBeVisible();
  });

  it("stores the selected configuration locally", async () => {
    const user = userEvent.setup();
    render(<TeacherClassConfigurator />);

    const saveButton = screen.getByRole("button", {
      name: "Einstellungen speichern",
    });
    await waitFor(() => expect(saveButton).toBeEnabled());
    await user.click(saveButton);

    expect(
      await screen.findByRole("button", { name: "Gespeichert" }),
    ).toBeVisible();
  });
});
