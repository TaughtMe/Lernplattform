import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLiveRoomActivity, sendLiveRoomAttack } from "./room-activity-api";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("./live-room-client", () => ({ getLiveRoomClient: () => ({ rpc }) }));
const config = { url: "http://localhost", publishableKey: "public-test-key" };
const room = {
  roomId: "11111111-1111-4111-8111-111111111111",
  participantToken: "a".repeat(48),
};
beforeEach(() => rpc.mockReset());

describe("authorized room activity", () => {
  it("sends the room/session capability without a claimed sender", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await expect(
      sendLiveRoomAttack(config, room, "session", "participant-target", "ink"),
    ).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith("send_room_attack_secure", {
      p_room_id: room.roomId,
      p_participant_token: room.participantToken,
      p_session_id: "session",
      p_target: "participant-target",
      p_type: "ink",
    });
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(
      sendLiveRoomAttack(config, room, "session", "target", "ink"),
    ).resolves.toBe(false);
  });

  it("rejects unauthorized or malformed responses without a public fallback", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "Token abgelehnt" },
    });
    await expect(
      getLiveRoomActivity(config, room, "session", 0),
    ).rejects.toThrow("Token abgelehnt");
    await expect(
      sendLiveRoomAttack(config, room, "session", "target", "ink"),
    ).rejects.toThrow("Token abgelehnt");
    rpc.mockResolvedValue({
      data: { peers: [{ key: "forged", index: -1 }], attacks: [] },
      error: null,
    });
    await expect(
      getLiveRoomActivity(config, room, "session", 0),
    ).rejects.toThrow();
  });

  it("reads minimal validated peer data and only attacks after the delivered cursor", async () => {
    const data = {
      peers: [{ key: "participant-1", animal: "Fuchs", number: 2, index: 3 }],
      attacks: [{ id: 42, from: "Fuchs 2", type: "ink" }],
    };
    rpc.mockResolvedValue({ data, error: null });
    await expect(
      getLiveRoomActivity(config, room, "session", 41),
    ).resolves.toEqual(data);
    expect(rpc).toHaveBeenCalledWith("get_room_activity_secure", {
      p_room_id: room.roomId,
      p_participant_token: room.participantToken,
      p_session_id: "session",
      p_after_attack_id: 41,
    });
  });
});
