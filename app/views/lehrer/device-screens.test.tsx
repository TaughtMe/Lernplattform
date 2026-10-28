import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  BoardBlock,
  DeviceChooser,
  DeviceSettingsCard,
  PinLockScreen,
  describePersonalData,
  type DeviceSettingsProps,
} from "./device-screens";

describe("DeviceChooser", () => {
  it("meldet die gewählte Geräteart", async () => {
    const onChoose = vi.fn();
    render(<DeviceChooser onChoose={onChoose} />);
    await userEvent.click(
      screen.getByRole("button", {
        name: "Tafel / geteiltes Gerät (nur Material)",
      }),
    );
    expect(onChoose).toHaveBeenCalledWith("board");
    await userEvent.click(screen.getByRole("button", { name: "Mein Gerät" }));
    expect(onChoose).toHaveBeenLastCalledWith("own");
  });
});

describe("BoardBlock", () => {
  it("nennt den Grund und führt zum Material", () => {
    render(<BoardBlock />);
    expect(
      screen.getByRole("heading", { name: "Im Tafelmodus nicht verfügbar" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zum Material" })).toHaveAttribute(
      "href",
      "/lehrer/material",
    );
    expect(
      screen.getByRole("link", { name: "Gerätetyp ändern" }),
    ).toHaveAttribute("href", "/lehrer/einstellungen");
  });
});

describe("PinLockScreen", () => {
  it("nimmt nur Ziffern an und gibt erst bei 6 Ziffern frei", async () => {
    const onSubmit = vi.fn();
    render(<PinLockScreen onSubmit={onSubmit} onForgot={vi.fn()} />);
    const field = screen.getByLabelText("PIN (6 Ziffern)");
    const unlock = screen.getByRole("button", { name: "Entsperren" });
    expect(field).toHaveAttribute("type", "password");
    expect(field).toHaveFocus();

    await userEvent.type(field, "12ab34");
    expect(field).toHaveValue("1234");
    expect(unlock).toBeDisabled();
    await userEvent.type(field, "56");
    expect(unlock).toBeEnabled();
    await userEvent.click(unlock);
    expect(onSubmit).toHaveBeenCalledWith("123456");
    // Die Eingabe wird nach dem Absenden geleert.
    expect(field).toHaveValue("");
  });

  it("sagt ehrlich, dass es nur ein Sichtschutz ist", () => {
    render(<PinLockScreen onSubmit={vi.fn()} onForgot={vi.fn()} />);
    expect(
      screen.getByText(/Sichtschutz, keine Verschlüsselung/),
    ).toBeInTheDocument();
  });

  it("zeigt einen Fehler als Hinweis am Feld", () => {
    render(
      <PinLockScreen
        error="Die PIN stimmt nicht."
        onSubmit={vi.fn()}
        onForgot={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("PIN stimmt nicht");
    expect(screen.getByLabelText("PIN (6 Ziffern)")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("fragt vor dem Aufheben der Sperre nach und kann abbrechen", async () => {
    const onForgot = vi.fn();
    render(<PinLockScreen onSubmit={vi.fn()} onForgot={onForgot} />);
    await userEvent.click(
      screen.getByRole("button", { name: "PIN vergessen" }),
    );
    expect(onForgot).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(screen.getByLabelText("PIN (6 Ziffern)")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "PIN vergessen" }),
    );
    await userEvent.click(
      screen.getByRole("button", {
        name: "Sperre aufheben und Personendaten löschen",
      }),
    );
    expect(onForgot).toHaveBeenCalledTimes(1);
  });
});

describe("DeviceSettingsCard", () => {
  const handlers = {
    onChangeDevice: vi.fn(),
    onDeleteData: vi.fn(),
    onKeepData: vi.fn(),
    onSavePin: vi.fn(async () => undefined as string | undefined),
    onRemovePin: vi.fn(),
  };
  const card = (props: Partial<DeviceSettingsProps> = {}) => (
    <DeviceSettingsCard device="own" pinSet={false} {...handlers} {...props} />
  );

  it("wechselt den Gerätetyp über die Optionsfelder", async () => {
    render(card());
    expect(screen.getByRole("radio", { name: /Mein Gerät/ })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: /Tafel/ }));
    expect(handlers.onChangeDevice).toHaveBeenCalledWith("board");
  });

  it("legt eine PIN fest, wenn beide Eingaben übereinstimmen", async () => {
    handlers.onSavePin.mockClear();
    render(card());
    expect(
      screen.getByText(/Sichtschutz, keine Verschlüsselung/),
    ).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Neue PIN/), "482913");
    await userEvent.type(screen.getByLabelText("PIN wiederholen"), "482914");
    await userEvent.click(
      screen.getByRole("button", { name: "PIN festlegen" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("passen nicht");
    expect(handlers.onSavePin).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText("PIN wiederholen"));
    await userEvent.type(screen.getByLabelText("PIN wiederholen"), "482913");
    await userEvent.click(
      screen.getByRole("button", { name: "PIN festlegen" }),
    );
    expect(handlers.onSavePin).toHaveBeenCalledWith("482913");
  });

  it("verlangt genau 6 Ziffern", async () => {
    handlers.onSavePin.mockClear();
    render(card());
    await userEvent.type(screen.getByLabelText(/Neue PIN/), "1234");
    await userEvent.click(
      screen.getByRole("button", { name: "PIN festlegen" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("genau 6 Ziffern");
    expect(handlers.onSavePin).not.toHaveBeenCalled();
  });

  it("zeigt bei eingerichteter PIN Ändern und Ausschalten", async () => {
    handlers.onRemovePin.mockClear();
    render(card({ pinSet: true }));
    expect(screen.queryByLabelText(/Neue PIN/)).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Sperre ausschalten" }),
    );
    expect(handlers.onRemovePin).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "PIN ändern" }));
    expect(screen.getByLabelText(/Neue PIN/)).toBeInTheDocument();
  });

  it("bietet die PIN-Sperre auf der Tafel nicht an", () => {
    render(card({ device: "board" }));
    expect(screen.queryByLabelText(/Neue PIN/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "PIN-Sperre" }),
    ).not.toBeInTheDocument();
  });

  it("zeigt das Angebot zum Löschen der Personendaten", async () => {
    handlers.onDeleteData.mockClear();
    render(
      card({
        device: "board",
        offer: { classes: 2, students: 31, assignments: 0, submissions: 0 },
      }),
    );
    expect(screen.getByText(/2 Klassen, 31 Schüler/)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Personendaten löschen" }),
    );
    expect(handlers.onDeleteData).toHaveBeenCalledTimes(1);
  });
});

describe("describePersonalData", () => {
  it("zählt nur auf, was vorhanden ist", () => {
    expect(
      describePersonalData({
        classes: 1,
        students: 1,
        assignments: 3,
        submissions: 0,
      }),
    ).toBe("1 Klasse, 1 Schüler, 3 Aufgaben");
    expect(
      describePersonalData({
        classes: 0,
        students: 0,
        assignments: 0,
        submissions: 0,
      }),
    ).toBe("Einstellungen und Profil");
  });
});
