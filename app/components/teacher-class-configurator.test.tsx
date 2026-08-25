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
  it("creates a class locally", async () => {
    const user = userEvent.setup();
    render(<TeacherClassConfigurator />);
    await user.type(
      screen.getByRole("textbox", { name: "Klassenname" }),
      "Klasse 8a",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Lehrkraft" }),
      "Herr Test",
    );
    await user.click(screen.getByRole("button", { name: "Klasse anlegen" }));
    expect(
      await screen.findByText("Klasse wurde lokal angelegt."),
    ).toBeVisible();
    expect(
      (
        screen.getByRole("combobox", {
          name: "Aktive Klasse",
        }) as HTMLSelectElement
      ).value,
    ).not.toBe("");
  });

  it("creates an individual enrollment code for a student", async () => {
    const user = userEvent.setup();
    render(<TeacherClassConfigurator />);
    await user.type(
      screen.getByRole("textbox", { name: "Klassenname" }),
      "Klasse 8a",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Lehrkraft" }),
      "Herr Test",
    );
    await user.click(screen.getByRole("button", { name: "Klasse anlegen" }));
    const student = await screen.findByRole("textbox", {
      name: "Name oder Alias",
    });
    await user.type(student, "Alex");
    await user.click(screen.getByRole("button", { name: "Schüler anlegen" }));
    await waitFor(() =>
      expect(
        (
          screen.getByRole("textbox", {
            name: "Einschreibecode",
          }) as HTMLTextAreaElement
        ).value,
      ).toContain("lernraum:class:"),
    );
  });
});
