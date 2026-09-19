import { describe, expect, it } from "vitest";
import type { LiveSession } from "./live-session";
import {
  buildLiveVocabularyTransfer,
  liveWordErrorKey,
  selectVocabularyForTransfer,
} from "./vocabulary-transfer";

function session(
  vocabularyTransfer: LiveSession["vocabularyTransfer"],
): LiveSession {
  return {
    sessionId: "session-1",
    words: [
      { id: "one", kind: "vocabulary", prompt: "house", targetWord: "Haus" },
      { id: "two", kind: "vocabulary", prompt: "tree", targetWord: "Baum" },
      { id: "text", kind: "text", targetWord: "Guten Morgen." },
    ],
    gameMode: "UEBUNG",
    stationMode: false,
    stationCount: 1,
    isTtsEnabled: false,
    uebungMaxAttempts: 3,
    uebungAssistanceEnabled: true,
    repeatWrongAnswers: true,
    vocabularyTransfer,
    showStars: true,
    shuffleWords: false,
    strictTypingMode: false,
    stationShuffle: false,
    battleOptions: { ink: true, flicker: true },
  };
}

describe("live vocabulary transfer", () => {
  it("selects all, only erroneous or no vocabulary as configured", () => {
    const errors = { "house → Haus": 1 };
    expect(selectVocabularyForTransfer(session("errors"), errors)).toHaveLength(
      1,
    );
    expect(selectVocabularyForTransfer(session("all"), errors)).toHaveLength(2);
    expect(selectVocabularyForTransfer(session("none"), errors)).toHaveLength(
      0,
    );
  });

  it("builds a valid bundle that keeps alternatives and excludes text", () => {
    const current = session("errors");
    current.words[0] = {
      ...current.words[0]!,
      acceptedAnswers: ["Gebäude"],
    };
    const transfer = buildLiveVocabularyTransfer(current, {
      [liveWordErrorKey(current.words[0]!)]: 2,
    });
    expect(transfer?.bundle.vocabulary).toMatchObject([
      { prompt: { text: "house" }, answer: { alternatives: ["Gebäude"] } },
    ]);
    expect(transfer?.bundle.stacks[0]?.itemIds).toHaveLength(1);
  });

  it("does not create an empty transfer", () => {
    expect(buildLiveVocabularyTransfer(session("errors"), {})).toBeUndefined();
  });
});
