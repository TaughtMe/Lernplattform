import "fake-indexeddb/auto";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCAL_DATA_AREAS } from "../../src/storage/local-data-boundaries";
import { parseEnrollmentLink } from "../../src/domain/class-enrollment";
import {
  parseGuestPassLink,
  verifyGuestPass,
} from "../../src/domain/guest-pass";
import { resolveStages, resolveVisibility } from "../../src/domain/release";
import { ReleaseProvider } from "../release/release-context";
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
  it("deletes a class only after two confirmations", async () => {
    const user = userEvent.setup();
    render(<TeacherClassConfigurator />);
    await user.type(
      await screen.findByRole("textbox", { name: "Klassenname" }),
      "Klasse 8a",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Lehrkraft" }),
      "Herr Test",
    );
    await user.click(screen.getByRole("button", { name: "Anlegen" }));
    await user.click(
      await screen.findByRole("button", { name: "Klasse Klasse 8a löschen" }),
    );
    expect(
      screen.getByRole("alertdialog", { name: "Klasse „Klasse 8a“ löschen?" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Klasse Klasse 8a löschen" }),
    );
    await user.click(screen.getByRole("button", { name: "Ja, löschen" }));
    expect(
      screen.getByRole("alertdialog", { name: "Wirklich endgültig löschen?" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Klasse 8a, 2026/27" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Endgültig löschen" }));
    expect(
      await screen.findByText("„Klasse 8a“ wurde gelöscht."),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Klasse 8a, 2026/27" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("creates a class locally", async () => {
    const user = userEvent.setup();
    render(<TeacherClassConfigurator />);
    await user.type(
      await screen.findByRole("textbox", { name: "Klassenname" }),
      "Klasse 8a",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Lehrkraft" }),
      "Herr Test",
    );
    await user.click(screen.getByRole("button", { name: "Anlegen" }));
    expect(
      await screen.findByText("Klasse wurde lokal angelegt."),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Klasse 8a, 2026/27" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps a new class even when the class seal cannot be created", async () => {
    const user = userEvent.setup();
    const generateKey = vi
      .spyOn(crypto.subtle, "generateKey")
      .mockRejectedValue(new Error("kein sicherer Kontext"));
    render(<TeacherClassConfigurator />);
    await user.type(
      await screen.findByRole("textbox", { name: "Klassenname" }),
      "Klasse 8b",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Lehrkraft" }),
      "Herr Test",
    );
    await user.click(screen.getByRole("button", { name: "Anlegen" }));
    expect(
      await screen.findByText("Klasse wurde lokal angelegt."),
    ).toBeVisible();
    expect(
      screen.queryByText("Die Klasse konnte nicht gespeichert werden."),
    ).toBeNull();
    generateKey.mockRestore();
  });

  it("creates an individual enrollment code for a student", async () => {
    const user = userEvent.setup();
    render(<TeacherClassConfigurator />);
    await user.type(
      await screen.findByRole("textbox", { name: "Klassenname" }),
      "Klasse 8a",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Lehrkraft" }),
      "Herr Test",
    );
    await user.click(screen.getByRole("button", { name: "Anlegen" }));
    const student = await screen.findByRole("textbox", {
      name: "Name oder Alias",
    });
    await user.type(student, "Alex");
    await user.click(screen.getByRole("button", { name: "Hinzufügen" }));
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
      await screen.findByRole("textbox", { name: "Klassenname" }),
      "Klasse 8a",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Lehrkraft" }),
      "Herr Test",
    );
    await user.click(screen.getByRole("button", { name: "Anlegen" }));
    const student = await screen.findByRole("textbox", {
      name: "Name oder Alias",
    });
    await user.type(student, "Alex");
    await user.click(screen.getByRole("button", { name: "Hinzufügen" }));
    await user.type(student, "Sam");
    await user.click(screen.getByRole("button", { name: "Hinzufügen" }));
    await user.click(screen.getByRole("button", { name: "QR-Bogen drucken" }));
    expect(
      screen.getByRole("heading", { name: "QR-Bogen für Klasse 8a" }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("img", { name: /Einschreibungs-QR-Code/ }),
    ).toHaveLength(2);
    expect(screen.getByText("Alex")).toBeVisible();
    expect(screen.getByText("Sam")).toBeVisible();
  });

  it("gives a student writing relief and puts a signed grant into the new QR code", async () => {
    const user = userEvent.setup();
    render(<TeacherClassConfigurator />);
    await user.type(
      await screen.findByRole("textbox", { name: "Klassenname" }),
      "Klasse 8a",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Lehrkraft" }),
      "Herr Test",
    );
    await user.click(screen.getByRole("button", { name: "Anlegen" }));
    await user.type(
      await screen.findByRole("textbox", { name: "Name oder Alias" }),
      "Alex",
    );
    await user.click(screen.getByRole("button", { name: "Hinzufügen" }));
    const relief = await screen.findByRole("checkbox", {
      name: "Schreiberleichterung für Alex",
    });
    expect(relief).not.toBeChecked();
    expect(relief.closest("label")).toHaveAttribute(
      "title",
      expect.stringMatching(
        /wirkt nur in Laufdiktaten, die du für diese Klasse/,
      ),
    );

    await user.click(relief);
    expect(
      await screen.findByText(
        /Schreiberleichterung für „Alex“ ist gesetzt. Das Kind muss den neuen QR-Code scannen./,
      ),
    ).toBeVisible();
    expect(relief).toBeChecked();
    const link = (
      await screen.findByRole("img", {
        name: "Einschreibungs-QR-Code für Alex",
      })
    ).getAttribute("data-qr-value")!;
    const enrollment = parseEnrollmentLink(link).enrollment;
    expect(enrollment.sealPublicKey).toBeTruthy();
    expect(enrollment.writingReliefGrant).toMatchObject({
      writingRelief: true,
    });
    expect(enrollment.writingReliefSignature).toBeTruthy();

    await user.click(relief);
    expect(
      await screen.findByText(/ist entzogen. Das Kind muss den neuen QR-Code/),
    ).toBeVisible();
    const withdrawn = parseEnrollmentLink(
      screen
        .getByRole("img", { name: "Einschreibungs-QR-Code für Alex" })
        .getAttribute("data-qr-value")!,
    ).enrollment;
    expect(withdrawn.sealPublicKey).toBe(enrollment.sealPublicKey);
    expect(withdrawn.writingReliefGrant).toBeUndefined();
  });

  it("opens the new class row, switches tabs and toggles areas", async () => {
    const user = userEvent.setup();
    render(<TeacherClassConfigurator />);
    // Ohne Klasse steht die Zeile offen; „+ Neue Klasse“ klappt sie zu.
    const toggle = screen.getByRole("button", { name: "+ Neue Klasse" });
    await waitFor(() =>
      expect(toggle).toHaveAttribute("aria-expanded", "true"),
    );
    expect(screen.getByRole("textbox", { name: "Schuljahr" })).toHaveValue(
      "2026/27",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Klassenname" }),
      "Klasse 7b",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Lehrkraft" }),
      "Herr Test",
    );
    await user.click(screen.getByRole("button", { name: "Anlegen" }));
    await screen.findByText("Klasse wurde lokal angelegt.");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("textbox", { name: "Klassenname" })).toBeNull();
    expect(screen.getByText("Noch keine Schüler")).toBeVisible();

    const typing = screen.getByRole("button", { name: "Tipptraining" });
    expect(typing).toHaveAttribute("aria-pressed", "true");
    await user.click(typing);
    await waitFor(() =>
      expect(typing).toHaveAttribute("aria-pressed", "false"),
    );

    await user.click(screen.getByRole("button", { name: "Archivieren" }));
    expect(await screen.findByText(/wurde archiviert/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: /^Archiv/ }));
    expect(screen.getByRole("heading", { name: "Klasse 7b" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Entfernungscode" }));
    expect(
      screen.getByRole("img", { name: "Entfernungs-QR-Code für Klasse 7b" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Wiederherstellen" }));
    expect(await screen.findByText(/wieder aktiviert/)).toBeVisible();
    expect(screen.getByRole("button", { name: /^Aktiv/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  async function createClass(user: ReturnType<typeof userEvent.setup>) {
    await user.type(
      await screen.findByRole("textbox", { name: "Klassenname" }),
      "Klasse 8a",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Lehrkraft" }),
      "Herr Test",
    );
    await user.click(screen.getByRole("button", { name: "Anlegen" }));
    await screen.findByText("Klasse wurde lokal angelegt.");
  }

  it("zeigt den Gast-QR nur, wenn der Bereich Gastmodus sichtbar ist", async () => {
    const user = userEvent.setup();
    render(<TeacherClassConfigurator />);
    await createClass(user);
    expect(
      screen.queryByRole("button", { name: /Gast-QR/ }),
    ).not.toBeInTheDocument();
  });

  it("erstellt einen Gast-QR mit 90 Minuten Laufzeit", async () => {
    const user = userEvent.setup();
    render(
      <ReleaseProvider
        value={resolveVisibility(resolveStages(undefined), true)}
      >
        <TeacherClassConfigurator />
      </ReleaseProvider>,
    );
    await createClass(user);
    await user.click(
      await screen.findByRole("button", { name: "Gast-QR (90 Minuten)" }),
    );
    const qr = await screen.findByRole("img", {
      name: "Gast-QR-Code für Klasse 8a",
    });
    const link = qr.getAttribute("data-qr-value") ?? "";
    expect(new URL(link).pathname).toBe("/gast");
    const pass = parseGuestPassLink(link);
    expect(
      Date.parse(pass.payload.expiresAt) - Date.parse(pass.payload.issuedAt),
    ).toBe(90 * 60_000);
    expect(await verifyGuestPass(pass, new Date())).toMatchObject({ ok: true });
    await user.click(screen.getByRole("button", { name: "Ausblenden" }));
    expect(
      screen.queryByRole("img", { name: /Gast-QR-Code/ }),
    ).not.toBeInTheDocument();
  });
});
