import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  resolveStages,
  resolveVisibility,
  type ReleaseVisibility,
} from "../../../src/domain/release";
import { LOCAL_DATA_AREAS } from "../../../src/storage/local-data-boundaries";
import {
  createTeacherClassRepository,
  createTeacherContentLibraryRepository,
  createTeacherProfileRepository,
} from "../../../src/storage/teacher-class-settings";
import { ReleaseProvider } from "../../release/release-context";
import { initialsOf, teacherAreaOf, teacherAreaTitle } from "./teacher-nav";
import { TeacherShell } from "./teacher-shell";

const CLASS_A = "123e4567-e89b-42d3-a456-426614174001";
const CLASS_B = "123e4567-e89b-42d3-a456-426614174002";

const course = (id: string, name: string) => ({
  id,
  name,
  teacherName: "Frau Test",
  schoolYear: "2026/27",
  enabledModules: ["vocabulary" as const],
  createdAt: `2026-08-25T10:0${id.slice(-1)}:00.000Z`,
  updatedAt: "2026-08-25T10:00:00.000Z",
});

const content = (id: string, classIds?: string[]) => ({
  id,
  revision: 1,
  title: id,
  source: "go;gehen",
  promptLocale: "en",
  answerLocale: "de",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-02T10:00:00.000Z",
  ...(classIds ? { classIds } : {}),
});

function renderShell(
  pathname: string,
  visibility?: Partial<ReleaseVisibility>,
) {
  window.history.replaceState(null, "", pathname);
  const value = {
    ...resolveVisibility(resolveStages(undefined), false),
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

afterEach(async () => {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(LOCAL_DATA_AREAS.teacher);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
  window.history.replaceState(null, "", "/");
});

describe("Bereich zur Adresse", () => {
  it("wählt den längsten passenden Eintrag", () => {
    expect(teacherAreaOf("/lehrer")).toBe("content");
    expect(teacherAreaOf("/lehrer/live")).toBe("live");
    expect(teacherAreaOf("/lehrer/live/x")).toBe("live");
    expect(teacherAreaOf("/lehrer/klassen")).toBe("classes");
    expect(teacherAreaOf("/lehrer/material")).toBe("material");
    expect(teacherAreaOf("/lehrer/unbekannt")).toBe("content");
    expect(teacherAreaTitle("live")).toBe("Räume");
  });

  it("bildet Initialen", () => {
    expect(initialsOf("Anna Beispiel")).toBe("AB");
    expect(initialsOf("anna")).toBe("A");
    expect(initialsOf("  ")).toBe("L");
    expect(initialsOf("Eva Maria Öztürk")).toBe("EÖ");
  });
});

describe("TeacherShell", () => {
  it("zeigt Klassen mit Schülerzahl, markiert die gewählte und verlinkt auf die Inhalte", async () => {
    const classes = createTeacherClassRepository();
    await classes.put(course(CLASS_A, "Klasse 7b"));
    await classes.put(course(CLASS_B, "Klasse 9a"));
    renderShell(`/lehrer?klasse=${CLASS_B}`);

    const sidebar = screen.getByRole("navigation", { name: "Lehrerbereich" });
    const second = await within(sidebar).findByRole("link", {
      name: /Klasse 9a/,
    });
    expect(second).toHaveAttribute("aria-current", "true");
    expect(second).toHaveAttribute("href", `/lehrer?klasse=${CLASS_B}`);
    expect(
      within(sidebar).getByRole("link", { name: /Klasse 7b/ }),
    ).not.toHaveAttribute("aria-current");
  });

  it("öffnet ohne Wahl die zuletzt genutzte Klasse, sonst die erste", async () => {
    const classes = createTeacherClassRepository();
    await classes.put(course(CLASS_A, "Klasse 7b"));
    await classes.put(course(CLASS_B, "Klasse 9a"));
    await createTeacherProfileRepository().put({
      id: "local-teacher",
      displayName: "Anna Beispiel",
      school: "",
      email: "",
      subjects: [],
      lastLiveClassId: CLASS_B,
      updatedAt: "2026-09-01T10:00:00.000Z",
    });
    renderShell("/lehrer/klassen");
    const sidebar = screen.getByRole("navigation", { name: "Lehrerbereich" });
    expect(
      await within(sidebar).findByRole("link", { name: /Klasse 9a/ }),
    ).toHaveAttribute("aria-current", "true");
    // Profil unten: Name aus dem Lehrerprofil, Link zur Startseite.
    expect(
      within(sidebar).getByRole("link", { name: "Anna Beispiel" }),
    ).toHaveAttribute("href", "/lehrer/einstellungen");
    expect(
      within(sidebar).getByRole("link", { name: "Zur Startseite" }),
    ).toHaveAttribute("href", "/");
  });

  it("zeigt „Nicht zugeordnet“ nur mit Inhalten ohne Klasse", async () => {
    const classes = createTeacherClassRepository();
    await classes.put(course(CLASS_A, "Klasse 7b"));
    await createTeacherContentLibraryRepository().putMany([
      content("zugeordnet", [CLASS_A]),
      content("frei-1"),
      content("frei-2", []),
    ]);
    renderShell("/lehrer");
    const sidebar = screen.getByRole("navigation", { name: "Lehrerbereich" });
    const entry = await within(sidebar).findByRole("link", {
      name: /Nicht zugeordnet/,
    });
    expect(entry).toHaveTextContent("2");
    expect(entry).toHaveAttribute("href", "/lehrer?klasse=ohne");
  });

  it("zeigt „Nicht zugeordnet“ nicht, wenn alles einer Klasse gehört", async () => {
    await createTeacherClassRepository().put(course(CLASS_A, "Klasse 7b"));
    await createTeacherContentLibraryRepository().put(content("x", [CLASS_A]));
    renderShell("/lehrer");
    const sidebar = screen.getByRole("navigation", { name: "Lehrerbereich" });
    await within(sidebar).findByRole("link", { name: /Klasse 7b/ });
    await waitFor(() =>
      expect(
        within(sidebar).queryByText("Nicht zugeordnet"),
      ).not.toBeInTheDocument(),
    );
  });

  it("markiert den Bereich nach Adresse und zeigt „Auswertung“ nicht", async () => {
    renderShell("/lehrer/live");
    const sidebar = screen.getByRole("navigation", { name: "Lehrerbereich" });
    expect(
      within(sidebar).getByRole("link", { name: "Räume" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(sidebar).getByRole("link", { name: "Inhalte" }),
    ).not.toHaveAttribute("aria-current");
    expect(screen.queryByText("Auswertung")).not.toBeInTheDocument();
    // Bereiche ohne Vorlage stehen unter „Verwalten“.
    expect(within(sidebar).getByText("Verwalten")).toBeInTheDocument();
    expect(
      within(sidebar).getByRole("link", { name: "Freigabe an Schüler" }),
    ).toHaveAttribute("href", "/lehrer/material");
  });

  it("blendet nicht freigegebene Bereiche aus", () => {
    renderShell("/lehrer", {
      "lehrer-live": false,
      "lehrer-aufgaben": false,
      motivation: false,
    });
    const sidebar = screen.getByRole("navigation", { name: "Lehrerbereich" });
    expect(
      within(sidebar).queryByRole("link", { name: "Räume" }),
    ).not.toBeInTheDocument();
    expect(
      within(sidebar).queryByRole("link", { name: "Aufgaben" }),
    ).not.toBeInTheDocument();
    expect(
      within(sidebar).queryByRole("link", { name: "Häuser" }),
    ).not.toBeInTheDocument();
    expect(
      within(sidebar).getByRole("link", { name: "Einstellungen" }),
    ).toBeInTheDocument();
  });

  it("öffnet die Schublade und schließt sie nach der Navigation", async () => {
    await createTeacherClassRepository().put(course(CLASS_A, "Klasse 7b"));
    renderShell("/lehrer");
    await userEvent.click(
      screen.getByRole("button", { name: "Klassen und Bereiche" }),
    );
    const drawer = screen.getByRole("dialog", { name: "Klassen und Bereiche" });
    await userEvent.click(within(drawer).getByRole("link", { name: "Räume" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("zeigt den Seiteninhalt und den Fuß, im Laufdiktat aber ohne Fuß", () => {
    const { unmount } = renderShell("/lehrer/material");
    expect(screen.getByText("Seiteninhalt")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Impressum" })).toBeInTheDocument();
    unmount();
    renderShell("/lehrer/live");
    expect(screen.getByText("Seiteninhalt")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Impressum" }),
    ).not.toBeInTheDocument();
  });
});
