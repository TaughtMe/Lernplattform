import "fake-indexeddb/auto";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCAL_DATA_AREAS } from "../../src/storage/local-data-boundaries";
import { TeacherClassConfigurator } from "./teacher-class-configurator";

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({
    value,
    "aria-label": ariaLabel,
  }: {
    value: string;
    "aria-label"?: string;
  }) => <svg aria-label={ariaLabel} data-qr-value={value} role="img" />,
}));

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
      screen.getByRole("button", { name: "Klasse 8a, 2026/27" }),
    ).toHaveAttribute("aria-pressed", "true");
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
    const studentButton = await screen.findByRole("button", {
      name: "Alex: QR-Code anzeigen",
    });
    await user.click(studentButton);
    expect(
      await screen.findByRole("img", {
        name: "Einschreibungs-QR-Code für Alex",
      }),
    ).toHaveAttribute(
      "data-qr-value",
      expect.stringMatching(
        /^https?:\/\/localhost(?::\d+)?\/lernen\/klasse#beitreten=/,
      ),
    );
    expect(
      screen.queryByRole("textbox", { name: "Einschreibecode" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Alex: QR-Code schließen" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("img", {
          name: "Einschreibungs-QR-Code für Alex",
        }),
      ).not.toBeInTheDocument(),
    );
  });

  it("creates a printable QR sheet for the whole class", async () => {
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
    await user.type(student, "Sam");
    await user.click(screen.getByRole("button", { name: "Schüler anlegen" }));
    await user.click(
      screen.getByRole("button", { name: "QR-Bogen für die Klasse" }),
    );
    expect(
      screen.getByRole("heading", { name: "QR-Bogen für Klasse 8a" }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("img", { name: /Einschreibungs-QR-Code/ }),
    ).toHaveLength(2);
    expect(screen.getByText("Alex")).toBeVisible();
    expect(screen.getByText("Sam")).toBeVisible();
  });
});
