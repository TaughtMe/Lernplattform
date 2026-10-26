import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundRoomPresence } from "./background-room-presence";
import { readActiveRoom, rememberActiveRoom } from "./room-activity";

const mocks = vi.hoisted(() => ({
  state: vi.fn(),
  touch: vi.fn(),
  channel: vi.fn(),
}));
vi.mock("../../src/integrations/laufdiktat/room-api", () => ({
  getLiveRoomState: mocks.state,
  touchLiveParticipant: mocks.touch,
}));
vi.mock("../../src/integrations/laufdiktat/live-room-client", () => ({
  getLiveRoomClient: () => ({ channel: mocks.channel }),
}));
const config = { url: "https://x.test", publishableKey: "key" };
const credentials = {
  roomId: "11111111-1111-4111-8111-111111111111",
  participantToken: "a".repeat(48),
};
beforeEach(() => {
  sessionStorage.clear();
  mocks.state.mockReset().mockResolvedValue({ status: "live" });
  mocks.touch.mockReset().mockResolvedValue(undefined);
  mocks.channel.mockReset().mockImplementation(() => {
    throw new Error("public channel forbidden");
  });
});

describe("authorized background activity", () => {
  it("uses the saved capability for practice presence and never broadcasts identity", async () => {
    rememberActiveRoom("1234", "participant-1", credentials);
    render(<BackgroundRoomPresence liveRoomConfig={config} enabled />);
    await waitFor(() =>
      expect(mocks.touch).toHaveBeenCalledWith(
        config,
        credentials.roomId,
        credentials.participantToken,
        "practice",
      ),
    );
    expect(mocks.state).toHaveBeenCalledWith(config, credentials.roomId, {
      participantToken: credentials.participantToken,
    });
    expect(mocks.channel).not.toHaveBeenCalled();
  });
  it("does not infer authority from a legacy room code or name", () => {
    rememberActiveRoom("1234", "participant-1");
    render(<BackgroundRoomPresence liveRoomConfig={config} enabled />);
    expect(mocks.touch).not.toHaveBeenCalled();
    expect(mocks.state).not.toHaveBeenCalled();
    expect(mocks.channel).not.toHaveBeenCalled();
  });
  it("forgets a revoked or ended membership without publishing a heartbeat", async () => {
    rememberActiveRoom("1234", "participant-1", credentials);
    mocks.state.mockResolvedValue(null);
    render(<BackgroundRoomPresence liveRoomConfig={config} enabled />);
    await waitFor(() => expect(readActiveRoom()).toBeNull());
    expect(mocks.touch).not.toHaveBeenCalled();
  });
});
