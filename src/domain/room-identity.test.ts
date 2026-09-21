import { describe, expect, it } from "vitest";
import {
  createRoomJoinPayload,
  createRoomReentryToken,
  roomIdentityStorageKey,
  roomJoinPayloadSchema,
} from "./room-identity";

describe("room identity contract", () => {
  it("creates a cryptographically sized token without using profile data", () => {
    const token = createRoomReentryToken((bytes) => bytes.fill(0xab));
    expect(token).toMatch(/^[0-9a-f]{48}$/);
    expect(token).toHaveLength(48);

    const payload = createRoomJoinPayload(null, token);
    expect(payload).toEqual({ animalToken: null, reentryToken: token });
    expect(JSON.stringify(payload)).not.toMatch(
      /profile|device|stats|learning|word|image|path|name/i,
    );
    expect(roomJoinPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it("uses a room-scoped session key and rejects extra payload fields", () => {
    expect(roomIdentityStorageKey("4829")).toBe(
      "lernraum-live-room-identity:4829",
    );
    expect(() =>
      roomJoinPayloadSchema.parse({
        animalToken: "Fuchs",
        reentryToken: "a".repeat(48),
        profileId: "stable-device-id",
      }),
    ).toThrow();
  });
});
