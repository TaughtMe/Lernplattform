import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncSnapshot } from "../../src/integrations/cloud-sync/controller";
import { DEFAULT_SYNC_SCOPE } from "../../src/integrations/cloud-sync/model";
import { ReleaseProvider } from "../release/release-context";
import { resolveStages, resolveVisibility } from "../../src/domain/release";
import { CloudSyncSetup as Setup } from "./cloud-sync-setup";

const visibility = (preview: boolean) =>
  resolveVisibility(resolveStages(undefined), preview);

function CloudSyncSetup({ preview = true }: { preview?: boolean }) {
  return (
    <ReleaseProvider value={visibility(preview)}>
      <Setup />
    </ReleaseProvider>
  );
}

const GOOD = "pferd-batterie-klammer";

const controller = {
  inspectRemote: vi.fn(),
  checkPassword: vi.fn(),
  enable: vi.fn(),
  unlock: vi.fn(),
  setPassword: vi.fn(),
  setDeviceName: vi.fn(),
  syncNow: vi.fn(),
  disable: vi.fn(),
};
let snapshot: SyncSnapshot | null = null;

vi.mock("./cloud-sync-client", () => ({
  useSyncSnapshot: () => ({ snapshot, controller }),
}));

const session = vi.hoisted(() => ({
  isConnected: vi.fn(() => false),
  startConnect: vi.fn(async () => undefined),
  connectGoogle: vi.fn(async () => "token"),
}));
vi.mock("../../src/integrations/cloud-sync/session", () => session);

vi.mock("../../src/integrations/cloud-sync/providers", () => ({
  cloudProviders: () => [
    {
      id: "onedrive",
      label: "Microsoft OneDrive",
      description: "d",
      available: true,
    },
    {
      id: "google-drive",
      label: "Google Drive",
      description: "d",
      available: false,
    },
    {
      id: "webdav",
      label: "WebDAV (z. B. Nextcloud)",
      description: "d",
      available: true,
    },
  ],
}));

const exportData = vi.hoisted(() => vi.fn(async () => ({ version: 1 })));
vi.mock("../../src/storage/teacher-class-settings", () => ({
  createTeacherWorkspaceRepository: () => ({ exportData }),
}));

function active(over: Partial<SyncSnapshot> = {}): SyncSnapshot {
  return {
    enabled: true,
    status: "idle",
    error: null,
    pending: 0,
    revision: 7,
    lastSyncedAt: new Date().toISOString(),
    deviceId: "d1",
    deviceName: "Laptop",
    provider: "webdav",
    scope: { ...DEFAULT_SYNC_SCOPE },
    encrypted: true,
    devices: [
      {
        id: "d1",
        name: "Laptop",
        revision: 7,
        seenAt: new Date().toISOString(),
      },
    ],
    lastWriter: { name: "Laptop", at: new Date().toISOString() },
    openConflicts: 0,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  snapshot = { ...active(), enabled: false, status: "off" };
  controller.inspectRemote.mockResolvedValue({ exists: false, header: null });
  controller.enable.mockResolvedValue(active());
  window.sessionStorage.clear();
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: () => "blob:x",
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: () => undefined,
  });
});

async function toConnect(user: ReturnType<typeof userEvent.setup>) {
  render(<CloudSyncSetup />);
  await user.click(screen.getByRole("button", { name: "Weiter" }));
}

async function fillWebDav(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText("Server-Adresse"),
    "https://cloud.example/dav",
  );
  await user.type(screen.getByLabelText("Benutzername"), "lea");
  await user.type(screen.getByLabelText("App-Passwort"), "app-pw");
}

describe("release gate", () => {
  it("stays invisible and idle without the preview", () => {
    const { container } = render(<CloudSyncSetup preview={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("setup wizard", () => {
  it("leads from provider to start and passes everything to the controller", async () => {
    const user = userEvent.setup();
    await toConnect(user);
    await fillWebDav(user);
    await user.click(screen.getByRole("button", { name: "Verbindung testen" }));
    expect(controller.inspectRemote).toHaveBeenCalledWith("webdav", {
      url: "https://cloud.example/dav",
      username: "lea",
      password: "app-pw",
    });

    // Umfang
    expect(
      await screen.findByRole("heading", { name: "Umfang" }),
    ).toHaveFocus();
    await user.click(screen.getByRole("checkbox", { name: "Schülerliste" }));
    await user.click(screen.getByRole("button", { name: "Weiter" }));

    // Verschlüsselung
    expect(
      screen.getByRole("heading", { name: "Verschlüsselung" }),
    ).toBeVisible();
    // Mit Passwort braucht es keine Warnung.
    expect(screen.queryByRole("alert")).toBeNull();
    await user.click(
      screen.getByRole("checkbox", { name: /Andere nutzen dieses Gerät/ }),
    );
    await user.type(screen.getByLabelText("Neues Passwort"), GOOD);
    await user.type(screen.getByLabelText("Passwort wiederholen"), GOOD);
    await user.click(
      screen.getByRole("button", { name: "Passwort festlegen" }),
    );

    // Gerät
    expect(screen.getByRole("heading", { name: "Dieses Gerät" })).toBeVisible();
    // Das Passwortformular ist verschwunden, damit der Manager das Speichern anbietet.
    expect(screen.queryByLabelText("Neues Passwort")).toBeNull();
    await user.type(screen.getByLabelText("Name dieses Geräts"), "Tafel 2b");
    await user.click(screen.getByRole("button", { name: "Abgleich starten" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Verantwortung");
    await user.click(screen.getByRole("checkbox", { name: /Ich weiß/ }));
    await user.click(screen.getByRole("button", { name: "Abgleich starten" }));
    await waitFor(() => expect(controller.enable).toHaveBeenCalledTimes(1));
    expect(controller.enable).toHaveBeenCalledWith({
      provider: "webdav",
      scope: { ...DEFAULT_SYNC_SCOPE, students: true },
      deviceName: "Tafel 2b",
      webdav: {
        url: "https://cloud.example/dav",
        username: "lea",
        password: "app-pw",
      },
      password: GOOD,
      remember: false,
    });
  });

  it("explains missing connection data and connection errors", async () => {
    const user = userEvent.setup();
    await toConnect(user);
    await user.click(screen.getByRole("button", { name: "Verbindung testen" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Adresse, Benutzername und App-Passwort",
    );
    expect(controller.inspectRemote).not.toHaveBeenCalled();
    await fillWebDav(user);
    controller.inspectRemote.mockRejectedValueOnce(
      new Error("Server nicht erreichbar (CORS)."),
    );
    await user.click(screen.getByRole("button", { name: "Verbindung testen" }));
    expect(
      await screen.findByText("Server nicht erreichbar (CORS)."),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Verbindung" })).toBeVisible();
  });

  it("goes without encryption but refuses keys without a password", async () => {
    const user = userEvent.setup();
    await toConnect(user);
    await fillWebDav(user);
    await user.click(screen.getByRole("button", { name: "Verbindung testen" }));
    await user.click(
      await screen.findByRole("checkbox", { name: "Schlüssel" }),
    );
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    await user.click(
      screen.getByRole("radio", { name: /Ohne Verschlüsselung/ }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/Daten von Kindern/);
    await user.click(
      screen.getByRole("button", { name: "Ohne Passwort weiter" }),
    );
    expect(
      screen
        .getAllByRole("alert")
        .some((alert) =>
          /Schlüssel lassen sich nur mit Passwort/.test(
            alert.textContent ?? "",
          ),
        ),
    ).toBe(true);
    await user.click(screen.getByRole("button", { name: "Zurück" }));
    await user.click(screen.getByRole("checkbox", { name: "Schlüssel" }));
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    await user.click(
      screen.getByRole("radio", { name: /Ohne Verschlüsselung/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "Ohne Passwort weiter" }),
    );
    await user.click(screen.getByRole("checkbox", { name: /Ich weiß/ }));
    await user.click(screen.getByRole("button", { name: "Abgleich starten" }));
    await waitFor(() => expect(controller.enable).toHaveBeenCalled());
    expect(controller.enable.mock.calls[0]?.[0]).not.toHaveProperty("password");
    expect(controller.enable.mock.calls[0]?.[0]).toMatchObject({
      remember: true,
    });
  });

  it("asks only for the password when the cloud file is already encrypted", async () => {
    const user = userEvent.setup();
    controller.inspectRemote.mockResolvedValue({
      exists: true,
      header: {
        revision: 4,
        writtenBy: {
          device: "x",
          name: "Tafel 2b",
          at: "2026-10-05T10:00:00Z",
        },
        encryption: { algorithm: "AES-GCM" },
      },
    });
    controller.checkPassword.mockRejectedValueOnce(
      new Error("Das Passwort passt nicht zur Cloud-Datei."),
    );
    await toConnect(user);
    await fillWebDav(user);
    await user.click(screen.getByRole("button", { name: "Verbindung testen" }));
    expect(
      await screen.findByText(/Stand 4, zuletzt von „Tafel 2b“/),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByText(/Die Cloud-Datei ist verschlüsselt/)).toBeVisible();
    expect(screen.queryByLabelText("Passwort wiederholen")).toBeNull();
    await user.type(screen.getByLabelText("Passwort"), "falsch");
    await user.click(screen.getByRole("button", { name: "Passwort prüfen" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("passt nicht");
    expect(screen.getByLabelText("Passwort")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Passwort"));
    await user.type(screen.getByLabelText("Passwort"), GOOD);
    await user.click(screen.getByRole("button", { name: "Passwort prüfen" }));
    expect(
      await screen.findByRole("heading", { name: "Dieses Gerät" }),
    ).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: /Ich weiß/ }));
    await user.click(screen.getByRole("button", { name: "Abgleich starten" }));
    await waitFor(() => expect(controller.enable).toHaveBeenCalled());
    expect(controller.enable.mock.calls[0]?.[0]).toMatchObject({
      password: GOOD,
    });
  });

  it("offers a backup file before the first sync", async () => {
    const user = userEvent.setup();
    await toConnect(user);
    await fillWebDav(user);
    await user.click(screen.getByRole("button", { name: "Verbindung testen" }));
    await user.click(await screen.findByRole("button", { name: "Weiter" }));
    await user.click(
      screen.getByRole("radio", { name: /Ohne Verschlüsselung/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "Ohne Passwort weiter" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Vorher eine Sicherungsdatei laden" }),
    );
    await waitFor(() => expect(exportData).toHaveBeenCalled());
  });

  it("shows enable errors without leaving the wizard", async () => {
    const user = userEvent.setup();
    controller.enable.mockRejectedValueOnce(new Error("Der Server lehnt ab."));
    await toConnect(user);
    await fillWebDav(user);
    await user.click(screen.getByRole("button", { name: "Verbindung testen" }));
    await user.click(await screen.findByRole("button", { name: "Weiter" }));
    await user.click(
      screen.getByRole("radio", { name: /Ohne Verschlüsselung/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "Ohne Passwort weiter" }),
    );
    await user.click(screen.getByRole("checkbox", { name: /Ich weiß/ }));
    await user.click(screen.getByRole("button", { name: "Abgleich starten" }));
    expect(await screen.findByText("Der Server lehnt ab.")).toBeVisible();
  });

  it("connects OneDrive through the sign-in and resumes after the return", async () => {
    const user = userEvent.setup();
    render(<CloudSyncSetup />);
    expect(screen.getByRole("radio", { name: /Google Drive/ })).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: /Microsoft OneDrive/ }));
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    await user.click(
      screen.getByRole("button", { name: /Mit Microsoft OneDrive verbinden/ }),
    );
    expect(session.startConnect).toHaveBeenCalledWith(
      "onedrive",
      "/lehrer/einstellungen#cloud-abgleich",
    );
    expect(window.sessionStorage.getItem("lernraum:cloud-setup:provider")).toBe(
      "onedrive",
    );
  });

  it("continues at the connection step after returning from the provider", async () => {
    window.sessionStorage.setItem("lernraum:cloud-setup:provider", "onedrive");
    session.isConnected.mockReturnValue(true);
    const user = userEvent.setup();
    render(<CloudSyncSetup />);
    expect(
      await screen.findByText(/Mit Microsoft OneDrive verbunden/),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Verbindung testen" }));
    expect(controller.inspectRemote).toHaveBeenCalledWith(
      "onedrive",
      undefined,
    );
    expect(
      await screen.findByRole("heading", { name: "Umfang" }),
    ).toBeVisible();
    session.isConnected.mockReturnValue(false);
  });

  it("reports a failing sign-in", async () => {
    const user = userEvent.setup();
    session.startConnect.mockRejectedValueOnce(
      new Error("Dieses Konto ist noch nicht eingerichtet."),
    );
    render(<CloudSyncSetup />);
    await user.click(screen.getByRole("radio", { name: /Microsoft OneDrive/ }));
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    await user.click(
      screen.getByRole("button", { name: /Mit Microsoft OneDrive verbinden/ }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "noch nicht eingerichtet",
    );
  });

  it("keeps the earlier steps reachable with Zurück", async () => {
    const user = userEvent.setup();
    await toConnect(user);
    await user.click(screen.getByRole("button", { name: "Zurück" }));
    expect(screen.getByRole("heading", { name: "Speicher" })).toBeVisible();
    const steps = screen.getByRole("list", {
      name: "Schritte der Einrichtung",
    });
    expect(within(steps).getAllByRole("listitem")).toHaveLength(5);
    expect(within(steps).getByText(/1\. Speicher/)).toHaveAttribute(
      "aria-current",
      "step",
    );
  });
});

describe("active sync", () => {
  it("shows state, scope and device and lets the teacher sync now", async () => {
    snapshot = active();
    const user = userEvent.setup();
    render(<CloudSyncSetup />);
    expect(screen.getByText(/Stand 7 · zuletzt/)).toBeVisible();
    expect(screen.getByText("Material")).toBeVisible();
    expect(screen.queryByText("Schülerliste")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Jetzt abgleichen" }));
    expect(controller.syncNow).toHaveBeenCalled();
  });

  it("renames the device", async () => {
    snapshot = active();
    const user = userEvent.setup();
    render(<CloudSyncSetup />);
    const field = screen.getByLabelText("Name dieses Geräts");
    await user.clear(field);
    await user.type(field, "Tafel 2b");
    await user.click(screen.getByRole("button", { name: "Namen speichern" }));
    expect(controller.setDeviceName).toHaveBeenCalledWith("Tafel 2b");
    expect(
      await screen.findByText("Der Gerätename wurde gespeichert."),
    ).toBeVisible();
  });

  it("unlocks a locked device with the password", async () => {
    snapshot = active({ status: "locked", error: "Passwort nötig." });
    const user = userEvent.setup();
    controller.unlock.mockRejectedValueOnce(
      new Error("Das Passwort passt nicht."),
    );
    render(<CloudSyncSetup />);
    const field = () =>
      screen.getByLabelText("Passwort", { selector: "input" });
    await user.type(field(), "falsch");
    await user.click(screen.getByRole("button", { name: "Entsperren" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("passt nicht");
    await user.clear(field());
    await user.type(field(), GOOD);
    await user.click(screen.getByRole("button", { name: "Entsperren" }));
    await waitFor(() =>
      expect(controller.unlock).toHaveBeenLastCalledWith(GOOD),
    );
  });

  it("offers a new sign-in when the provider asks for it", async () => {
    snapshot = active({
      status: "reauth",
      provider: "onedrive",
      error: "abgelaufen",
    });
    const user = userEvent.setup();
    render(<CloudSyncSetup />);
    await user.click(
      screen.getByRole("button", { name: "Bei OneDrive neu anmelden" }),
    );
    expect(session.startConnect).toHaveBeenCalledWith(
      "onedrive",
      "/lehrer/einstellungen#cloud-abgleich",
    );
    snapshot = active({ status: "reauth", provider: "google-drive" });
  });

  it("changes the password and turns encryption off", async () => {
    snapshot = active();
    const user = userEvent.setup();
    render(<CloudSyncSetup />);
    await user.click(screen.getByRole("button", { name: "Passwort ändern" }));
    await user.type(screen.getByLabelText("Neues Passwort"), GOOD);
    await user.type(screen.getByLabelText("Passwort wiederholen"), GOOD);
    await user.click(screen.getByRole("button", { name: "Passwort ändern" }));
    await waitFor(() =>
      expect(controller.setPassword).toHaveBeenCalledWith(GOOD),
    );
    expect(
      await screen.findByText(/Andere Geräte fragen beim nächsten Abgleich/),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Verschlüsselung ausschalten" }),
    );
    expect(controller.setPassword).toHaveBeenLastCalledWith(null);
  });

  it("turns encryption on for an unencrypted setup", async () => {
    snapshot = active({ encrypted: false });
    const user = userEvent.setup();
    render(<CloudSyncSetup />);
    expect(screen.getByText(/nur durch dein Cloud-Konto/)).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Verschlüsselung einschalten" }),
    );
    expect(screen.getByRole("button", { name: "Verschlüsseln" })).toBeVisible();
  });

  it("switches off on this device or also removes the cloud file", async () => {
    snapshot = active();
    const user = userEvent.setup();
    render(<CloudSyncSetup />);
    await user.click(screen.getByRole("button", { name: "Ausschalten …" }));
    await user.click(
      screen.getByRole("button", { name: "Nur auf diesem Gerät ausschalten" }),
    );
    expect(controller.disable).toHaveBeenLastCalledWith();
    await user.click(screen.getByRole("button", { name: "Ausschalten …" }));
    await user.click(
      screen.getByRole("button", { name: "Auch Cloud-Datei löschen" }),
    );
    expect(controller.disable).toHaveBeenLastCalledWith({ deleteRemote: true });
    await user.click(screen.getByRole("button", { name: "Ausschalten …" }));
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(screen.getByRole("button", { name: "Ausschalten …" })).toBeVisible();
  });

  it("shows loading until the state is read and reports action failures", async () => {
    snapshot = null;
    const { rerender } = render(<CloudSyncSetup />);
    expect(screen.getByText("Wird geladen …")).toBeVisible();
    snapshot = active();
    controller.disable.mockRejectedValueOnce(
      new Error("Löschen nicht erlaubt."),
    );
    rerender(<CloudSyncSetup />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Ausschalten …" }));
    await user.click(
      screen.getByRole("button", { name: "Auch Cloud-Datei löschen" }),
    );
    expect(await screen.findByText("Löschen nicht erlaubt.")).toBeVisible();
  });
});
