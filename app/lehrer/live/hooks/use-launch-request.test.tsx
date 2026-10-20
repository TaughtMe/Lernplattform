// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLaunchRequest } from "./use-launch-request";

const mocks = vi.hoisted(() => ({
  search: "",
  replace: vi.fn(),
  get: vi.fn(),
  takeLiveIntent: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock("../../../../src/storage/teacher-class-settings", () => ({
  createTeacherContentLibraryRepository: () => ({ get: mocks.get }),
}));
vi.mock("../../live-intent", () => ({ takeLiveIntent: mocks.takeLiveIntent }));

const ROOM = { roomId: "r", code: "1234", accessToken: "t" };

function setup(
  overrides: Partial<Parameters<typeof useLaunchRequest>[0]> = {},
) {
  const calls = {
    setError: vi.fn(),
    dispatchFlow: vi.fn(),
    setContentMode: vi.fn(),
    setSources: vi.fn(),
    setTitle: vi.fn(),
    setContentId: vi.fn(),
    resetTextLayout: vi.fn(),
    loadPairsFromTable: vi.fn(),
    setVocabularyLocales: vi.fn(),
    setShuffleWords: vi.fn(),
    setGameMode: vi.fn(),
    applyPreparedSettings: vi.fn(),
    chooseContentMode: vi.fn(),
    setClassChoice: vi.fn().mockResolvedValue(undefined),
    openLobby: vi.fn().mockResolvedValue(undefined),
  };
  const props = {
    hydrated: true,
    liveRoomConfig: { url: "https://x.test", publishableKey: "k" },
    restoreChecked: true,
    classesLoaded: true,
    room: null,
    busy: false,
    startRequested: false,
    liveClasses: [{ id: "k5" }],
    ...calls,
    ...overrides,
  };
  const hook = renderHook((p: typeof props) => useLaunchRequest(p), {
    initialProps: props,
  });
  return { ...hook, calls, props };
}

beforeEach(() => {
  mocks.search = "";
  mocks.replace.mockReset();
  mocks.get.mockReset().mockResolvedValue(undefined);
  mocks.takeLiveIntent.mockReset().mockReturnValue(undefined);
});

describe("useLaunchRequest: Adresse", () => {
  it("tut ohne Parameter und ohne Absicht nichts", () => {
    const { calls } = setup();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(calls.chooseContentMode).not.toHaveBeenCalled();
    expect(calls.dispatchFlow).not.toHaveBeenCalled();
  });

  it("wartet auf Wiederaufnahme, Klassen und die fertige Seite", () => {
    mocks.search = "neu=math";
    for (const gate of [
      { restoreChecked: false },
      { classesLoaded: false },
      { hydrated: false },
    ]) {
      mocks.replace.mockClear();
      const { calls } = setup(gate);
      expect(mocks.replace).not.toHaveBeenCalled();
      expect(calls.chooseContentMode).not.toHaveBeenCalled();
    }
  });

  it("öffnet „neu“ mit der gewählten Art und räumt die Adresse auf", async () => {
    mocks.search = "neu=math";
    const { calls } = setup();
    expect(mocks.replace).toHaveBeenCalledWith("/lehrer/live");
    await waitFor(() => expect(calls.setTitle).toHaveBeenCalledWith(""));
    expect(calls.chooseContentMode).toHaveBeenCalledWith("math");
    expect(calls.setContentId).toHaveBeenCalledWith(null);
  });

  it("wertet die Adresse genau einmal aus", async () => {
    mocks.search = "neu=text";
    const { calls, rerender, props } = setup();
    await waitFor(() =>
      expect(calls.chooseContentMode).toHaveBeenCalledTimes(1),
    );
    rerender({ ...props, busy: true });
    rerender({ ...props, busy: false });
    expect(calls.chooseContentMode).toHaveBeenCalledTimes(1);
    expect(mocks.replace).toHaveBeenCalledTimes(1);
  });

  it("zeigt den Schritt und setzt Modus und Klasse aus der Adresse", async () => {
    mocks.search = "neu=text&schritt=einstellungen&modus=BATTLE&klasse=k5";
    const { calls } = setup();
    await waitFor(() =>
      expect(calls.setClassChoice).toHaveBeenCalledWith("k5"),
    );
    expect(calls.setGameMode).toHaveBeenCalledWith("BATTLE");
    expect(calls.dispatchFlow).toHaveBeenCalledWith({
      type: "jumpToStage",
      stage: "settings",
      hasRoom: false,
    });
  });

  it("nimmt „ohne“ als keine Klasse und ignoriert unbekannte Klassen", async () => {
    mocks.search = "schritt=inhalt&klasse=ohne";
    const first = setup();
    await waitFor(() =>
      expect(first.calls.setClassChoice).toHaveBeenCalledWith(""),
    );
    mocks.search = "schritt=inhalt&klasse=unbekannt";
    const second = setup();
    await waitFor(() =>
      expect(second.calls.dispatchFlow).toHaveBeenCalledWith({
        type: "jumpToStage",
        stage: "content",
        hasRoom: false,
      }),
    );
    expect(second.calls.setClassChoice).not.toHaveBeenCalled();
  });

  it("meldet einen Inhalt, der nicht mehr in der Ablage liegt", async () => {
    mocks.search = "inhalt=weg";
    const { calls } = setup();
    await waitFor(() =>
      expect(calls.setError).toHaveBeenCalledWith(
        "Dieser Inhalt ist nicht mehr in der Ablage.",
      ),
    );
    expect(mocks.get).toHaveBeenCalledWith("weg");
  });

  it("übernimmt die Vorbereitung eines Inhalts, der Modus der Adresse geht vor", async () => {
    mocks.search = "inhalt=x&modus=UEBUNG";
    const prepared = { gameMode: "STATION" as const, stationCount: 6 };
    mocks.get.mockResolvedValue({
      id: "x",
      revision: 1,
      title: "Herbst",
      source: "Die Blätter fallen.",
      promptLocale: "en",
      answerLocale: "de",
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-01T08:00:00.000Z",
      kind: "text",
      prepared,
    });
    const { calls } = setup();
    await waitFor(() =>
      expect(calls.applyPreparedSettings).toHaveBeenCalledWith(prepared),
    );
    await waitFor(() =>
      expect(calls.setGameMode).toHaveBeenCalledWith("UEBUNG"),
    );
    expect(
      calls.applyPreparedSettings.mock.invocationCallOrder[0],
    ).toBeLessThan(calls.setGameMode.mock.invocationCallOrder[0]!);
  });

  it("meldet einen Fehler beim Laden aus der Ablage", async () => {
    mocks.search = "inhalt=x";
    mocks.get.mockRejectedValue(new Error("kaputt"));
    const { calls } = setup();
    await waitFor(() =>
      expect(calls.setError).toHaveBeenCalledWith(
        "Der Inhalt konnte nicht aus der Ablage geladen werden.",
      ),
    );
  });

  it("überschreibt bei offenem Raum nichts und sagt es", () => {
    mocks.search = "neu=math";
    const { calls } = setup({ room: ROOM });
    expect(calls.setError).toHaveBeenCalledWith(
      "Es ist schon ein Raum offen. Beende ihn zuerst, um einen anderen Inhalt zu laden.",
    );
    expect(calls.chooseContentMode).not.toHaveBeenCalled();
  });

  it("schweigt bei offenem Raum, wenn nur ein Schritt verlangt wird", () => {
    mocks.search = "schritt=inhalt";
    const { calls } = setup({ room: ROOM });
    expect(calls.setError).not.toHaveBeenCalled();
    expect(calls.dispatchFlow).not.toHaveBeenCalled();
  });
});

describe("useLaunchRequest: Start-Absicht", () => {
  it("setzt Modus und Klasse der Absicht, zeigt die Einstellungen und merkt „Jetzt starten“", async () => {
    mocks.takeLiveIntent.mockReturnValue({
      contentId: undefined,
      mode: "STATION",
      classId: "k5",
    });
    const { calls } = setup();
    await waitFor(() =>
      expect(calls.dispatchFlow).toHaveBeenCalledWith({
        type: "startRequested",
      }),
    );
    expect(calls.setGameMode).toHaveBeenCalledWith("STATION");
    expect(calls.setClassChoice).toHaveBeenCalledWith("k5");
    expect(calls.dispatchFlow).toHaveBeenCalledWith({
      type: "jumpToStage",
      stage: "settings",
      hasRoom: false,
    });
  });

  it("startet ohne Klasse, wenn die Klasse der Absicht unbekannt ist", async () => {
    mocks.takeLiveIntent.mockReturnValue({ mode: "UEBUNG", classId: "weg" });
    const { calls } = setup();
    await waitFor(() => expect(calls.setClassChoice).toHaveBeenCalledWith(""));
  });

  it("öffnet die Lobby genau einmal und verbraucht die Anfrage", () => {
    const { calls, rerender, props } = setup({ startRequested: true });
    expect(calls.dispatchFlow).toHaveBeenCalledWith({ type: "startHandled" });
    expect(calls.openLobby).toHaveBeenCalledTimes(1);
    rerender({ ...props, startRequested: true, busy: true });
    expect(calls.openLobby).toHaveBeenCalledTimes(1);
  });

  it("wartet, solange eine Anfrage läuft oder ein Raum offen ist", () => {
    for (const blocker of [{ busy: true }, { room: ROOM }]) {
      const { calls } = setup({ startRequested: true, ...blocker });
      expect(calls.openLobby).not.toHaveBeenCalled();
      expect(calls.dispatchFlow).not.toHaveBeenCalledWith({
        type: "startHandled",
      });
    }
  });

  it("meldet „geprüft“, wenn es keinen Raumdienst gibt", () => {
    const { calls } = setup({ liveRoomConfig: null });
    expect(calls.dispatchFlow).toHaveBeenCalledWith({ type: "restoreChecked" });
    const ready = setup();
    expect(ready.calls.dispatchFlow).not.toHaveBeenCalledWith({
      type: "restoreChecked",
    });
  });
});
