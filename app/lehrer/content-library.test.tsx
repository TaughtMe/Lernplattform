import "fake-indexeddb/auto";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TeacherContentPackage } from "../../src/domain/teacher-content-library";
import { LOCAL_DATA_AREAS } from "../../src/storage/local-data-boundaries";
import {
  createTeacherClassRepository,
  createTeacherContentLibraryRepository,
  createTeacherProfileRepository,
} from "../../src/storage/teacher-class-settings";
import { ContentLibrary } from "./content-library";
import { LIVE_INTENT_KEY } from "./live-intent";
import { PROTECTION_NOTICE } from "./use-content-library";

const CLASS_A = "123e4567-e89b-42d3-a456-426614174001";
const CLASS_B = "123e4567-e89b-42d3-a456-426614174002";

const course = (id: string, name: string, archivedAt?: string) => ({
  id,
  name,
  teacherName: "Frau Test",
  schoolYear: "2026/27",
  enabledModules: ["vocabulary" as const],
  createdAt: `2026-08-25T10:0${id.slice(-1)}:00.000Z`,
  updatedAt: "2026-08-25T10:00:00.000Z",
  ...(archivedAt ? { archivedAt } : {}),
});

const entry = (
  id: string,
  extra: Partial<TeacherContentPackage> = {},
): TeacherContentPackage => ({
  id,
  revision: 1,
  title: id,
  source: "go;gehen",
  promptLocale: "en",
  answerLocale: "de",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-02T10:00:00.000Z",
  ...extra,
});

const profile = (lastLiveClassId?: string) => ({
  id: "local-teacher" as const,
  displayName: "Frau Test",
  school: "",
  email: "",
  subjects: [],
  updatedAt: "2026-09-01T10:00:00.000Z",
  ...(lastLiveClassId ? { lastLiveClassId } : {}),
});

function renderAt(search = "") {
  window.history.replaceState(null, "", `/lehrer${search}`);
  return render(<ContentLibrary />);
}

/** Titel der mobilen Liste (die Desktop-Liste zeigt dieselben Inhalte). */
const titles = () =>
  within(screen.getAllByRole("list")[0]!)
    .queryAllByRole("button")
    .map((button) =>
      button.getAttribute("aria-label")!.replace(/ öffnen$/, ""),
    );

beforeEach(async () => {
  const classes = createTeacherClassRepository();
  await classes.put(course(CLASS_A, "Klasse 7b"));
  await classes.put(course(CLASS_B, "Klasse 9a"));
});

afterEach(async () => {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(LOCAL_DATA_AREAS.teacher);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
  window.history.replaceState(null, "", "/");
  window.sessionStorage.clear();
});

describe("Inhalte-Seite: Filter nach Klasse", () => {
  it("zeigt nur die Inhalte der gewählten Klasse, neueste zuerst", async () => {
    await createTeacherContentLibraryRepository().putMany([
      entry("a-alt", {
        classIds: [CLASS_A],
        updatedAt: "2026-09-01T10:00:00.000Z",
      }),
      entry("a-neu", {
        classIds: [CLASS_A],
        lastUsedAt: "2026-09-10T10:00:00.000Z",
      }),
      entry("b", { classIds: [CLASS_B] }),
      entry("frei"),
    ]);
    renderAt(`?klasse=${CLASS_A}`);
    await screen.findAllByText("2 Inhalte");
    expect(titles().filter((_, i) => i < 2)).toEqual(["a-neu", "a-alt"]);
    expect(
      screen.queryByRole("button", { name: "b öffnen" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Text anlegen für Klasse 7b")).toBeInTheDocument();
  });

  it("zeigt unter „ohne“ die nicht zugeordneten Inhalte mit „Zuordnen“", async () => {
    await createTeacherContentLibraryRepository().putMany([
      entry("alt"),
      entry("a", { classIds: [CLASS_A] }),
    ]);
    renderAt("?klasse=ohne");
    expect(
      await screen.findByRole("button", { name: "alt zuordnen" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "a öffnen" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("1 Inhalt").length).toBeGreaterThan(0);
  });

  it("zeigt Inhalte mit nur archivierter Klasse unter „ohne“", async () => {
    await createTeacherClassRepository().archiveClass(CLASS_B);
    await createTeacherContentLibraryRepository().put(
      entry("x", { classIds: [CLASS_B] }),
    );
    renderAt("?klasse=ohne");
    expect(
      await screen.findByRole("button", { name: "x zuordnen" }),
    ).toBeInTheDocument();
  });

  it("fällt bei gelöschter oder archivierter Klasse auf die zuletzt genutzte zurück", async () => {
    await createTeacherProfileRepository().put(profile(CLASS_B));
    await createTeacherContentLibraryRepository().putMany([
      entry("b", { classIds: [CLASS_B] }),
      entry("a", { classIds: [CLASS_A] }),
    ]);
    renderAt("?klasse=123e4567-e89b-42d3-a456-426614174099");
    await screen.findAllByRole("button", { name: "b öffnen" });
    expect(titles()).toEqual(["b"]);
  });

  it("öffnet ohne Wahl und ohne Profil die erste Klasse", async () => {
    await createTeacherContentLibraryRepository().putMany([
      entry("a", { classIds: [CLASS_A] }),
      entry("b", { classIds: [CLASS_B] }),
    ]);
    renderAt();
    await screen.findAllByRole("button", { name: "a öffnen" });
    expect(titles()).toEqual(["a"]);
  });
});

describe("Inhalte-Seite: Klassenwahl merken", () => {
  it("speichert die Wahl im Profil, wenn eines existiert", async () => {
    await createTeacherProfileRepository().put(profile(CLASS_A));
    renderAt(`?klasse=${CLASS_B}`);
    await waitFor(async () =>
      expect(
        (await createTeacherProfileRepository().get())?.lastLiveClassId,
      ).toBe(CLASS_B),
    );
  });

  it("löscht die gemerkte Klasse bei „Nicht zugeordnet“", async () => {
    await createTeacherProfileRepository().put(profile(CLASS_A));
    renderAt("?klasse=ohne");
    await waitFor(async () =>
      expect(
        (await createTeacherProfileRepository().get())?.lastLiveClassId,
      ).toBeUndefined(),
    );
  });

  it("legt ohne Profil keines an und weist auf die Schutzgrenze hin", async () => {
    renderAt(`?klasse=${CLASS_B}`);
    expect(await screen.findByText(PROTECTION_NOTICE)).toBeInTheDocument();
    expect(await createTeacherProfileRepository().get()).toBeUndefined();
  });

  it("zeigt den Schutzhinweis nicht, wenn ein Profil existiert", async () => {
    await createTeacherProfileRepository().put(profile());
    renderAt();
    await screen.findAllByText("0 Inhalte");
    expect(screen.queryByText(PROTECTION_NOTICE)).not.toBeInTheDocument();
  });
});

describe("Inhalte-Seite: Zuordnen", () => {
  it("ordnet einen Inhalt zwei Klassen zu und aktualisiert die Liste", async () => {
    const library = createTeacherContentLibraryRepository();
    await library.put(entry("alt"));
    renderAt("?klasse=ohne");
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "alt zuordnen" }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Klassen zuordnen",
    });
    await user.click(
      within(dialog).getByRole("checkbox", { name: /Klasse 7b/ }),
    );
    await user.click(
      within(dialog).getByRole("checkbox", { name: /Klasse 9a/ }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect((await library.get("alt"))?.classIds).toEqual([CLASS_A, CLASS_B]);
    // Aus „ohne“ verschwunden, Hinweis statt leerer Liste.
    expect(
      await screen.findByText("Alles ist einer Klasse zugeordnet."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("0 Inhalte").length).toBeGreaterThan(0);
  });

  it("bricht ab, ohne zu speichern", async () => {
    const library = createTeacherContentLibraryRepository();
    await library.put(entry("alt"));
    renderAt("?klasse=ohne");
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "alt zuordnen" }),
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("checkbox", { name: /Klasse 7b/ }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Abbrechen" }));
    expect((await library.get("alt"))?.classIds).toBeUndefined();
  });
});

describe("Inhalte-Seite: Wege", () => {
  it("führt Bearbeiten, Öffnen, Neu anlegen und Raum öffnen zum Laufdiktat", async () => {
    await createTeacherContentLibraryRepository().put(
      entry("x", { classIds: [CLASS_A] }),
    );
    renderAt(`?klasse=${CLASS_A}`);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "x bearbeiten" }),
    );
    expect(window.location.search).toBe(
      `?inhalt=x&schritt=inhalt&klasse=${CLASS_A}`,
    );

    window.history.replaceState(null, "", `/lehrer?klasse=${CLASS_A}`);
    // Mobil (jsdom): die Kachel wählt nur die Art, „Weiter“ öffnet den Editor.
    await user.click(screen.getByRole("button", { name: /^Mathe/ }));
    expect(window.location.pathname).toBe("/lehrer");
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    expect(window.location.pathname + window.location.search).toBe(
      `/lehrer/live?neu=math&klasse=${CLASS_A}`,
    );

    window.history.replaceState(null, "", `/lehrer?klasse=${CLASS_A}`);
    await user.click(
      screen.getAllByRole("button", { name: "Raum öffnen" })[0]!,
    );
    expect(window.location.pathname).toBe("/lehrer/live");
  });
});

describe("Inhalte-Seite: Start-Overlay", () => {
  async function openSheet() {
    await createTeacherContentLibraryRepository().put(
      entry("x", { title: "Tiere", classIds: [CLASS_A, CLASS_B] }),
    );
    renderAt(`?klasse=${CLASS_A}`);
    const user = userEvent.setup();
    const open = await screen.findAllByRole("button", { name: "Tiere öffnen" });
    await user.click(open[0]!);
    return {
      user,
      dialog: await screen.findByRole("dialog", { name: "Raum öffnen" }),
    };
  }

  it("zeigt Titel, Klassen und die vier echten Modi", async () => {
    const { dialog } = await openSheet();
    expect(within(dialog).getByText("Tiere")).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Zugeordnet zu Klassen 7b, 9a/),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Raum für Klasse 7b")).toBeInTheDocument();
    for (const mode of ["Laufdiktat", "Freie Übung", "Battle", "Stationen"]) {
      expect(
        within(dialog).getByRole("button", { name: new RegExp(`^${mode}`) }),
      ).toBeInTheDocument();
    }
    expect(
      within(dialog).getByText(/Code gilt 90 Minuten/),
    ).toBeInTheDocument();
  });

  it("„Jetzt starten“ schreibt die Absicht einmalig und geht zum Laufdiktat", async () => {
    const { user, dialog } = await openSheet();
    await user.click(within(dialog).getByRole("button", { name: /^Battle/ }));
    await user.click(
      within(dialog).getByRole("button", { name: "Jetzt starten · Battle" }),
    );
    expect(window.location.pathname).toBe("/lehrer/live");
    expect(JSON.parse(window.sessionStorage.getItem(LIVE_INTENT_KEY)!)).toEqual(
      {
        contentId: "x",
        mode: "BATTLE",
        classId: CLASS_A,
      },
    );
  });

  it("startet aus „Nicht zugeordnet“ ohne Klasse", async () => {
    await createTeacherContentLibraryRepository().put(
      entry("y", { title: "Frei" }),
    );
    renderAt("?klasse=ohne");
    const user = userEvent.setup();
    await user.click(
      (await screen.findAllByRole("button", { name: "Frei öffnen" }))[0]!,
    );
    const dialog = await screen.findByRole("dialog", { name: "Raum öffnen" });
    expect(within(dialog).getByText(/Nicht zugeordnet/)).toBeInTheDocument();
    expect(within(dialog).getByText("Raum ohne Klasse")).toBeInTheDocument();
    expect(
      within(dialog).getByText(/keine Schreiberleichterung/),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: /^Jetzt starten/ }),
    );
    expect(
      JSON.parse(window.sessionStorage.getItem(LIVE_INTENT_KEY)!),
    ).toMatchObject({
      contentId: "y",
      classId: "",
    });
  });

  it("„Alle Optionen“ öffnet den Schritt Einstellungen mit dem Inhalt", async () => {
    const { user, dialog } = await openSheet();
    await user.click(
      within(dialog).getByRole("button", { name: "Alle Optionen" }),
    );
    expect(window.location.pathname + window.location.search).toBe(
      `/lehrer/live?inhalt=x&schritt=einstellungen&modus=LAUFDIKTAT&klasse=${CLASS_A}`,
    );
    expect(window.sessionStorage.getItem(LIVE_INTENT_KEY)).toBeNull();
  });

  it("öffnet über „ändern“ den Zuordnen-Dialog", async () => {
    const { user, dialog } = await openSheet();
    await user.click(within(dialog).getByRole("button", { name: /ändern/ }));
    expect(
      await screen.findByRole("dialog", { name: "Klassen zuordnen" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Raum öffnen" }),
    ).not.toBeInTheDocument();
  });

  it("schließt per Escape", async () => {
    const { dialog } = await openSheet();
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });
});
