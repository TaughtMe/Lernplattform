import { describe, expect, it } from "vitest";
import { extractJoinCode, normalizeJoinCode } from "./join-code";

describe("join codes", () => {
  it("reads the room code from a Laufdiktat QR URL", () => {
    expect(extractJoinCode("https://example.org/?room=4829")).toBe("4829");
  });

  it("reads a class code without trusting or opening the scanned URL", () => {
    expect(
      extractJoinCode("https://example.org/join?classCode=klasse-7b"),
    ).toBe("KLASSE7B");
  });

  it("normalizes printed codes", () => {
    expect(normalizeJoinCode("ab-12 cd")).toBe("AB12CD");
  });
});
