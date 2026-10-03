import "fake-indexeddb/auto";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOCAL_DATA_AREAS } from "../../../src/storage/local-data-boundaries";
import { TeacherLiveRoom } from "./teacher-live-room";

const mocks = vi.hoisted(() => ({
  openLiveRoom: vi.fn(),
  endLiveRoom: vi.fn(),
  updateLiveSession: vi.fn(),
  getLiveRoomState: vi.fn(),
  getLiveRoomStudents: vi.fn(),
  sent: [] as string[],
}));

vi.mock("../../../src/integrations/laufdiktat/live-room-client", () => {
  const channel = {
    on: () => channel,
    subscribe: () => channel,
    track: async () => "ok",
    send: async (message: { event: string }) => {
      mocks.sent.push(message.event);
      return "ok";
    },
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
  endLiveRoom: mocks.endLiveRoom,
  updateLiveSession: mocks.updateLiveSession,
  getLiveRoomParticipants: async () => [],
  getLiveRoomStudents: mocks.getLiveRoomStudents,
  getLiveRoomState: mocks.getLiveRoomState,
  saveTeacherLiveRoom: () => undefined,
  readTeacherLiveRoom: () => null,
  clearTeacherLiveRoom: () => undefined,
}));

const MINUTE = 60_000;
const OPENED = Date.UTC(2026, 9, 5, 8, 0, 0);
let nowMs = OPENED;
const clock = () => nowMs;
const clockTime = (offsetMinutes: number) =>
  new Date(OPENED + offsetMinutes * MINUTE).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

/** Zeitgeber der Seite, von Hand ausgelöst statt abgewartet. */
const timers = new Map<number, Array<() => void>>();
let intervalSpy: { mockRestore: () => void } | undefined;

async function fire(delay: number) {
  const latest = timers.get(delay)?.at(-1);
  expect(latest, `Zeitgeber ${delay} ms`).toBeDefined();
  await act(async () => {
    latest!();
  });
}
async function advance(minutes: number) {
  nowMs = OPENED + minutes * MINUTE;
  await fire(15_000);
}

async function openLiveStage() {
  const user = userEvent.setup();
  render(
    <TeacherLiveRoom
      liveRoomConfig={{ url: "https://x.test", publishableKey: "key" }}
      clock={clock}
    />,
  );
  const source = await screen.findByRole("textbox", { name: "Text" });
  await waitFor(() =>
    expect(
      source.closest("[data-hydrated]")?.getAttribute("data-hydrated"),
    ).toBe("true"),
  );
  await user.type(source, "Der Schulweg ist kurz.");
  await user.click(screen.getByRole("button", { name: "Weiter zu Modus" }));
  // Stationen lassen sich ohne beigetretene Kinder starten.
  await user.click(screen.getByRole("button", { name: /^Stationen/ }));
  await user.click(screen.getByRole("button", { name: "Raum öffnen" }));
  await screen.findByText("Code gilt bis " + clockTime(90));
  return user;
}

beforeEach(() => {
  nowMs = OPENED;
  timers.clear();
  mocks.sent.length = 0;
  mocks.openLiveRoom.mockReset().mockResolvedValue({
    roomId: "room-1",
    code: "4829",
    accessToken: "token",
  });
  mocks.endLiveRoom.mockReset().mockResolvedValue(undefined);
  mocks.updateLiveSession.mockReset().mockResolvedValue(undefined);
  mocks.getLiveRoomState.mockReset().mockResolvedValue({
    status: "live",
    sessionId: "s",
    config: {},
  });
  mocks.getLiveRoomStudents.mockReset().mockResolvedValue([]);
  const realSetInterval = window.setInterval.bind(window);
  intervalSpy = vi.spyOn(window, "setInterval").mockImplementation(((
    handler: TimerHandler,
    timeout?: number,
  ) => {
    if (timeout === 15_000 || timeout === 3_000) {
      timers.set(timeout, [
        ...(timers.get(timeout) ?? []),
        handler as () => void,
      ]);
      return 0;
    }
    return realSetInterval(handler, timeout);
  }) as typeof window.setInterval);
  URL.createObjectURL = vi.fn(() => "blob:csv");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    () => undefined,
  );
});

afterEach(async () => {
  intervalSpy?.mockRestore();
  vi.restoreAllMocks();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(LOCAL_DATA_AREAS.teacher);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
});

describe("Raumfristen der Lehrkraft (Entscheidung 52)", () => {
  it("zeigt in der Lobby, bis wann der Code gilt, und danach „Beitritt geschlossen“", async () => {
    await openLiveStage();
    expect(
      screen.getByText("Code gilt bis " + clockTime(90)),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "QR-Code vergrößern" }),
    ).toBeInTheDocument();

    await advance(91);
    expect(await screen.findByText("Beitritt geschlossen")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "QR-Code vergrößern" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Raumcode 4829" })).toBeNull();
  });

  it("weist ab 110 Minuten auf das Schließen und den CSV-Export hin", async () => {
    const user = await openLiveStage();
    await user.click(screen.getByRole("button", { name: "Sitzung starten" }));
    await screen.findByRole("button", { name: "Sitzung beenden" });
    await advance(109);
    expect(screen.queryByText(/Ergebnisse jetzt als CSV sichern/)).toBeNull();

    await advance(111);
    expect(
      await screen.findByText(/Raum schließt um/, { exact: false }),
    ).toHaveTextContent(`Raum schließt um ${clockTime(120)}.`);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Ergebnisse jetzt als CSV sichern",
    );
    expect(mocks.endLiveRoom).not.toHaveBeenCalled();
  });

  it("beendet den Raum bei 120 Minuten genau einmal und behält die CSV", async () => {
    const user = await openLiveStage();
    await user.click(screen.getByRole("button", { name: "Sitzung starten" }));
    await screen.findByRole("button", { name: "Sitzung beenden" });

    await advance(120);
    await screen.findByText(/Raum geschlossen\./);
    await advance(121);
    await advance(125);
    expect(mocks.endLiveRoom).toHaveBeenCalledTimes(1);
    expect(
      mocks.sent.filter((event) => event === "session-ended"),
    ).toHaveLength(1);

    // Ergebnisse und Export bleiben, bis ein neuer Raum geöffnet wird.
    const csv = screen.getAllByRole("button", { name: "Ergebnisse als CSV" });
    await user.click(csv[0]!);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: "Zurück" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Neuen Raum öffnen" }));
    expect(
      await screen.findByRole("textbox", { name: "Text" }),
    ).toBeInTheDocument();
    expect(mocks.endLiveRoom).toHaveBeenCalledTimes(1);
  });

  it("zeigt „Raum geschlossen“, wenn der Server den Raum beendet hat", async () => {
    const user = await openLiveStage();
    await user.click(screen.getByRole("button", { name: "Sitzung starten" }));
    await screen.findByRole("button", { name: "Sitzung beenden" });

    mocks.getLiveRoomState.mockResolvedValue({
      status: "ended",
      sessionId: "s",
      config: {},
    });
    await fire(3_000);
    await screen.findByText(/Raum geschlossen\./);
    // Das Gerät beendet nichts selbst, wenn der Server es schon getan hat.
    expect(mocks.endLiveRoom).not.toHaveBeenCalled();
    expect(
      screen.getAllByRole("button", { name: "Ergebnisse als CSV" })[0],
    ).toBeEnabled();
  });
});
