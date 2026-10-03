import { describe, expect, it } from "vitest";
import type { LiveSession } from "./live-session";
import {
  buildLiveVocabularyTransfer,
  liveWordErrorKey,
  selectVocabularyForTransfer,
  type LiveTransferTrace,
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

const done = (
  overrides: Partial<LiveTransferTrace> = {},
): LiveTransferTrace => ({
  currentIndex: 2,
  finished: true,
  wordErrors: {},
  wordHelps: {},
  ...overrides,
});

describe("live vocabulary transfer", () => {
  it("wählt je nach Option alle, nur Übungsbedarf oder nichts", () => {
    const trace = done({ wordErrors: { "house → Haus": 1 } });
    const ids = (value: LiveSession["vocabularyTransfer"]) =>
      selectVocabularyForTransfer(session(value), trace).map(
        (entry) => entry.word.id,
      );
    expect(ids("errors")).toEqual(["one"]);
    expect(ids("all")).toEqual(["one", "two"]);
    expect(ids("none")).toEqual([]);
  });

  it("ordnet Fehler, Hilfe und nicht erreichte Wörter ein", () => {
    const trace = done({
      finished: false,
      currentIndex: 1,
      wordErrors: { "house → Haus": 1 },
      wordHelps: { "house → Haus": true },
    });
    const selected = selectVocabularyForTransfer(session("all"), trace);
    expect(selected.map((entry) => entry.outcome)).toEqual(["reset", "unseen"]);
  });

  it("zählt das aktuelle Wort nach dem Ende der Runde als beantwortet", () => {
    const outcomes = (trace: LiveTransferTrace) =>
      selectVocabularyForTransfer(session("all"), trace).map(
        (entry) => entry.outcome,
      );
    expect(outcomes(done({ finished: true, currentIndex: 1 }))).toEqual([
      "known",
      "known",
    ]);
    expect(outcomes(done({ finished: false, currentIndex: 1 }))).toEqual([
      "known",
      "unseen",
    ]);
  });

  it("nutzt die lockereren Regeln der übergebenen Platzierungsregeln", () => {
    const trace = done({ wordErrors: { "house → Haus": 4 } });
    const outcome = (resetAfterErrors: number) =>
      selectVocabularyForTransfer(session("all"), trace, {
        resetAfterErrors,
      })[0]?.outcome;
    expect(outcome(3)).toBe("reset");
    expect(outcome(5)).toBe("practice");
  });

  it("ordnet tolerant angenommene Wörter als „üben“ ein, nie als sicher gewusst", () => {
    const trace = done({ wordTolerated: { "house → Haus": true } });
    const outcomes = selectVocabularyForTransfer(session("all"), trace, {
      resetAfterErrors: 5,
    }).map((entry) => entry.outcome);
    expect(outcomes).toEqual(["practice", "known"]);
    // Mit „Nur Übungsbedarf“ wird das tolerierte Wort übernommen.
    expect(
      selectVocabularyForTransfer(session("errors"), trace, {
        resetAfterErrors: 5,
      }).map((entry) => entry.word.id),
    ).toEqual(["one"]);
  });

  it("baut ein gültiges Bundle mit Platzierungen, Alternativen und ohne Text", () => {
    const current = session("errors");
    current.words[0] = { ...current.words[0]!, acceptedAnswers: ["Gebäude"] };
    const transfer = buildLiveVocabularyTransfer(
      current,
      done({ wordErrors: { [liveWordErrorKey(current.words[0]!)]: 2 } }),
    );
    expect(transfer?.bundle.vocabulary).toMatchObject([
      { prompt: { text: "house" }, answer: { alternatives: ["Gebäude"] } },
    ]);
    expect(transfer?.bundle.stacks[0]?.itemIds).toHaveLength(1);
    expect(transfer?.placements).toEqual({ "live-session-1-one": "practice" });
  });

  it("benennt den Stapel neu und findet den alten Titel weiter", () => {
    const errors = buildLiveVocabularyTransfer(
      session("errors"),
      done({ wordErrors: { "house → Haus": 1 } }),
    );
    expect(errors?.title).toBe("Übungsbedarf aus Unterrichtsrunde");
    expect(errors?.alternativeTitles).toEqual(["Fehler aus Unterrichtsrunde"]);
    const all = buildLiveVocabularyTransfer(session("all"), done());
    expect(all?.title).toBe("Vokabeln aus Unterrichtsrunde");
    expect(all?.alternativeTitles).toEqual([]);
  });

  it("vergibt zuerst den eigenen Tag der Vokabel, dann den Standard-Tag", () => {
    const current = { ...session("all"), vocabularyTag: "Buch Klasse 5" };
    current.words[0] = { ...current.words[0]!, tag: "Unit 3" };
    const transfer = buildLiveVocabularyTransfer(current, done());
    expect(transfer?.bundle.vocabulary.map((item) => item.tagIds)).toEqual([
      ["Unit 3"],
      ["Buch Klasse 5"],
    ]);
    const untagged = buildLiveVocabularyTransfer(session("all"), done());
    expect(untagged?.bundle.vocabulary[0]?.tagIds).toEqual([]);
  });

  it("legt keine leere Übernahme an", () => {
    expect(
      buildLiveVocabularyTransfer(session("errors"), done()),
    ).toBeUndefined();
  });
});
