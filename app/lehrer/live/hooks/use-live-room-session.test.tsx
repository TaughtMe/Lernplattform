// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { useReducer } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildTeacherRoomConfig } from "../../../../src/integrations/laufdiktat/teacher-session";
import { initialLiveFlow, liveFlowReducer } from "../teacher-live-flow";
import { useLiveRoomSession } from "./use-live-room-session";

const mocks = vi.hoisted(() => ({
  openLiveRoom: vi.fn(),
  endLiveRoom: vi.fn(),
  updateLiveSession: vi.fn(),
  getLiveRoomState: vi.fn(),
  getLiveRoomParticipants: vi.fn(),
  getLiveRoomStudents: vi.fn(),
  removeLiveRoomParticipant: vi.fn(),
  readTeacherLiveRoom: vi.fn(),
  saveTeacherLiveRoom: vi.fn(),
  clearTeacherLiveRoom: vi.fn(),
  send: vi.fn(),
}));

vi.mock("../../../../src/integrations/laufdiktat/live-room-client", () => {
  const channel = {
    on: () => channel,
    subscribe: () => channel,
    send: mocks.send,
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
vi.mock(
  "../../../../src/integrations/laufdiktat/room-api",
  async (original) => ({
    ...(await original<object>()),
    openLiveRoom: mocks.openLiveRoom,
    endLiveRoom: mocks.endLiveRoom,
    updateLiveSession: mocks.updateLiveSession,
    getLiveRoomState: mocks.getLiveRoomState,
    getLiveRoomParticipants: mocks.getLiveRoomParticipants,
    getLiveRoomStudents: mocks.getLiveRoomStudents,
    removeLiveRoomParticipant: mocks.removeLiveRoomParticipant,
    readTeacherLiveRoom: mocks.readTeacherLiveRoom,
    saveTeacherLiveRoom: mocks.saveTeacherLiveRoom,
    clearTeacherLiveRoom: mocks.clearTeacherLiveRoom,
  }),
);

const CONFIG = { url: "https://x.test", publishableKey: "key" };
const OPENED = Date.UTC(2026, 9, 5, 8, 0, 0);
const ROOM = { roomId: "room-1", code: "4829", accessToken: "token" };
const roomConfig = buildTeacherRoomConfig({
  contentMode: "text",
  source: "Der Hund bellt.",
  vocabularyDirection: "left-to-right",
  vocabularyTransfer: "none",
  wordStoreTransfer: "errors",
  vocabularyTag: "",
  gameMode: "UEBUNG",
  shuffleWords: false,
  repeatWrongAnswers: true,
  isTtsEnabled: false,
  uebungMaxAttempts: 3,
  uebungAssistanceEnabled: true,
  showStars: true,
  strictTypingMode: false,
  showTaskAfterErrors: true,
  stationCount: 20,
  stationShuffle: true,
  battleOptions: { ink: true, flicker: true },
});

/** Eine feste Uhr: Sie ist eine Abhängigkeit des Wiederaufnahme-Effekts. */
const clock = () => OPENED;

type Overrides = Partial<Parameters<typeof useLiveRoomSession>[0]>;

function setup(overrides: Overrides = {}) {
  const applyRestoredContent = vi.fn();
  const storeContent = vi.fn().mockResolvedValue(undefined);
  const setError = vi.fn();
  const hook = renderHook(() => {
    const [flow, dispatchFlow] = useReducer(liveFlowReducer, initialLiveFlow);
    const session = useLiveRoomSession({
      hydrated: true,
      liveRoomConfig: CONFIG,
      clock,
      stage: flow.stage,
      roomClosed: flow.roomClosed,
      dispatchFlow,
      applyRestoredContent,
      setError,
      roomConfig,
      wordCount: 2,
      gameMode: "UEBUNG",
      storeContent,
      ...overrides,
    });
    return { flow, ...session, ...session.model };
  });
  return { ...hook, applyRestoredContent, storeContent, setError };
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) {
    if (typeof mock === "function") mock.mockReset();
  }
  mocks.openLiveRoom.mockResolvedValue(ROOM);
  mocks.endLiveRoom.mockResolvedValue(undefined);
  mocks.updateLiveSession.mockResolvedValue(undefined);
  mocks.getLiveRoomState.mockResolvedValue({
    status: "lobby",
    config: roomConfig,
  });
  mocks.getLiveRoomParticipants.mockResolvedValue([]);
  mocks.getLiveRoomStudents.mockResolvedValue([]);
  mocks.removeLiveRoomParticipant.mockResolvedValue(undefined);
  mocks.readTeacherLiveRoom.mockReturnValue(null);
  mocks.send.mockResolvedValue("ok");
});

describe("useLiveRoomSession: Raum öffnen", () => {
  it("meldet, wenn die Live-Räume nicht konfiguriert sind", async () => {
    const { result, setError } = setup({ liveRoomConfig: null });
    await act(() => result.current.openLobby());
    expect(setError).toHaveBeenLastCalledWith(
      expect.stringContaining("Live-Räume sind lokal noch nicht konfiguriert"),
    );
    expect(mocks.openLiveRoom).not.toHaveBeenCalled();
  });

  it("öffnet ohne Aufgaben keinen Raum", async () => {
    const { result, setError } = setup({ wordCount: 0 });
    await act(() => result.current.openLobby());
    expect(setError).toHaveBeenLastCalledWith(
      "Bitte gib mindestens eine gültige Aufgabe ein.",
    );
    expect(mocks.openLiveRoom).not.toHaveBeenCalled();
    expect(result.current.flow.busy).toBe(false);
  });

  it("öffnet die Lobby, merkt den Raum und legt den Inhalt ab", async () => {
    const { result, storeContent } = setup();
    await act(() => result.current.openLobby());
    expect(result.current.room).toEqual({
      ...ROOM,
      openedAt: new Date(OPENED).toISOString(),
    });
    expect(mocks.saveTeacherLiveRoom).toHaveBeenCalledWith(result.current.room);
    expect(result.current.flow).toMatchObject({ stage: "lobby", busy: false });
    // Die Lobby legt nur ab; durchgeführt ist der Inhalt erst mit der Sitzung.
    expect(storeContent).toHaveBeenCalledWith(false);
    expect(result.current.roomTimeline).not.toBeNull();
    expect(result.current.roomTimeState).not.toBeNull();
  });

  it("lässt die Lobby offen, wenn nur das Ablegen scheitert", async () => {
    const { result, setError } = setup({
      storeContent: vi.fn().mockRejectedValue(new Error("voll")),
    });
    await act(() => result.current.openLobby());
    await waitFor(() =>
      expect(setError).toHaveBeenLastCalledWith(
        "Der Raum ist offen, aber der Inhalt konnte nicht gespeichert werden.",
      ),
    );
    expect(result.current.flow.stage).toBe("lobby");
  });

  it("meldet einen Fehler beim Öffnen und gibt die Schaltfläche wieder frei", async () => {
    mocks.openLiveRoom.mockRejectedValue(new Error("offline"));
    const { result, setError } = setup();
    await act(() => result.current.openLobby());
    expect(setError).toHaveBeenLastCalledWith(
      "Der Raum konnte nicht geöffnet werden. Bitte prüfe die Verbindung.",
    );
    expect(result.current.room).toBeNull();
    expect(result.current.flow).toMatchObject({
      stage: "content",
      busy: false,
    });
  });
});

describe("useLiveRoomSession: Sitzung und Ende", () => {
  async function openRoom() {
    const harness = setup();
    await act(() => harness.result.current.openLobby());
    return harness;
  }

  it("startet die Sitzung über den autorisierten Server und markiert die Durchführung", async () => {
    const { result, storeContent } = await openRoom();
    await act(() => result.current.startSession());
    expect(storeContent).toHaveBeenLastCalledWith(true);
    expect(mocks.updateLiveSession).toHaveBeenCalledWith(
      CONFIG,
      result.current.room,
      expect.any(String),
      roomConfig,
    );
    expect(mocks.send).not.toHaveBeenCalled();
    expect(result.current.flow).toMatchObject({ stage: "live", busy: false });
  });

  it("lässt die Sitzung laufen, wenn nur das Markieren als durchgeführt scheitert", async () => {
    const storeContent = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("voll"));
    const { result, setError } = setup({ storeContent });
    await act(() => result.current.openLobby());
    await act(() => result.current.startSession());
    await waitFor(() =>
      expect(setError).toHaveBeenLastCalledWith(
        "Die Sitzung läuft, aber der Inhalt konnte nicht als durchgeführt gespeichert werden.",
      ),
    );
    expect(result.current.flow.stage).toBe("live");
  });

  it("startet nicht, wenn der Server die Änderung ablehnt", async () => {
    const { result, setError } = await openRoom();
    mocks.updateLiveSession.mockRejectedValue(new Error("Token abgelehnt"));
    await act(() => result.current.startSession());
    expect(setError).toHaveBeenLastCalledWith(
      "Die Sitzung konnte nicht sicher gestartet werden.",
    );
    expect(result.current.flow.stage).toBe("lobby");
    expect(result.current.flow.busy).toBe(false);
  });

  it("tut ohne Raum nichts", async () => {
    const { result } = setup();
    await act(() => result.current.startSession());
    await act(() => result.current.endRoom());
    expect(mocks.updateLiveSession).not.toHaveBeenCalled();
    expect(mocks.endLiveRoom).not.toHaveBeenCalled();
  });

  it("beendet den Raum, meldet es und kehrt zum Inhalt zurück", async () => {
    const { result } = await openRoom();
    await act(() => result.current.startSession());
    await act(() => result.current.endRoom());
    expect(mocks.endLiveRoom).toHaveBeenCalledTimes(1);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.clearTeacherLiveRoom).toHaveBeenCalled();
    expect(result.current.room).toBeNull();
    expect(result.current.participants).toEqual([]);
    expect(result.current.flow).toMatchObject({
      stage: "content",
      roomClosed: false,
      busy: false,
    });
  });

  it("lässt den Raum offen, wenn das Beenden scheitert", async () => {
    const { result, setError } = await openRoom();
    mocks.endLiveRoom.mockRejectedValue(new Error("offline"));
    await act(() => result.current.endRoom());
    expect(setError).toHaveBeenLastCalledWith(
      "Der Raum konnte nicht beendet werden.",
    );
    expect(result.current.room).not.toBeNull();
    expect(result.current.flow.busy).toBe(false);
  });

  it("schließt einen vom Server beendeten Raum in der Lobby und meldet es", async () => {
    vi.useFakeTimers();
    try {
      const { result, setError } = setup();
      await act(() => result.current.openLobby());
      mocks.getLiveRoomState.mockResolvedValue({ status: "ended" });
      await act(() => vi.advanceTimersByTimeAsync(8_000));
      expect(result.current.room).toBeNull();
      expect(setError).toHaveBeenLastCalledWith(
        "Der Raum wurde geschlossen. Du kannst einen neuen öffnen.",
      );
      expect(result.current.flow.stage).toBe("content");
    } finally {
      vi.useRealTimers();
    }
  });

  it("behält die Ergebnisse, wenn der Server den Raum im Live-Schritt beendet", async () => {
    vi.useFakeTimers();
    try {
      const { result } = setup();
      await act(() => result.current.openLobby());
      await act(() => result.current.startSession());
      mocks.getLiveRoomState.mockResolvedValue({ status: "ended" });
      await act(() => vi.advanceTimersByTimeAsync(3_000));
      expect(result.current.flow.roomClosed).toBe(true);
      expect(result.current.room).not.toBeNull();
      expect(result.current.roomTimeState).toBe("closed");
      expect(result.current.flow.stage).toBe("live");
    } finally {
      vi.useRealTimers();
    }
  });

  it("entfernt Teilnehmende und fragt danach neu ab", async () => {
    const { result } = await openRoom();
    mocks.getLiveRoomParticipants.mockClear();
    await act(() => result.current.removeParticipant("participant-1"));
    expect(mocks.removeLiveRoomParticipant).toHaveBeenCalledWith(
      CONFIG,
      result.current.room,
      "participant-1",
    );
    expect(mocks.getLiveRoomParticipants).toHaveBeenCalled();
  });
});

describe("useLiveRoomSession: Anzeige der Teilnehmenden", () => {
  it("zeigt Namen und Status ohne Anmeldung neutral an", async () => {
    const { result } = setup();
    await act(() => result.current.openLobby());
    expect(result.current.connectedNames).toEqual([]);
    expect(result.current.labelFor("participant-9")).toBe("Ohne Tier");
    expect(result.current.labelFor(null)).toBe("Unbekannt");
    expect(result.current.animalFor(null)).toBeNull();
    expect(result.current.statusFor("niemand")).toBe("offline");
  });
});

describe("useLiveRoomSession: Wiederaufnahme", () => {
  it("meldet „geprüft“, wenn kein Raum gespeichert ist", async () => {
    const { result, applyRestoredContent } = setup();
    await waitFor(() => expect(result.current.flow.restoreChecked).toBe(true));
    expect(applyRestoredContent).not.toHaveBeenCalled();
    expect(mocks.getLiveRoomState).not.toHaveBeenCalled();
  });

  it("nimmt einen offenen Raum samt Inhalt wieder auf und fragt den Server nur einmal", async () => {
    mocks.readTeacherLiveRoom.mockReturnValue({
      ...ROOM,
      openedAt: "2026-10-05T08:00:00.000Z",
    });
    mocks.getLiveRoomState.mockResolvedValue({
      status: "live",
      sessionId: "s1",
      config: roomConfig,
    });
    const { result, rerender, applyRestoredContent } = setup();
    await waitFor(() => expect(result.current.room?.roomId).toBe("room-1"));
    expect(applyRestoredContent).toHaveBeenCalledTimes(1);
    expect(result.current.room?.openedAt).toBe("2026-10-05T08:00:00.000Z");
    expect(result.current.flow).toMatchObject({
      stage: "live",
      restoreChecked: true,
    });
    rerender();
    rerender();
    expect(mocks.readTeacherLiveRoom).toHaveBeenCalledTimes(1);
    expect(applyRestoredContent).toHaveBeenCalledTimes(1);
  });

  it("prüft den gespeicherten Raum nicht bei jedem Rendern erneut", async () => {
    const { result, rerender } = setup();
    await waitFor(() => expect(result.current.flow.restoreChecked).toBe(true));
    rerender();
    rerender();
    rerender();
    expect(mocks.readTeacherLiveRoom).toHaveBeenCalledTimes(1);
  });

  it("setzt bei einem Raum ohne gemerkte Öffnungszeit den Moment der Wiederaufnahme", async () => {
    mocks.readTeacherLiveRoom.mockReturnValue(ROOM);
    const { result } = setup();
    await waitFor(() =>
      expect(result.current.room?.openedAt).toBe(
        new Date(OPENED).toISOString(),
      ),
    );
    expect(result.current.flow.stage).toBe("lobby");
  });

  it("verwirft einen beendeten Raum und meldet „geprüft“", async () => {
    mocks.readTeacherLiveRoom.mockReturnValue(ROOM);
    mocks.getLiveRoomState.mockResolvedValue({ status: "ended" });
    const { result, applyRestoredContent } = setup();
    await waitFor(() => expect(result.current.flow.restoreChecked).toBe(true));
    expect(mocks.clearTeacherLiveRoom).toHaveBeenCalled();
    expect(applyRestoredContent).not.toHaveBeenCalled();
    expect(result.current.room).toBeNull();
  });

  it("verwirft einen Raum, dessen Zustand sich nicht lesen lässt", async () => {
    mocks.readTeacherLiveRoom.mockReturnValue(ROOM);
    mocks.getLiveRoomState.mockRejectedValue(new Error("offline"));
    const { result } = setup();
    await waitFor(() => expect(result.current.flow.restoreChecked).toBe(true));
    expect(mocks.clearTeacherLiveRoom).toHaveBeenCalled();
    expect(result.current.room).toBeNull();
  });

  it("wartet mit der Wiederaufnahme, bis die Seite bereit ist", async () => {
    mocks.readTeacherLiveRoom.mockReturnValue(ROOM);
    const { result } = setup({ hydrated: false });
    await act(async () => undefined);
    expect(mocks.readTeacherLiveRoom).not.toHaveBeenCalled();
    expect(result.current.flow.restoreChecked).toBe(false);
  });
});
