import { describe, expect, it } from "vitest";
import { checkLiveAnswer, parseLiveSession } from "./live-session";

describe("native Laufdiktat live sessions", () => {
  it("validates and deterministically orders an authorized room config", () => {
    const config = {
      words: [
        { id: "1", kind: "text", targetWord: "Schule" },
        { id: "2", kind: "text", targetWord: "Pause" },
        { id: "3", kind: "text", targetWord: "Heft" },
      ],
      shuffleWords: true,
    };

    const first = parseLiveSession(config, "session-1", "4829:Mia:session-1");
    const second = parseLiveSession(config, "session-1", "4829:Mia:session-1");

    expect(first.words.map((word) => word.id)).toEqual(
      second.words.map((word) => word.id),
    );
    expect(first.sessionId).toBe("session-1");
    expect(first.vocabularyTransfer).toBe("errors");
  });

  it("keeps the source answer rules for text, vocabulary and math", () => {
    expect(
      checkLiveAnswer({ id: "t", kind: "text", targetWord: "Haus" }, "haus"),
    ).toBe(false);
    expect(
      checkLiveAnswer(
        {
          id: "v",
          kind: "vocabulary",
          targetWord: "library",
          acceptedAnswers: ["school library"],
          answerLang: "en-GB",
        },
        "Library",
      ),
    ).toBe(true);
    expect(
      checkLiveAnswer(
        { id: "m", kind: "math", prompt: "1 : 3", targetWord: "0.333" },
        "0,33",
      ),
    ).toBe(true);
  });

  it("rejects malformed session data", () => {
    expect(() =>
      parseLiveSession({ words: [] }, "session-1", "seed"),
    ).toThrow();
  });
});
