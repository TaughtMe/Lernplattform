import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLiveProgress,
  getLiveRoomStudents,
  joinLiveRoom,
  openLiveRoom,
  readLiveRoomIdentity,
  readTeacherLiveRoom,
  saveLiveRoomIdentity,
  saveTeacherLiveRoom,
} from "./room-api";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("./live-room-client", () => ({ getLiveRoomClient: () => ({ rpc }) }));
const config = { url: "http://localhost", publishableKey: "public-test-key" };
const roomId = "11111111-1111-4111-8111-111111111111";
const identity = {
  roomId,
  sessionId: "session",
  studentName: "Mia",
  participantToken: "a".repeat(48),
};
const row = {
  current_index: 0,
  peeks: 2,
  attempts: 3,
  errors: 1,
  finished: true,
  duration_ms: 12000,
  word_errors: { house: 1 },
  station_number: null,
};
beforeEach(() => {
  rpc.mockReset();
  sessionStorage.clear();
});
describe("validated room API", () => {
  it("restores error details and duration", async () => {
    rpc.mockResolvedValue({ data: [row], error: null });
    await expect(getLiveProgress(config, identity)).resolves.toMatchObject({
      wordErrors: { house: 1 },
      durationMs: 12000,
      finished: true,
    });
  });
  it("distinguishes absent rows from malformed data", async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(getLiveProgress(config, identity)).resolves.toBeNull();
    rpc.mockResolvedValueOnce({
      data: [{ ...row, current_index: -1 }],
      error: null,
    });
    await expect(getLiveProgress(config, identity)).rejects.toThrow();
    rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(
      getLiveRoomStudents(config, { roomId, accessToken: "a".repeat(32) }),
    ).rejects.toThrow();
  });
  it("does not treat empty teacher or join capabilities as success", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await expect(openLiveRoom(config, {})).rejects.toThrow();
    await expect(joinLiveRoom(config, "1234", "Mia")).resolves.toBeNull();
  });
  it("sends only the animal enum and room reentry token for a new join", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          room_id: roomId,
          station_mode: false,
          status: "lobby",
          assigned_student_key: "participant-opaque",
          participant_token: "b".repeat(48),
          animal_token: "Fuchs",
          animal_number: 2,
        },
      ],
      error: null,
    });
    await expect(
      joinLiveRoom(config, "1234", {
        animalToken: "Fuchs",
        participantToken: "a".repeat(48),
      }),
    ).resolves.toMatchObject({
      studentName: "participant-opaque",
      animalToken: "Fuchs",
      animalNumber: 2,
    });
    expect(rpc).toHaveBeenCalledWith("join_room_secure", {
      p_code: "1234",
      p_student_key: "Fuchs",
      p_participant_token: "a".repeat(48),
    });
  });
  it("keeps the reentry identity in the current tab and room scope", () => {
    saveLiveRoomIdentity({
      code: "1234",
      name: "participant-opaque",
      participantToken: "a".repeat(48),
      animalToken: "Fuchs",
    });
    expect(readLiveRoomIdentity("1234")).toMatchObject({
      participantToken: "a".repeat(48),
      animalToken: "Fuchs",
    });
    expect(readLiveRoomIdentity("5678")).toBeNull();

    // A newly opened tab has separate sessionStorage and no reentry identity.
    sessionStorage.clear();
    expect(readLiveRoomIdentity("1234")).toBeNull();
  });
  it("validates stored capabilities and preserves valid identities", () => {
    const room = { roomId, code: "1234", accessToken: "a".repeat(32) };
    saveTeacherLiveRoom(room);
    expect(readTeacherLiveRoom()).toEqual(room);
    const student = {
      code: "1234",
      name: "Mia",
      participantToken: identity.participantToken,
    };
    saveLiveRoomIdentity(student);
    expect(readLiveRoomIdentity("1234")).toMatchObject({
      ...student,
      animalToken: null,
      participantKey: "Mia",
    });
    expect(readLiveRoomIdentity("5678")).toBeNull();
    sessionStorage.setItem(
      "lernraum-live-room-identity",
      JSON.stringify({ ...student, participantToken: 42 }),
    );
    sessionStorage.removeItem("lernraum-live-room-identity:1234");
    sessionStorage.setItem(
      "lernraum-teacher-live-room",
      '{"roomId":true,"code":1234,"accessToken":true}',
    );
    expect(readLiveRoomIdentity("1234")).toBeNull();
    expect(readTeacherLiveRoom()).toBeNull();
  });
});
