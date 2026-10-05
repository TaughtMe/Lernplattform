import "fake-indexeddb/auto";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildTeacherRoomConfig } from "../../../src/integrations/laufdiktat/teacher-session";
import type { TeacherContentPackage } from "../../../src/domain/teacher-content-library";
import { LOCAL_DATA_AREAS } from "../../../src/storage/local-data-boundaries";
import {
  createTeacherClassRepository,
  createTeacherContentLibraryRepository,
  createTeacherProfileRepository,
} from "../../../src/storage/teacher-class-settings";
import { LIVE_INTENT_KEY } from "../live-intent";
import { TeacherLiveRoom } from "./teacher-live-room";

const mocks = vi.hoisted(() => ({
  openLiveRoom: vi.fn(),
  getLiveRoomState: vi.fn(),
  readTeacherLiveRoom: vi.fn(),
}));

vi.mock("../../../src/integrations/laufdiktat/live-room-client", () => {
  const channel = {
    on: () => channel,
    subscribe: () => channel,
    track: async () => "ok",
    send: async () => "ok",
    presenceState: () => ({}),
    state: "joined",
  };
  return {
    getLiveRoomClient: () => ({
      channel: () => channel,
      removeChannel: async () => "ok",
      realtime: { connect: () => undefined },
    }),
  };
});

vi.mock("../../../src/integrations/laufdiktat/room-api", async (original) => ({
  ...(await original<object>()),
  openLiveRoom: mocks.openLiveRoom,
  getLiveRoomParticipants: async () => [],
  getLiveRoomStudents: async () => [],
  getLiveRoomState: mocks.getLiveRoomState,
  saveTeacherLiveRoom: () => undefined,
  readTeacherLiveRoom: mocks.readTeacherLiveRoom,
  clearTeacherLiveRoom: () => undefined,
}));

const CLASS_A = "123e4567-e89b-42d3-a456-426614174001";

const entry = (
  id: string,
  extra: Partial<TeacherContentPackage> = {},
): TeacherContentPackage => ({
  id,
  revision: 2,
  title: id,
  source: "Der Hund läuft. Die Katze schläft.",
  promptLocale: "en",
  answerLocale: "de",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-02T10:00:00.000Z",
  kind: "text",
  ...extra,
});

const library = () => createTeacherContentLibraryRepository();

function renderRoom() {
  return render(
    <TeacherLiveRoom
      liveRoomConfig={{ url: "https://x.test", publishableKey: "key" }}
    />,
  );
}

async function waitHydrated() {
  const marker = await waitFor(() => {
    const node = document.querySelector("[data-hydrated]");
    expect(node?.getAttribute("data-hydrated")).toBe("true");
    return node;
  });
  return marker;
}

beforeEach(async () => {
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/lehrer/live");
  mocks.openLiveRoom.mockReset().mockResolvedValue({
    roomId: "room-1",
    code: "4829",
    accessToken: "token",
  });
  mocks.getLiveRoomState.mockReset().mockResolvedValue(null);
  mocks.readTeacherLiveRoom.mockReset().mockReturnValue(null);
  await createTeacherClassRepository().put({
    id: CLASS_A,
    name: "Klasse 7b",
    teacherName: "Frau Test",
    schoolYear: "2026/27",
    enabledModules: ["vocabulary"],
    createdAt: "2026-08-25T10:00:00.000Z",
    updatedAt: "2026-08-25T10:00:00.000Z",
  });
});

afterEach(async () => {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(LOCAL_DATA_AREAS.teacher);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
  window.history.replaceState(null, "", "/");
});

describe("Inhalt aus der Ablage laden", () => {
  it("lädt einen Text samt Titel in den Editor und räumt die Adresse auf", async () => {
    await library().put(entry("t1", { title: "Tiere", textSplit: "zeile" }));
    window.history.replaceState(
      null,
      "",
      "/lehrer/live?inhalt=t1&schritt=inhalt",
    );
    renderRoom();
    const source = await screen.findByRole("textbox", { name: "Text" });
    await waitFor(() =>
      expect(source).toHaveValue("Der Hund läuft. Die Katze schläft."),
    );
    expect(screen.getByRole("textbox", { name: "Titel" })).toHaveValue("Tiere");
    expect(screen.getByRole("button", { name: "Zeile" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(window.location.pathname).toBe("/lehrer/live");
    // Es wurde kein Raum erstellt.
    expect(mocks.openLiveRoom).not.toHaveBeenCalled();
  });

  it("lädt Vokabeln mit ihren Sprachen", async () => {
    await library().put(
      entry("v1", {
        kind: "vocabulary",
        source: "go;gehen\nsee;sehen",
        promptLocale: "fr-FR",
        answerLocale: "de-DE",
      }),
    );
    window.history.replaceState(null, "", "/lehrer/live?inhalt=v1");
    renderRoom();
    expect(
      await screen.findByRole("textbox", { name: "Vokabel 2" }),
    ).toHaveValue("see");
    expect(screen.getByRole("combobox", { name: "Sprache links" })).toHaveValue(
      "fr-FR",
    );
  });

  it("lädt Mathe-Aufgaben", async () => {
    await library().put(entry("m1", { kind: "math", source: "3+4\n6+1" }));
    window.history.replaceState(null, "", "/lehrer/live?inhalt=m1");
    renderRoom();
    expect(await screen.findByText("2 Aufgaben")).toBeInTheDocument();
  });

  it("öffnet „neu“ mit der gewählten Art und „einstellungen“ im Modus-Schritt", async () => {
    window.history.replaceState(null, "", "/lehrer/live?neu=math");
    const { unmount } = renderRoom();
    expect(await screen.findByText("0 Aufgaben")).toBeInTheDocument();
    unmount();

    await library().put(entry("t1"));
    window.history.replaceState(
      null,
      "",
      "/lehrer/live?inhalt=t1&schritt=einstellungen&modus=BATTLE",
    );
    renderRoom();
    expect(
      await screen.findByRole("heading", { name: "Modus und Optionen" }),
    ).toBeInTheDocument();
  });

  it("meldet einen fehlenden Inhalt, statt zu schweigen", async () => {
    window.history.replaceState(null, "", "/lehrer/live?inhalt=gibt-es-nicht");
    renderRoom();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "nicht mehr in der Ablage",
    );
  });
});

describe("Speichern und Löschen", () => {
  it("legt genau ein Paket an, hält die Revision bei Gleichem und erhöht sie bei Änderung", async () => {
    renderRoom();
    await waitHydrated();
    const user = userEvent.setup();
    await user.type(
      await screen.findByRole("textbox", { name: "Text" }),
      "Eins. Zwei.",
    );
    await user.type(screen.getByRole("textbox", { name: "Titel" }), "Zahlen");
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(
      await screen.findByText("„Zahlen“ ist gespeichert."),
    ).toBeInTheDocument();

    let stored = await library().list();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      title: "Zahlen",
      kind: "text",
      revision: 0,
      source: "Eins. Zwei.",
    });

    await user.click(screen.getByRole("button", { name: "Speichern" }));
    stored = await library().list();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.revision).toBe(0);

    await user.type(screen.getByRole("textbox", { name: "Text" }), " Drei.");
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    await waitFor(async () =>
      expect((await library().list())[0]?.revision).toBe(1),
    );
    expect(await library().list()).toHaveLength(1);
  });

  it("ordnet neue Inhalte der Klasse aus der Adresse zu, auch ohne Profil", async () => {
    window.history.replaceState(
      null,
      "",
      `/lehrer/live?neu=text&klasse=${CLASS_A}`,
    );
    renderRoom();
    const user = userEvent.setup();
    const source = await screen.findByRole("textbox", { name: "Text" });
    await waitFor(() => expect(window.location.search).toBe(""));
    await user.type(source, "Eins. Zwei.");
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    await waitFor(async () => expect(await library().list()).toHaveLength(1));
    expect((await library().list())[0]?.classIds).toEqual([CLASS_A]);
  });

  it("ordnet unbekannte Klassen in der Adresse nicht zu", async () => {
    window.history.replaceState(
      null,
      "",
      "/lehrer/live?neu=text&klasse=123e4567-e89b-42d3-a456-426614174099",
    );
    renderRoom();
    const user = userEvent.setup();
    const source = await screen.findByRole("textbox", { name: "Text" });
    await waitFor(() => expect(window.location.search).toBe(""));
    await user.type(source, "Eins.");
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    await waitFor(async () => expect(await library().list()).toHaveLength(1));
    expect((await library().list())[0]?.classIds).toBeUndefined();
  });

  it("legt nichts Leeres ab", async () => {
    renderRoom();
    await waitHydrated();
    await userEvent.click(
      await screen.findByRole("button", { name: "Speichern" }),
    );
    expect(await screen.findByText(/Gib zuerst etwas ein/)).toBeInTheDocument();
    expect(await library().list()).toEqual([]);
  });

  it("löscht erst nach Bestätigung", async () => {
    await library().put(entry("t1", { title: "Tiere" }));
    window.history.replaceState(
      null,
      "",
      "/lehrer/live?inhalt=t1&schritt=inhalt",
    );
    renderRoom();
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Aus der Ablage löschen" }),
    );
    expect(await library().get("t1")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(await library().get("t1")).toBeDefined();

    await user.click(
      screen.getByRole("button", { name: "Aus der Ablage löschen" }),
    );
    await user.click(screen.getByRole("button", { name: "Ja, löschen" }));
    await waitFor(async () =>
      expect(await library().get("t1")).toBeUndefined(),
    );
    expect(
      await screen.findByText("„Tiere“ wurde aus der Ablage gelöscht."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Aus der Ablage löschen" }),
    ).not.toBeInTheDocument();
  });

  it("bietet „Löschen“ bei neuem Inhalt nicht an", async () => {
    renderRoom();
    await waitHydrated();
    expect(
      screen.queryByRole("button", { name: "Aus der Ablage löschen" }),
    ).not.toBeInTheDocument();
  });
});

describe("Lobby öffnen legt automatisch ab", () => {
  async function openLobbyWithText(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Weiter zu Modus" }));
    await user.click(screen.getByRole("button", { name: "Raum öffnen" }));
    await waitFor(() => expect(mocks.openLiveRoom).toHaveBeenCalledTimes(1));
  }

  it("legt ein neues Paket mit Titelvorschlag, Klasse und Nutzungsdatum an", async () => {
    await createTeacherProfileRepository().put({
      id: "local-teacher",
      displayName: "Frau Test",
      school: "",
      email: "",
      subjects: [],
      lastLiveClassId: CLASS_A,
      updatedAt: "2026-09-01T10:00:00.000Z",
    });
    renderRoom();
    await waitHydrated();
    const user = userEvent.setup();
    await user.type(
      await screen.findByRole("textbox", { name: "Text" }),
      "Der Schulweg ist kurz.",
    );
    await openLobbyWithText(user);
    await waitFor(async () => expect(await library().list()).toHaveLength(1));
    const [stored] = await library().list();
    expect(stored).toMatchObject({
      title: "Der Schulweg ist kurz.",
      kind: "text",
      classIds: [CLASS_A],
      revision: 0,
    });
    expect(stored?.lastUsedAt).toBeDefined();
  });

  it("aktualisiert das geladene Paket statt ein zweites anzulegen", async () => {
    await library().put(entry("t1", { title: "Tiere", revision: 3 }));
    window.history.replaceState(
      null,
      "",
      "/lehrer/live?inhalt=t1&schritt=inhalt",
    );
    renderRoom();
    const user = userEvent.setup();
    await screen.findByRole("textbox", { name: "Titel" });
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Titel" })).toHaveValue(
        "Tiere",
      ),
    );
    await openLobbyWithText(user);
    await waitFor(async () =>
      expect((await library().get("t1"))?.lastUsedAt).toBeDefined(),
    );
    expect(await library().list()).toHaveLength(1);
    // Nichts geändert: Revision bleibt.
    expect((await library().get("t1"))?.revision).toBe(3);
  });
});

describe("Start-Absicht", () => {
  const intent = { contentId: "t1", mode: "STATION", classId: CLASS_A };

  it("öffnet die Lobby genau einmal und verbraucht die Absicht", async () => {
    await library().put(entry("t1", { classIds: [CLASS_A] }));
    window.sessionStorage.setItem(LIVE_INTENT_KEY, JSON.stringify(intent));
    const first = renderRoom();
    await waitFor(() => expect(mocks.openLiveRoom).toHaveBeenCalledTimes(1));
    expect(window.sessionStorage.getItem(LIVE_INTENT_KEY)).toBeNull();
    const config = mocks.openLiveRoom.mock.calls[0]![1] as Record<
      string,
      unknown
    >;
    expect(config["stationMode"]).toBe(true);
    expect(config["classSeal"]).toBeDefined();
    expect(
      await screen.findByRole("img", { name: "Raumcode 4829" }),
    ).toBeDefined();

    // Neu laden (ohne gespeicherten Raum im Test): kein zweiter Raum.
    first.unmount();
    renderRoom();
    await waitHydrated();
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(mocks.openLiveRoom).toHaveBeenCalledTimes(1);
  });

  it("startet ohne Klasse, wenn die Absicht keine nennt", async () => {
    await library().put(entry("t1"));
    window.sessionStorage.setItem(
      LIVE_INTENT_KEY,
      JSON.stringify({ ...intent, mode: "LAUFDIKTAT", classId: "" }),
    );
    renderRoom();
    await waitFor(() => expect(mocks.openLiveRoom).toHaveBeenCalledTimes(1));
    expect(mocks.openLiveRoom.mock.calls[0]![1]).not.toHaveProperty(
      "classSeal",
    );
  });

  it("ignoriert eine kaputte Absicht", async () => {
    window.sessionStorage.setItem(LIVE_INTENT_KEY, "{kaputt");
    renderRoom();
    await waitHydrated();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mocks.openLiveRoom).not.toHaveBeenCalled();
  });

  it("überschreibt bei offenem Raum nichts", async () => {
    await library().put(entry("t1", { title: "Tiere" }));
    const stored = {
      roomId: "room-0",
      code: "1111",
      accessToken: "a".repeat(32),
    };
    mocks.readTeacherLiveRoom.mockReturnValue(stored);
    mocks.getLiveRoomState.mockResolvedValue({
      status: "lobby",
      sessionId: null,
      config: buildTeacherRoomConfig({
        contentMode: "text",
        source: "Offener Raum.",
        vocabularyDirection: "left-to-right",
        gameMode: "LAUFDIKTAT",
        shuffleWords: false,
        repeatWrongAnswers: true,
      }),
    });
    window.sessionStorage.setItem(LIVE_INTENT_KEY, JSON.stringify(intent));
    window.history.replaceState(null, "", "/lehrer/live?inhalt=t1");
    renderRoom();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Es ist schon ein Raum offen",
    );
    expect(mocks.openLiveRoom).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(LIVE_INTENT_KEY)).toBeNull();
    expect(
      await screen.findByRole("img", { name: "Raumcode 1111" }),
    ).toBeInTheDocument();
    expect((await library().get("t1"))?.title).toBe("Tiere");
  });
});
