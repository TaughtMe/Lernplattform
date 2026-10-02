import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LiveRoomJoin } from "./live-room-join";

const mocks = vi.hoisted(() => ({
  handlers: {} as Record<string, () => void>,
  ingestBundle: vi.fn(),
  getLiveRoomState: vi.fn(),
}));

vi.mock("../../src/integrations/laufdiktat/live-room-client", () => {
  const channel = {
    on(_type: string, filter: { event: string }, handler: () => void) {
      mocks.handlers[filter.event] = handler;
      return channel;
    },
    subscribe: () => channel,
    track: async () => "ok",
    send: async () => "ok",
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

vi.mock("../../src/integrations/laufdiktat/room-api", async (original) => ({
  ...(await original<object>()),
  joinLiveRoom: async () => ({
    roomId: "room-1",
    stationMode: false,
    status: "live",
    studentName: "participant-1",
    participantToken: "token",
    animalToken: null,
    animalNumber: 1,
  }),
  getLiveRoomState: mocks.getLiveRoomState,
  getLiveProgress: async () => null,
  touchLiveParticipant: async () => undefined,
  saveLiveProgress: async () => undefined,
}));

vi.mock("../../src/storage/personal-learning-events", () => ({
  createLearningBoxRepository: () => ({ ingestBundle: mocks.ingestBundle }),
  createPersonalLearningEventRepository: () => ({
    put: async () => undefined,
  }),
}));

const liveState = {
  status: "live",
  sessionId: "session-early",
  config: {
    words: [
      { id: "a", kind: "vocabulary", prompt: "house", targetWord: "Haus" },
      { id: "b", kind: "vocabulary", prompt: "tree", targetWord: "Baum" },
      { id: "c", kind: "vocabulary", prompt: "dog", targetWord: "Hund" },
    ],
    vocabularyTransfer: "all",
  },
};

describe("LiveRoomJoin", () => {
  it("prefills the room code and uses an icon-only camera action", () => {
    render(<LiveRoomJoin initialCode="4829" liveRoomConfig={null} />);

    expect(screen.getByRole("textbox", { name: "Ziffer 1" })).toHaveValue("4");
    expect(screen.getByRole("textbox", { name: "Ziffer 4" })).toHaveValue("9");
    const cameraButton = screen.getByRole("button", {
      name: "QR-Code mit Kamera scannen",
    });
    expect(cameraButton).toBeVisible();
    expect(cameraButton.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByText("Kamera")).not.toBeInTheDocument();
  });

  it("does not pretend that an unconfigured live room was joined", async () => {
    const user = userEvent.setup();
    render(<LiveRoomJoin initialCode="4829" liveRoomConfig={null} />);

    await user.click(screen.getByRole("button", { name: "Beitreten" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "noch nicht mit dem Laufdiktat-Raumdienst verbunden",
    );
    expect(screen.queryByText(/Du bist dabei/)).not.toBeInTheDocument();
  });

  describe("vorzeitiges Ende der Runde", () => {
    beforeEach(() => {
      window.sessionStorage.clear();
      window.localStorage.clear();
      mocks.ingestBundle.mockReset().mockResolvedValue({
        deckId: "deck",
        added: 3,
        reused: 0,
        practiceAgain: 0,
      });
      mocks.getLiveRoomState.mockReset().mockResolvedValue(liveState);
    });

    async function endRoundAfterFirstWord() {
      render(
        <LiveRoomJoin
          initialCode="4829"
          liveRoomConfig={{ url: "https://x.test", publishableKey: "key" }}
        />,
      );
      expect(await screen.findByText(/1 \/ 3/)).toBeVisible();
      await waitFor(() =>
        expect(mocks.handlers["session-ended"]).toBeDefined(),
      );
      // Das Kind hat Wort 1 geschafft und ist bei Wort 2.
      window.sessionStorage.setItem(
        "lernraum:live-trace:session-early",
        JSON.stringify({
          sessionId: "session-early",
          currentIndex: 1,
          finished: false,
          wordErrors: {},
          wordHelps: {},
        }),
      );
      mocks.getLiveRoomState.mockResolvedValue({
        status: "ended",
        sessionId: "session-early",
        config: {},
      });
      mocks.handlers["session-ended"]!();
    }

    it("übernimmt nicht erreichte Wörter und zeigt die Meldung", async () => {
      await endRoundAfterFirstWord();
      expect(
        await screen.findByRole("heading", {
          name: "Diese Runde ist beendet.",
        }),
      ).toBeVisible();
      await waitFor(() => expect(mocks.ingestBundle).toHaveBeenCalledTimes(1));
      expect(mocks.ingestBundle.mock.calls[0]![0].placements).toEqual({
        "live-session-early-a": "known",
        "live-session-early-b": "unseen",
        "live-session-early-c": "unseen",
      });
      expect(
        await screen.findByText(
          "3 neue Vokabeln sind jetzt in deiner LernBox.",
        ),
      ).toBeVisible();
    });

    it("übernimmt nichts, wenn die Runde schon abgeschlossen übernommen wurde", async () => {
      window.sessionStorage.setItem(
        "lernraum:live-transfer-done:session-early",
        JSON.stringify("3 neue Vokabeln sind jetzt in deiner LernBox."),
      );
      await endRoundAfterFirstWord();
      expect(
        await screen.findByText(
          "3 neue Vokabeln sind jetzt in deiner LernBox.",
        ),
      ).toBeVisible();
      expect(mocks.ingestBundle).not.toHaveBeenCalled();
    });
  });
});
