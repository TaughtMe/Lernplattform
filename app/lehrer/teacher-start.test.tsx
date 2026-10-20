import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TeacherContentPackage } from "../../src/domain/teacher-content-library";
import { saveTeacherLiveRoom } from "../../src/integrations/laufdiktat/room-api";
import { LOCAL_DATA_AREAS } from "../../src/storage/local-data-boundaries";
import {
  createTeacherClassRepository,
  createTeacherContentLibraryRepository,
  createTeacherProfileRepository,
} from "../../src/storage/teacher-class-settings";
import { LIVE_INTENT_KEY } from "./live-intent";
import { TeacherStart } from "./teacher-start";
import { PROTECTION_NOTICE } from "./use-teacher-start";

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

const library = () => createTeacherContentLibraryRepository();

function renderAt(search = "") {
  window.history.replaceState(null, "", `/lehrer${search}`);
  return render(<TeacherStart />);
}

/** Titel der Zeilen im offenen Reiter, in Reihenfolge. */
const rowTitles = () =>
  within(screen.getByRole("tabpanel"))
    .queryAllByRole("button", { name: / bearbeiten$/ })
    .map((button) =>
      button.getAttribute("aria-label")!.replace(/ bearbeiten$/, ""),
    );

beforeEach(async () => {
  const classes = createTeacherClassRepository();
  await classes.put(course(CLASS_A, "Klasse 7b"));
  await classes.put(course(CLASS_B, "Klasse 8a"));
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

describe("Startseite: Vorbereitet und Archiv", () => {
  it("teilt die Inhalte der Klasse in Vorbereitet und Archiv", async () => {
    await library().putMany([
      entry("neu", {
        classIds: [CLASS_A],
        prepared: { gameMode: "STATION", stationCount: 5 },
        preparedAt: "2026-09-05T10:00:00.000Z",
      }),
      entry("gespeichert", { classIds: [CLASS_A] }),
      entry("gelaufen", {
        classIds: [CLASS_A, CLASS_B],
        lastUsedAt: "2026-09-10T10:00:00.000Z",
        prepared: { gameMode: "BATTLE" },
      }),
      entry("fremd", { classIds: [CLASS_B] }),
    ]);
    renderAt(`?klasse=${CLASS_A}`);
    await screen.findByRole("button", { name: "neu starten" });
    expect(rowTitles()).toEqual(["neu", "gespeichert"]);
    expect(screen.getByText("Stationen · 5 Stationen")).toBeInTheDocument();
    expect(screen.getByText("Laufdiktat · Standard")).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Vorbereitet für 7b/ }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Klasse 7b · Start")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: /Archiv/ }));
    expect(rowTitles()).toEqual(["gelaufen"]);
    expect(screen.getByText(/^Battle · durchgeführt/)).toBeInTheDocument();
    // Ein Eintrag für zwei Klassen: beide Chips, keine Kopie.
    expect(
      within(screen.getByRole("tabpanel")).getAllByText("8a").length,
    ).toBeGreaterThan(0);
  });

  it("holt einen Eintrag mit „Wieder vorbereiten“ aus dem Archiv", async () => {
    await library().put(
      entry("x", {
        classIds: [CLASS_A],
        lastUsedAt: "2026-09-10T10:00:00.000Z",
      }),
    );
    renderAt(`?klasse=${CLASS_A}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: /Archiv/ }));
    await user.click(
      await screen.findByRole("button", { name: "x wieder vorbereiten" }),
    );
    await waitFor(async () =>
      expect((await library().get("x"))?.preparedAt).toBeDefined(),
    );
    await user.click(screen.getByRole("tab", { name: /Vorbereitet/ }));
    expect(
      await screen.findByRole("button", { name: "x starten" }),
    ).toBeInTheDocument();
  });

  it("zeigt Leerzustände und ohne Profil den Schutzhinweis", async () => {
    renderAt(`?klasse=${CLASS_A}`);
    expect(
      await screen.findByText(/Für 7b ist nichts vorbereitet/),
    ).toBeInTheDocument();
    expect(screen.getByText(PROTECTION_NOTICE)).toBeInTheDocument();
    expect(
      screen.getByText("Hier liegt nichts, was noch nicht bei 7b ist."),
    ).toBeInTheDocument();
  });
});

describe("Startseite: Wege", () => {
  it("startet mit gespeichertem Modus und der Klasse direkt in die Lobby", async () => {
    await library().put(
      entry("x", {
        classIds: [CLASS_A],
        prepared: { gameMode: "BATTLE" },
      }),
    );
    renderAt(`?klasse=${CLASS_A}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "x starten" }));
    expect(window.location.pathname).toBe("/lehrer/live");
    expect(
      JSON.parse(window.sessionStorage.getItem(LIVE_INTENT_KEY) ?? "null"),
    ).toEqual({ contentId: "x", mode: "BATTLE", classId: CLASS_A });
  });

  it("führt Bearbeiten und die Kacheln in den Editor", async () => {
    await library().put(entry("x", { classIds: [CLASS_A] }));
    renderAt(`?klasse=${CLASS_A}`);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "x bearbeiten" }),
    );
    expect(window.location.pathname + window.location.search).toBe(
      `/lehrer/live?inhalt=x&schritt=inhalt&klasse=${CLASS_A}`,
    );
    expect(screen.getByRole("link", { name: /^Mathe/ })).toHaveAttribute(
      "href",
      `/lehrer/live?neu=math&klasse=${CLASS_A}`,
    );
    expect(screen.getByRole("link", { name: /^Vokabeln/ })).toHaveAttribute(
      "href",
      `/lehrer/live?neu=vocabulary&klasse=${CLASS_A}`,
    );
  });

  it("zeigt einen laufenden Raum dieses Fensters", async () => {
    saveTeacherLiveRoom({
      roomId: "123e4567-e89b-42d3-a456-426614174099",
      code: "4821",
      accessToken: "a".repeat(32),
      openedAt: new Date().toISOString(),
    });
    renderAt(`?klasse=${CLASS_A}`);
    expect(await screen.findByText("Raum 4821 läuft")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zum Raum" })).toHaveAttribute(
      "href",
      "/lehrer/live",
    );
  });

  it("zeigt keinen Raum, der nach 120 Minuten geschlossen ist", async () => {
    saveTeacherLiveRoom({
      roomId: "123e4567-e89b-42d3-a456-426614174099",
      code: "4821",
      accessToken: "a".repeat(32),
      openedAt: new Date(Date.now() - 121 * 60_000).toISOString(),
    });
    renderAt(`?klasse=${CLASS_A}`);
    await screen.findByText(/Für 7b ist nichts vorbereitet/);
    expect(screen.queryByText(/Raum 4821/)).not.toBeInTheDocument();
  });
});

describe("Startseite: Löschen", () => {
  it("löscht erst nach Rückfrage", async () => {
    await library().put(entry("weg", { classIds: [CLASS_A] }));
    renderAt(`?klasse=${CLASS_A}`);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "weg löschen" }),
    );
    const confirm = screen.getByRole("group", {
      name: "weg löschen bestätigen",
    });
    await user.click(within(confirm).getByRole("button", { name: "Nein" }));
    expect(await library().get("weg")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "weg löschen" }));
    await user.click(screen.getByRole("button", { name: "Ja" }));
    await waitFor(async () =>
      expect(await library().get("weg")).toBeUndefined(),
    );
  });

  it("nimmt einen geteilten Eintrag nur aus der Klasse oder löscht ihn überall", async () => {
    await library().putMany([
      entry("geteilt", { classIds: [CLASS_A, CLASS_B] }),
      entry("auch", { classIds: [CLASS_A, CLASS_B] }),
    ]);
    renderAt(`?klasse=${CLASS_A}`);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "geteilt löschen" }),
    );
    await user.click(screen.getByRole("button", { name: "Aus 7b entfernen" }));
    await waitFor(async () =>
      expect((await library().get("geteilt"))?.classIds).toEqual([CLASS_B]),
    );
    await user.click(screen.getByRole("button", { name: "auch löschen" }));
    await user.click(screen.getByRole("button", { name: "Überall löschen" }));
    await waitFor(async () =>
      expect(await library().get("auch")).toBeUndefined(),
    );
  });
});

describe("Startseite: Aus anderen Klassen holen", () => {
  it("holt einen nicht zugeordneten Eintrag mit „+ Auch für 7b“ und nimmt ihn wieder ab", async () => {
    await library().putMany([
      entry("frei", { title: "Französisch Farben" }),
      entry("acht", { title: "Englisch Unit 2", classIds: [CLASS_B] }),
    ]);
    renderAt(`?klasse=${CLASS_A}`);
    const user = userEvent.setup();
    const sources = await screen.findByRole("group", { name: "Quelle" });
    await waitFor(() =>
      expect(
        within(sources).getByRole("button", { name: /Nicht zugeordnet/ }),
      ).toHaveAttribute("aria-pressed", "true"),
    );
    expect(
      within(sources).getByRole("button", { name: /Klasse 8a/ }),
    ).toHaveTextContent("Klasse 8a1");

    await user.click(
      screen.getByRole("button", { name: "Französisch Farben auch für 7b" }),
    );
    await waitFor(async () =>
      expect((await library().get("frei"))?.classIds).toEqual([CLASS_A]),
    );
    // Er steht jetzt unter „Vorbereitet“ und bleibt unten mit Häkchen stehen.
    expect(
      await screen.findByRole("button", { name: "Französisch Farben starten" }),
    ).toBeInTheDocument();
    const undo = screen.getByRole("button", {
      name: "Französisch Farben bei 7b, wieder abnehmen",
    });
    expect(undo).toHaveTextContent("✓ Bei 7b");
    await user.click(undo);
    await waitFor(async () =>
      expect((await library().get("frei"))?.classIds).toEqual([]),
    );

    // Ein Eintrag einer anderen Klasse bekommt die Klasse dazu.
    await user.click(
      within(sources).getByRole("button", { name: /Klasse 8a/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "Englisch Unit 2 auch für 7b" }),
    );
    await waitFor(async () =>
      expect((await library().get("acht"))?.classIds).toEqual([
        CLASS_B,
        CLASS_A,
      ]),
    );
  });

  it("sucht in allen Klassen außer der eigenen", async () => {
    await library().putMany([
      entry("a", { title: "Herbst im Wald", classIds: [CLASS_B] }),
      entry("b", { title: "Herbstwörter" }),
      entry("c", { title: "Herbst bei 7b", classIds: [CLASS_A] }),
      entry("d", { title: "Winter" }),
    ]);
    renderAt(`?klasse=${CLASS_A}`);
    const user = userEvent.setup();
    await user.type(
      await screen.findByRole("searchbox", { name: "In allen Klassen suchen" }),
      "herbst",
    );
    const titles = screen
      .getAllByRole("button", { name: / auch für 7b$/ })
      .map((button) => button.getAttribute("aria-label"));
    expect(titles.sort()).toEqual([
      "Herbst im Wald auch für 7b",
      "Herbstwörter auch für 7b",
    ]);
    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "sommer");
    expect(screen.getByText("Nichts gefunden.")).toBeInTheDocument();
  });

  it("zeigt unter „Nicht zugeordnet“ keine Quelle zum Holen", async () => {
    await library().put(entry("frei"));
    renderAt("?klasse=ohne");
    expect(
      await screen.findByRole("button", { name: "frei starten" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Nicht zugeordnet · Start")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Aus anderen Klassen holen" }),
    ).not.toBeInTheDocument();
  });
});

describe("Startseite: Klassenwahl merken", () => {
  it("speichert die Wahl im Profil, wenn eines existiert", async () => {
    await createTeacherProfileRepository().put({
      id: "local-teacher",
      displayName: "Frau Test",
      school: "",
      email: "",
      subjects: [],
      lastLiveClassId: CLASS_A,
      updatedAt: "2026-09-01T10:00:00.000Z",
    });
    renderAt(`?klasse=${CLASS_B}`);
    await waitFor(async () =>
      expect(
        (await createTeacherProfileRepository().get())?.lastLiveClassId,
      ).toBe(CLASS_B),
    );
    expect(screen.queryByText(PROTECTION_NOTICE)).not.toBeInTheDocument();
  });
});
