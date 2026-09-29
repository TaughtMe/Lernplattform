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

  it("stops on a wrong key in strict mode and marks the key as corrected", () => {
    let session = createTypingSession("ab");
    session = enterTypingCharacter(session, "x", 1, { strict: true });
    expect(session.position).toBe(0);
    expect(session.missesHere).toBe(1);
    expect(session.keystrokes).toHaveLength(1);
    expect(session.keystrokes[0]).toMatchObject({ correct: false });
    session = enterTypingCharacter(session, "a", 2, { strict: true });
    expect(session.position).toBe(1);
    expect(session.typed[0]).toEqual({
      char: "a",
      correct: true,
      corrected: true,
    });
    session = enterTypingCharacter(session, "b", 3, { strict: true });
    expect(session.typed[1]).toEqual({ char: "b", correct: true });
    expect(session.finishedAt).toBe(3);
  });
});
