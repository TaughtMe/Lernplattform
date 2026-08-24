import { describe, expect, it } from "vitest";
import {
  correctTypingCharacter,
  createTypingSession,
  enterTypingCharacter,
} from "./typing-session";
import { computeTypingStats } from "./typing-stats";

describe("typing session", () => {
  it("records exact and incorrect keystrokes without hiding mistakes", () => {
    let session = createTypingSession("ab");
    session = enterTypingCharacter(session, "a", 1_000);
    session = enterTypingCharacter(session, "x", 2_000);

    expect(session.finishedAt).toBe(2_000);
    expect(
      computeTypingStats(session.keystrokes, 1_000, 2_000, 0),
    ).toMatchObject({
      accuracy: 50,
      errorCount: 1,
      problemChars: [{ char: "b", errors: 1 }],
    });
  });

  it("allows a correction before the round is finished", () => {
    let session = createTypingSession("ab");
    session = enterTypingCharacter(session, "x", 1_000);
    session = correctTypingCharacter(session);
    expect(session.position).toBe(0);
    expect(session.corrections).toBe(1);
  });
});
