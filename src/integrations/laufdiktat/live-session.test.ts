import { describe, expect, it } from "vitest";
import {
  checkLiveAnswer,
  evaluateLiveAnswer,
  parseLiveSession,
} from "./live-session";

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

  describe("Schreiberleichterung: fast richtig", () => {
    const vocab = {
      id: "v",
      kind: "vocabulary" as const,
      targetWord: "library",
      acceptedAnswers: ["bookshop"],
      answerLang: "en-GB",
    };
    const verdict = (input: string, tolerance = true, word = vocab) =>
      evaluateLiveAnswer(word, input, { tolerance });

    it("nimmt einen Buchstaben falsch, fehlend, zusätzlich oder vertauscht an", () => {
      expect(verdict("libruary")).toBe("tolerated");
      expect(verdict("librry")).toBe("tolerated");
      expect(verdict("libraary")).toBe("tolerated");
      expect(verdict("librayr")).toBe("tolerated");
      expect(verdict("lbirary")).toBe("tolerated");
    });

    it("lässt Abstand 2 nicht zu und bewertet Exaktes als richtig", () => {
      expect(verdict("lobrery")).toBe("wrong");
      expect(verdict("lib")).toBe("wrong");
      expect(verdict("Library")).toBe("correct");
    });

    it("wirkt auch auf Alternativen und ohne Toleranz nie", () => {
      expect(verdict("bookshpo")).toBe("tolerated");
      expect(verdict("libruary", false)).toBe("wrong");
    });

    it("beachtet caseSensitive", () => {
      const strictCase = { ...vocab, caseSensitive: true };
      expect(verdict("Library", true, strictCase)).toBe("tolerated");
      expect(verdict("library", true, strictCase)).toBe("correct");
      expect(verdict("Library", true)).toBe("correct");
    });

    it("gibt Lösungen bis 3 Zeichen keine Toleranz", () => {
      const short = { ...vocab, targetWord: "cat", acceptedAnswers: [] };
      expect(verdict("cut", true, short)).toBe("wrong");
      expect(verdict("cat", true, short)).toBe("correct");
    });

    it("gilt nur für Vokabeln, nicht für Text oder Mathe", () => {
      expect(
        evaluateLiveAnswer(
          { id: "t", kind: "text", targetWord: "Schule" },
          "Schole",
          { tolerance: true },
        ),
      ).toBe("wrong");
      expect(
        evaluateLiveAnswer(
          { id: "m", kind: "math", prompt: "1 + 1", targetWord: "2" },
          "3",
          { tolerance: true },
        ),
      ).toBe("wrong");
      expect(verdict("   ")).toBe("wrong");
    });
  });

  it("nimmt den Klassenstempel nur in gültiger Form an", () => {
    const word = [{ id: "1", kind: "text", targetWord: "Schule" }];
    const stamp = "A".repeat(43);
    expect(
      parseLiveSession({ words: word, classSeal: stamp }, "s", "seed")
        .classSeal,
    ).toBe(stamp);
    expect(parseLiveSession({ words: word }, "s", "seed").classSeal).toBe(
      undefined,
    );
    expect(() =>
      parseLiveSession({ words: word, classSeal: "kurz" }, "s", "seed"),
    ).toThrow();
  });

  it("rejects malformed session data", () => {
    expect(() =>
      parseLiveSession({ words: [] }, "session-1", "seed"),
    ).toThrow();
  });

  it("migrates the former TEST alias to the upstream classic mode", () => {
    const session = parseLiveSession(
      {
        words: [{ id: "1", kind: "text", targetWord: "Schule" }],
        gameMode: "TEST",
      },
      "session-1",
      "seed",
    );

    expect(session.gameMode).toBe("LAUFDIKTAT");
  });
});

it("rejects numeric prefixes with trailing text", () => {
  expect(
    checkLiveAnswer(
      { id: "math", kind: "math", prompt: "4 + 4", targetWord: "8" },
      "8abc",
    ),
  ).toBe(false);
});
