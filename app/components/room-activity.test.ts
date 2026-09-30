import { afterEach, describe, expect, it } from "vitest";
import {
  forgetActiveRoom,
  readActiveRoom,
  rememberActiveRoom,
  ROOM_ACTIVITY_TIMEOUT_MS,
} from "./room-activity";

afterEach(() => forgetActiveRoom());

describe("room activity after leaving the room page", () => {
  it("remembers the room until the round ends", () => {
    rememberActiveRoom("4829", "participant-a");
    expect(readActiveRoom()).toMatchObject({
      code: "4829",
      studentName: "participant-a",
    });
    forgetActiveRoom();
    expect(readActiveRoom()).toBeNull();
  });

  it("expires 45 minutes after the last visit of the room page", () => {
    rememberActiveRoom("4829", "participant-a");
    const stored = readActiveRoom()!;
    expect(
      readActiveRoom(stored.lastRoomAt + ROOM_ACTIVITY_TIMEOUT_MS - 1),
    ).not.toBeNull();
    expect(
      readActiveRoom(stored.lastRoomAt + ROOM_ACTIVITY_TIMEOUT_MS + 1),
    ).toBeNull();
    expect(readActiveRoom()).toBeNull();
  });

  it("ignores invalid stored data", () => {
    sessionStorage.setItem("lernraum-active-room", '{"code":"abc"}');
    expect(readActiveRoom()).toBeNull();
  });
});
