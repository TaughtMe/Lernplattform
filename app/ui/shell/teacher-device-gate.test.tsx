import "fake-indexeddb/auto";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resolveStages,
  resolveVisibility,
  type ReleaseVisibility,
} from "../../../src/domain/release";
import {
  LOCK_IDLE_LIMIT_MS,
  MAX_PIN_ATTEMPTS,
  PIN_LOCKOUT_MS,
} from "../../../src/domain/teacher-lock";
import { createPinVerifier } from "../../../src/integrations/crypto/pin";
import { LOCAL_DATA_AREAS } from "../../../src/storage/local-data-boundaries";
import {
  TeacherClassDatabase,
  createTeacherClassRepository,
  createTeacherContentLibraryRepository,
} from "../../../src/storage/teacher-class-settings";
import {
  TEACHER_DEVICE_KEY,
  readTeacherDevice,
  saveTeacherDevice,
} from "../../../src/storage/teacher-device";
import {
  readPinAttempts,
  readPinVerifier,
  resetLockSession,
  savePinAttempts,
  savePinVerifier,
} from "../../../src/storage/teacher-lock";
import { countTeacherPersonalData } from "../../../src/storage/teacher-personal-data";
import { ReleaseProvider } from "../../release/release-context";
import { TeacherShell } from "./teacher-shell";

// Gerätetyp, Sperrblock der Tafel und PIN-Sperre im Lehrerrahmen (B-009,
// Regeln D3-1 bis D3-5). Der Bereich `lehrer-geraet` steht auf `vorschau`;
// die Tests schalten ihn über die Sichtbarkeit ein.

const CLASS_ID = "123e4567-e89b-42d3-a456-426614174001";
const KID_ID = "123e4567-e89b-42d3-a456-426614174002";
const PIN = "482913";

function renderShell(
  pathname: string,
  visibility: Partial<ReleaseVisibility> = {},
) {
  window.history.replaceState(null, "", pathname);
  const value = {
    ...resolveVisibility(resolveStages(undefined), false),
    "lehrer-geraet": true,
    "lehrer-aufgaben": true,
    ...visibility,
  };
  return render(
    <ReleaseProvider value={value}>
      <TeacherShell pathname={window.location.pathname}>
        <p>Seiteninhalt</p>
      </TeacherShell>
    </ReleaseProvider>,
  );
}

const sidebar = () => screen.getByRole("navigation", { name: "Lehrerbereich" });

/** Klasse mit Kind und ein Material in der Lehrerdatenbank. */
async function seed() {
  const classes = createTeacherClassRepository();
  await classes.put({
    id: CLASS_ID,
    name: "Klasse 7b",
    teacherName: "Frau Test",
    schoolYear: "2026/27",
    enabledModules: ["vocabulary"],
    createdAt: "2026-08-25T10:00:00.000Z",
    updatedAt: "2026-08-25T10:00:00.000Z",
  });
  await classes.putMember({
    id: KID_ID,
    classId: CLASS_ID,
    displayName: "Mia Musterkind",
    enrollmentToken: "0123456789abcdef0123456789abcdef",
    createdAt: "2026-08-25T10:00:00.000Z",
  });
  await createTeacherContentLibraryRepository().put({
    id: "m1",
    revision: 1,
    title: "Diktat",
    source: "go;gehen",
    promptLocale: "en",
    answerLocale: "de",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-02T10:00:00.000Z",
  });
}

async function readCounts() {
  const database = new TeacherClassDatabase();
  try {
    return {
      personal: await countTeacherPersonalData(database),
      material: await database.contentPackages.count(),
    };
  } finally {
    database.close();
  }
}

async function setPin() {
  savePinVerifier(await createPinVerifier(PIN, 1000));
}

beforeEach(() => {
  localStorage.clear();
  resetLockSession();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(LOCAL_DATA_AREAS.teacher);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
  window.history.replaceState(null, "", "/");
});

describe("Auswahl des Gerätetyps (D3-1)", () => {
  it("fragt beim ersten Öffnen und zeigt die Seite erst nach der Wahl", async () => {
    renderShell("/lehrer");
    expect(
      await screen.findByRole("heading", { name: "Welches Gerät ist das?" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Seiteninhalt")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Tafel / geteiltes Gerät (nur Material)",
      }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Mein Gerät" }));
    expect(await screen.findByText("Seiteninhalt")).toBeInTheDocument();
    expect(readTeacherDevice()?.type).toBe("own");
  });

  it("fragt nicht noch einmal, wenn schon gewählt wurde", async () => {
    saveTeacherDevice("own", new Date());
    renderShell("/lehrer/material");
    expect(await screen.findByText("Seiteninhalt")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Welches Gerät ist das?" }),
    ).not.toBeInTheDocument();
  });

  it("verändert nichts, solange der Bereich nicht freigegeben ist", () => {
    renderShell("/lehrer/klassen", { "lehrer-geraet": false });
    expect(screen.getByText("Seiteninhalt")).toBeInTheDocument();
    expect(localStorage.getItem(TEACHER_DEVICE_KEY)).toBeNull();
  });
});

describe("Tafelmodus (D3-2)", () => {
  beforeEach(() => saveTeacherDevice("board", new Date()));

  it("sperrt Klassen und Aufgaben mit einem Hinweis statt der Seite", async () => {
    for (const path of ["/lehrer/klassen", "/lehrer/aufgaben"]) {
      const { unmount } = renderShell(path);
      expect(
        await screen.findByRole("heading", {
          name: "Im Tafelmodus nicht verfügbar",
        }),
      ).toBeInTheDocument();
      expect(screen.queryByText("Seiteninhalt")).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Zum Material" }),
      ).toHaveAttribute("href", "/lehrer/material");
      unmount();
    }
  });

  it("blendet Klassen, Aufgaben und die Klassenliste in der Navigation aus", async () => {
    await seed();
    renderShell("/lehrer/material");
    expect(await screen.findByText("Seiteninhalt")).toBeInTheDocument();
    const nav = sidebar();
    expect(
      within(nav).queryByRole("link", { name: "Klassen" }),
    ).not.toBeInTheDocument();
    expect(
      within(nav).queryByRole("link", { name: "Aufgaben" }),
    ).not.toBeInTheDocument();
    expect(
      within(nav).queryByRole("link", { name: /Klasse 7b/ }),
    ).not.toBeInTheDocument();
    expect(
      within(nav).getByRole("link", { name: "Freigabe an Schüler" }),
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole("link", { name: "Einstellungen" }),
    ).toBeInTheDocument();
  });

  it("lässt Start, Material, Räume und Einstellungen offen", async () => {
    for (const path of [
      "/lehrer",
      "/lehrer/material",
      "/lehrer/live",
      "/lehrer/einstellungen",
    ]) {
      const { unmount } = renderShell(path);
      expect(await screen.findByText("Seiteninhalt")).toBeInTheDocument();
      unmount();
    }
  });
});

describe("Wechsel auf die Tafel (D3-3)", () => {
  it("bietet an, die Personendaten zu löschen, und lässt das Material stehen", async () => {
    await seed();
    renderShell("/lehrer");
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Tafel / geteiltes Gerät (nur Material)",
      }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Personendaten von diesem Gerät löschen?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 Klasse, 1 Schüler/)).toBeInTheDocument();
    expect((await readCounts()).personal.total).toBeGreaterThan(0);

    await userEvent.click(
      screen.getByRole("button", { name: "Personendaten löschen" }),
    );
    expect(await screen.findByText("Seiteninhalt")).toBeInTheDocument();
    expect(await readCounts()).toMatchObject({
      personal: { total: 0 },
      material: 1,
    });
  });

  it("behält die Daten auf Wunsch, sie bleiben hinter dem Sperrblock", async () => {
    await seed();
    renderShell("/lehrer/klassen");
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Tafel / geteiltes Gerät (nur Material)",
      }),
    );
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Behalten (bleiben gesperrt)",
      }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Im Tafelmodus nicht verfügbar",
      }),
    ).toBeInTheDocument();
    expect((await readCounts()).personal.students).toBe(1);
  });

  it("macht kein Angebot, wenn keine Personendaten da sind", async () => {
    renderShell("/lehrer");
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Tafel / geteiltes Gerät (nur Material)",
      }),
    );
    expect(await screen.findByText("Seiteninhalt")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /Personendaten/ }),
    ).not.toBeInTheDocument();
  });
});

describe("PIN-Sperre (D3-4)", () => {
  beforeEach(async () => {
    saveTeacherDevice("own", new Date());
    await setPin();
  });

  it("sperrt nach dem Start Klassen und blendet die Klassenliste aus", async () => {
    await seed();
    renderShell("/lehrer/klassen");
    expect(
      await screen.findByRole("heading", { name: "Lehrerbereich gesperrt" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Seiteninhalt")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Sichtschutz, keine Verschlüsselung/),
    ).toBeInTheDocument();
    expect(
      within(sidebar()).queryByRole("link", { name: "Klassen" }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(sidebar()).queryByRole("link", { name: /Klasse 7b/ }),
      ).not.toBeInTheDocument(),
    );
  });

  it("lässt Material ohne PIN offen", async () => {
    renderShell("/lehrer/material");
    expect(await screen.findByText("Seiteninhalt")).toBeInTheDocument();
  });

  it("weist eine falsche PIN ab und öffnet mit der richtigen", async () => {
    renderShell("/lehrer/klassen");
    const field = await screen.findByLabelText("PIN (6 Ziffern)");
    const unlock = screen.getByRole("button", { name: "Entsperren" });
    expect(unlock).toBeDisabled();

    await userEvent.type(field, "111111");
    await userEvent.click(unlock);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Die PIN stimmt nicht.",
    );
    expect(screen.queryByText("Seiteninhalt")).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("PIN (6 Ziffern)"), PIN);
    await userEvent.click(screen.getByRole("button", { name: "Entsperren" }));
    expect(await screen.findByText("Seiteninhalt")).toBeInTheDocument();
  });

  /** Gibt eine PIN ein und bestätigt. */
  async function enterPin(pin: string) {
    await userEvent.type(await screen.findByLabelText("PIN (6 Ziffern)"), pin);
    await userEvent.click(screen.getByRole("button", { name: "Entsperren" }));
  }

  it("sperrt die Eingabe nach 5 falschen PINs für eine Minute", async () => {
    renderShell("/lehrer/klassen");
    for (let i = 1; i < MAX_PIN_ATTEMPTS; i += 1) {
      await enterPin("111111");
      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Die PIN stimmt nicht.",
        ),
      );
    }
    // Vor der Wartezeit sagt die Meldung, wie viele Versuche bleiben.
    expect(screen.getByRole("alert")).toHaveTextContent("Noch 1 Versuch");

    await enterPin("111111");
    expect(await screen.findByText(/Zu viele falsche PINs/)).toBeVisible();
    expect(screen.getByText(/Wieder möglich in 1 Minute/)).toBeVisible();
    expect(screen.getByLabelText("PIN (6 Ziffern)")).toBeDisabled();
    expect(screen.getByRole("button", { name: "PIN vergessen" })).toBeEnabled();
    expect(readPinAttempts().lockedUntil).not.toBeNull();
  });

  it("behält die Wartezeit nach dem Neuladen und öffnet sie nach einer Minute wieder", async () => {
    const start = Date.now();
    savePinAttempts({ failures: 0, lockedUntil: start + PIN_LOCKOUT_MS });
    const { unmount } = renderShell("/lehrer/klassen");
    expect(await screen.findByText(/Zu viele falsche PINs/)).toBeVisible();
    expect(screen.getByLabelText("PIN (6 Ziffern)")).toBeDisabled();
    unmount();

    // Neues Laden der Seite: gleicher Speicher, gleiche Sperre.
    vi.spyOn(Date, "now").mockReturnValue(start + 30_000);
    renderShell("/lehrer/klassen");
    expect(
      await screen.findByText(/Wieder möglich in 30 Sekunden/),
    ).toBeVisible();

    vi.spyOn(Date, "now").mockReturnValue(start + PIN_LOCKOUT_MS + 1);
    await waitFor(
      () => expect(screen.getByLabelText("PIN (6 Ziffern)")).toBeEnabled(),
      { timeout: 3000 },
    );
    expect(screen.queryByText(/Zu viele falsche PINs/)).not.toBeInTheDocument();
    await enterPin(PIN);
    expect(await screen.findByText("Seiteninhalt")).toBeInTheDocument();
  });

  it("setzt den Zähler mit der richtigen PIN zurück", async () => {
    savePinAttempts({ failures: 3, lockedUntil: null });
    renderShell("/lehrer/klassen");
    await enterPin(PIN);
    expect(await screen.findByText("Seiteninhalt")).toBeInTheDocument();
    expect(readPinAttempts()).toEqual({ failures: 0, lockedUntil: null });
  });

  it("lässt „PIN vergessen“ auch während der Wartezeit zu", async () => {
    await seed();
    savePinAttempts({ failures: 0, lockedUntil: Date.now() + PIN_LOCKOUT_MS });
    renderShell("/lehrer/klassen");
    await userEvent.click(
      await screen.findByRole("button", { name: "PIN vergessen" }),
    );
    await userEvent.click(
      screen.getByRole("button", {
        name: "Sperre aufheben und Personendaten löschen",
      }),
    );
    expect(await screen.findByText("Seiteninhalt")).toBeInTheDocument();
    expect(readPinVerifier()).toBeNull();
    expect(readPinAttempts()).toEqual({ failures: 0, lockedUntil: null });
  });

  it("sperrt nach 15 Minuten ohne Nutzung wieder", async () => {
    renderShell("/lehrer/klassen");
    await userEvent.type(await screen.findByLabelText("PIN (6 Ziffern)"), PIN);
    await userEvent.click(screen.getByRole("button", { name: "Entsperren" }));
    expect(await screen.findByText("Seiteninhalt")).toBeInTheDocument();

    const later = Date.now() + LOCK_IDLE_LIMIT_MS + 1000;
    vi.spyOn(Date, "now").mockReturnValue(later);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(
      await screen.findByRole("heading", { name: "Lehrerbereich gesperrt" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Seiteninhalt")).not.toBeInTheDocument();
  });

  it("verlängert eine abgelaufene Sperre nicht durch Bedienung", async () => {
    renderShell("/lehrer/klassen");
    await userEvent.type(await screen.findByLabelText("PIN (6 Ziffern)"), PIN);
    await userEvent.click(screen.getByRole("button", { name: "Entsperren" }));
    expect(await screen.findByText("Seiteninhalt")).toBeInTheDocument();

    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + LOCK_IDLE_LIMIT_MS + 1000,
    );
    // Bedienung nach der Pause kommt zu spät.
    fireEvent.pointerDown(window);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(
      await screen.findByRole("heading", { name: "Lehrerbereich gesperrt" }),
    ).toBeInTheDocument();
  });

  it("hebt bei vergessener PIN die Sperre auf und löscht die Personendaten", async () => {
    await seed();
    renderShell("/lehrer/klassen");
    await userEvent.click(
      await screen.findByRole("button", { name: "PIN vergessen" }),
    );
    expect(
      screen.getByText(/Dabei werden die Personendaten auf diesem Gerät/),
    ).toBeInTheDocument();
    // Ohne Bestätigung ist noch nichts gelöscht.
    expect((await readCounts()).personal.students).toBe(1);

    await userEvent.click(
      screen.getByRole("button", {
        name: "Sperre aufheben und Personendaten löschen",
      }),
    );
    expect(await screen.findByText("Seiteninhalt")).toBeInTheDocument();
    expect(readPinVerifier()).toBeNull();
    expect(await readCounts()).toMatchObject({
      personal: { total: 0 },
      material: 1,
    });
  });
});
