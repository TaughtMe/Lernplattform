import { afterEach, describe, expect, it, vi } from "vitest";
import type { LiveSession } from "./live-session";
import { liveTransferNotice, runLiveVocabularyTransfer } from "./live-transfer";

function session(overrides: Partial<LiveSession> = {}): LiveSession {
  return {
    sessionId: "s-1",
    words: [
      { id: "one", kind: "vocabulary", prompt: "house", targetWord: "Haus" },
    ],
    gameMode: "UEBUNG",
    stationMode: false,
    stationCount: 1,
    isTtsEnabled: false,
    uebungMaxAttempts: 3,
    uebungAssistanceEnabled: true,
    repeatWrongAnswers: true,
    vocabularyTransfer: "all",
    showStars: true,
    shuffleWords: false,
    strictTypingMode: false,
    showTaskAfterErrors: false,
    stationShuffle: false,
    battleOptions: { ink: true, flicker: true },
    ...overrides,
  };
}
const trace = {
  currentIndex: 0,
  finished: true,
  wordErrors: {},
  wordHelps: {},
};

afterEach(() => window.sessionStorage.clear());

describe("liveTransferNotice", () => {
  it.each([
    [
      { added: 1, reused: 0, practiceAgain: 0 },
      "1 neue Vokabel ist jetzt in deiner LernBox.",
    ],
    [
      { added: 3, reused: 0, practiceAgain: 0 },
      "3 neue Vokabeln sind jetzt in deiner LernBox.",
    ],
    [
      { added: 0, reused: 1, practiceAgain: 1 },
      "1 Vokabel üben wir noch einmal.",
    ],
    [
      { added: 2, reused: 4, practiceAgain: 4 },
      "2 neue Vokabeln sind jetzt in deiner LernBox. 4 Vokabeln üben wir noch einmal.",
    ],
    [
      { added: 0, reused: 2, practiceAgain: 0 },
      "Diese Vokabeln waren schon in deiner LernBox.",
    ],
  ])("%j", (result, expected) => {
    expect(liveTransferNotice(result)).toBe(expected);
  });
});

describe("runLiveVocabularyTransfer", () => {
  const ok = { deckId: "d", added: 1, reused: 0, practiceAgain: 0 };

  it("übernimmt genau einmal pro Runde und merkt sich die Meldung", async () => {
    const ingestBundle = vi.fn().mockResolvedValue(ok);
    const first = await runLiveVocabularyTransfer(
      { ingestBundle },
      session(),
      trace,
    );
    expect(first).toEqual({
      status: "success",
      notice: "1 neue Vokabel ist jetzt in deiner LernBox.",
    });
    const second = await runLiveVocabularyTransfer(
      { ingestBundle },
      session(),
      trace,
    );
    expect(second).toEqual(first);
    expect(ingestBundle).toHaveBeenCalledTimes(1);
    expect(ingestBundle.mock.calls[0]![0].placements).toEqual({
      "live-s-1-one": "known",
    });
  });

  it("fasst gleichzeitige Aufrufe zusammen", async () => {
    const ingestBundle = vi.fn().mockResolvedValue(ok);
    const [a, b] = await Promise.all([
      runLiveVocabularyTransfer({ ingestBundle }, session(), trace),
      runLiveVocabularyTransfer({ ingestBundle }, session(), trace),
    ]);
    expect(a).toEqual(b);
    expect(ingestBundle).toHaveBeenCalledTimes(1);
  });

  it("erlaubt nach einem Fehler eine Wiederholung", async () => {
    const ingestBundle = vi
      .fn()
      .mockRejectedValueOnce(new Error("kaputt"))
      .mockResolvedValueOnce(ok);
    const failed = await runLiveVocabularyTransfer(
      { ingestBundle },
      session(),
      trace,
    );
    expect(failed).toEqual({
      status: "error",
      notice: "Die Vokabeln konnten auf diesem Gerät nicht übernommen werden.",
    });
    const retry = await runLiveVocabularyTransfer(
      { ingestBundle },
      session(),
      trace,
    );
    expect(retry.status).toBe("success");
  });

  it("übernimmt im Stationsmodus, bei „nichts“ und ohne Auswahl nichts", async () => {
    const ingestBundle = vi.fn();
    const repository = { ingestBundle };
    expect(
      await runLiveVocabularyTransfer(
        repository,
        session({ stationMode: true }),
        trace,
      ),
    ).toEqual({ status: "none" });
    expect(
      await runLiveVocabularyTransfer(
        repository,
        session({ sessionId: "s-2", vocabularyTransfer: "none" }),
        trace,
      ),
    ).toEqual({ status: "none" });
    expect(
      await runLiveVocabularyTransfer(
        repository,
        session({ sessionId: "s-3", vocabularyTransfer: "errors" }),
        trace,
      ),
    ).toEqual({ status: "none" });
    expect(ingestBundle).not.toHaveBeenCalled();
  });
});
