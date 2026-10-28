import "fake-indexeddb/auto";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  resolveStages,
  resolveVisibility,
  type ReleaseVisibility,
} from "../../src/domain/release";
import { LOCAL_DATA_AREAS } from "../../src/storage/local-data-boundaries";
import { createTeacherClassRepository } from "../../src/storage/teacher-class-settings";
import {
  readTeacherDevice,
  saveTeacherDevice,
} from "../../src/storage/teacher-device";
import {
  readPinVerifier,
  resetLockSession,
  TEACHER_LOCK_KEY,
} from "../../src/storage/teacher-lock";
import { ReleaseProvider } from "../release/release-context";
import { TeacherDataPanel } from "./teacher-workspace-manager";
import { TeacherDeviceSettings } from "./teacher-device-settings";

function renderWith(
  ui: React.ReactNode,
  visibility: Partial<ReleaseVisibility> = {},
) {
  const value = {
    ...resolveVisibility(resolveStages(undefined), false),
    "lehrer-geraet": true,
    ...visibility,
  };
  return render(<ReleaseProvider value={value}>{ui}</ReleaseProvider>);
}

beforeEach(() => {
  localStorage.clear();
  resetLockSession();
});

afterEach(async () => {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(LOCAL_DATA_AREAS.teacher);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
});

describe("TeacherDeviceSettings", () => {
  it("bleibt unsichtbar, solange der Bereich nicht freigegeben ist", () => {
    renderWith(<TeacherDeviceSettings />, { "lehrer-geraet": false });
    expect(screen.queryByText("Dieses Gerät")).not.toBeInTheDocument();
  });

  it("richtet eine PIN ein, speichert nur den Prüfwert und schaltet sie wieder aus", async () => {
    saveTeacherDevice("own", new Date());
    renderWith(<TeacherDeviceSettings />);
    await userEvent.type(screen.getByLabelText(/Neue PIN/), "482913");
    await userEvent.type(screen.getByLabelText("PIN wiederholen"), "482913");
    await userEvent.click(
      screen.getByRole("button", { name: "PIN festlegen" }),
    );

    expect(
      await screen.findByRole("button", { name: "Sperre ausschalten" }),
    ).toBeInTheDocument();
    const stored = localStorage.getItem(TEACHER_LOCK_KEY) ?? "";
    expect(stored).not.toContain("482913");
    expect(JSON.parse(stored)).toMatchObject({ v: 1, iterations: 600_000 });

    await userEvent.click(
      screen.getByRole("button", { name: "Sperre ausschalten" }),
    );
    expect(readPinVerifier()).toBeNull();
  }, 20_000);

  it("wechselt auf die Tafel, hebt die PIN-Sperre auf und bietet das Löschen an", async () => {
    saveTeacherDevice("own", new Date());
    await createTeacherClassRepository().put({
      id: "123e4567-e89b-42d3-a456-426614174001",
      name: "Klasse 7b",
      teacherName: "Frau Test",
      schoolYear: "2026/27",
      enabledModules: ["vocabulary"],
      createdAt: "2026-08-25T10:00:00.000Z",
      updatedAt: "2026-08-25T10:00:00.000Z",
    });
    localStorage.setItem(
      TEACHER_LOCK_KEY,
      JSON.stringify({
        v: 1,
        salt: "AAAAAAAAAAAAAAAAAAAAAA==",
        iterations: 1000,
        hash: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      }),
    );
    renderWith(<TeacherDeviceSettings />);
    await userEvent.click(screen.getByRole("radio", { name: /Tafel/ }));

    expect(readTeacherDevice()?.type).toBe("board");
    expect(readPinVerifier()).toBeNull();
    expect(
      await screen.findByRole("heading", {
        name: "Personendaten von diesem Gerät löschen?",
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Personendaten löschen" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: /Personendaten/ }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Die Personendaten wurden von diesem Gerät gelöscht.",
    );
  });
});

describe("Datenexport auf der Tafel (D3-2)", () => {
  it("zeigt „Daten auf diesem Gerät“ mit Export auf dem eigenen Gerät", () => {
    saveTeacherDevice("own", new Date());
    renderWith(<TeacherDataPanel />);
    expect(
      screen.getByRole("button", { name: /Sicherung exportieren/ }),
    ).toBeInTheDocument();
  });

  it("blendet Export und Import auf der Tafel aus", () => {
    saveTeacherDevice("board", new Date());
    renderWith(<TeacherDataPanel />);
    expect(
      screen.queryByRole("button", { name: /Sicherung exportieren/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Daten auf diesem Gerät"),
    ).not.toBeInTheDocument();
  });
});
