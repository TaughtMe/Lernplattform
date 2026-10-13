import { afterEach, describe, expect, it, vi } from "vitest";
import { parseLiveSession, type LiveSession } from "./live-session";
import { readWordStoreTransferDone } from "./live-trace";
import {
  WORD_STORE_FULL_NOTICE,
  buildWordStoreTransfer,
  misspelledWords,
  runLiveWordStoreTransfer,
  summarizeSavedWords,
} from "./word-store-transfer";

function session(
  wordStoreTransfer: LiveSession["wordStoreTransfer"],
  overrides: Partial<LiveSession> = {},
): LiveSession {
  return {
    ...parseLiveSession(
      {
        words: [
          {
            id: "t1",
            kind: "text",
            targetWord: "Der Hund läuft schnell 12 Meter.",
          },
          { id: "t2", kind: "text", targetWord: "Die Katze schläft im Haus." },
          { id: "t3", kind: "text", targetWord: "Abends essen wir Suppe." },
          { id: "v1", kind: "vocabulary", prompt: "house", targetWord: "Haus" },
        ],
        wordStoreTransfer,
      },
      "s-1",
      "seed",
    ),
    ...overrides,
  };
}

const finished = {
  currentIndex: 3,
  finished: true,
  wordErrors: {},
  wordHelps: {},
};

afterEach(() => {
  window.sessionStorage.clear();
});

describe("misspelledWords", () => {
  it("returns misspelled words of the target text", () => {
    expect(
      misspelledWords("Der Hund läuft schnell.", "Der Hunt läuft schnel."),
    ).toEqual(["Hund", "schnell"]);
  });

  it("includes capitalisation slips", () => {
    expect(misspelledWords("Der Hund läuft.", "Der hund läuft.")).toEqual([
      "Hund",
    ]);
  });

  it("ignores missing and additional words", () => {
    expect(
      misspelledWords("Der Hund läuft schnell.", "Der Hund läuft."),
    ).toEqual([]);
    expect(
      misspelledWords("Der Hund läuft.", "Der Hund läuft sehr schnell."),
    ).toEqual([]);
  });

  it("never takes over plain numbers", () => {
    expect(misspelledWords("Es sind 12 Meter.", "Es sind 13 Meter.")).toEqual(
      [],
    );
  });

  it("merges the same word and survives empty input", () => {
    expect(misspelledWords("Hund und Hund.", "Hunt und Hunt.")).toEqual([
      "Hund",
    ]);
    expect(misspelledWords("Der Hund.", "")).toEqual([]);
  });
});

describe("buildWordStoreTransfer", () => {
  it("takes nothing for none and for older sessions without the field", () => {
    expect(buildWordStoreTransfer(session("none"), finished)).toBeUndefined();
    const old = parseLiveSession(
      { words: [{ id: "t", kind: "text", targetWord: "Eine lange Zeile." }] },
      "old",
      "seed",
    );
    expect(old.wordStoreTransfer).toBe("none");
    expect(buildWordStoreTransfer(old, finished)).toBeUndefined();
  });

  it("takes only misspelled words for errors", () => {
    const result = buildWordStoreTransfer(session("errors"), {
      ...finished,
      wordMisspellings: {
        "Der Hund läuft schnell 12 Meter.": ["Hund", "schnell"],
        "Abends essen wir Suppe.": ["Suppe"],
      },
    });
    expect(result).toEqual({
      words: ["Hund", "schnell", "Suppe"],
      errorWords: ["Hund", "schnell", "Suppe"],
    });
  });

  it("returns nothing when nothing was misspelled", () => {
    expect(buildWordStoreTransfer(session("errors"), finished)).toBeUndefined();
  });

  it("takes all long words plus misspelled short ones for all", () => {
    const result = buildWordStoreTransfer(session("all"), {
      ...finished,
      wordMisspellings: { "Die Katze schläft im Haus.": ["im"] },
    })!;
    expect(result.errorWords).toEqual(["im"]);
    expect(result.words).toEqual([
      "im",
      "Hund",
      "läuft",
      "schnell",
      "Meter",
      "Katze",
      "schläft",
      "Haus",
      "Abends",
      "essen",
      "Suppe",
    ]);
    expect(result.words).not.toContain("Der");
    expect(result.words).not.toContain("12");
  });

  it("only counts the parts reached so far, up to and including the current one", () => {
    const result = buildWordStoreTransfer(session("all"), {
      currentIndex: 1,
      finished: false,
      wordErrors: {},
      wordHelps: {},
    })!;
    expect(result.words).toContain("Katze");
    expect(result.words).not.toContain("Suppe");
  });

  it("is empty in station mode", () => {
    expect(
      buildWordStoreTransfer(session("all", { stationMode: true }), finished),
    ).toBeUndefined();
  });
});

describe("runLiveWordStoreTransfer", () => {
  const trace = {
    ...finished,
    wordMisspellings: { "Der Hund läuft schnell 12 Meter.": ["Hund"] },
  };

  it("imports once per round and device and remembers the result", async () => {
    const importFromLesson = vi
      .fn()
      .mockResolvedValue({ added: ["Hund"], full: false });
    const repository = { importFromLesson };
    const first = await runLiveWordStoreTransfer(
      repository,
      session("errors"),
      trace,
    );
    expect(first).toEqual({ status: "success", added: ["Hund"], full: false });
    expect(importFromLesson).toHaveBeenCalledWith({
      words: ["Hund"],
      errorWords: ["Hund"],
      sourceId: "s-1",
    });
    expect(readWordStoreTransferDone("s-1")).toEqual({
      added: ["Hund"],
      full: false,
    });
    const again = await runLiveWordStoreTransfer(
      repository,
      session("errors"),
      trace,
    );
    expect(again).toEqual(first);
    expect(importFromLesson).toHaveBeenCalledTimes(1);
  });

  it("shares one promise between parallel calls", async () => {
    const importFromLesson = vi
      .fn()
      .mockResolvedValue({ added: ["Hund"], full: false });
    const repository = { importFromLesson };
    await Promise.all([
      runLiveWordStoreTransfer(repository, session("errors"), trace),
      runLiveWordStoreTransfer(repository, session("errors"), trace),
    ]);
    expect(importFromLesson).toHaveBeenCalledTimes(1);
  });

  it("also works for a round ended early by the teacher", async () => {
    const importFromLesson = vi
      .fn()
      .mockResolvedValue({ added: ["Hund"], full: false });
    const result = await runLiveWordStoreTransfer(
      { importFromLesson },
      session("errors"),
      { ...trace, finished: false, currentIndex: 1 },
    );
    expect(result.status).toBe("success");
  });

  it("passes on a full box", async () => {
    const importFromLesson = vi
      .fn()
      .mockResolvedValue({ added: ["Hund"], full: true });
    const result = await runLiveWordStoreTransfer(
      { importFromLesson },
      session("errors"),
      trace,
    );
    expect(result).toMatchObject({ status: "success", full: true });
    expect(WORD_STORE_FULL_NOTICE).toContain("voll");
  });

  it("does nothing in station mode, for none and without words", async () => {
    const importFromLesson = vi.fn();
    const repository = { importFromLesson };
    expect(
      await runLiveWordStoreTransfer(
        repository,
        session("errors", { stationMode: true }),
        trace,
      ),
    ).toEqual({ status: "none" });
    expect(
      await runLiveWordStoreTransfer(
        repository,
        session("none", { sessionId: "s-2" }),
        trace,
      ),
    ).toEqual({ status: "none" });
    expect(
      await runLiveWordStoreTransfer(
        repository,
        session("errors", { sessionId: "s-3" }),
        finished,
      ),
    ).toEqual({ status: "none" });
    expect(importFromLesson).not.toHaveBeenCalled();
  });

  it("reports an error without marking the round as done", async () => {
    const importFromLesson = vi.fn().mockRejectedValueOnce(new Error("kaputt"));
    const repository = { importFromLesson };
    const failed = await runLiveWordStoreTransfer(
      repository,
      session("errors"),
      trace,
    );
    expect(failed.status).toBe("error");
    expect(readWordStoreTransferDone("s-1")).toBeUndefined();
    importFromLesson.mockResolvedValueOnce({ added: ["Hund"], full: false });
    const retry = await runLiveWordStoreTransfer(
      repository,
      session("errors"),
      trace,
    );
    expect(retry.status).toBe("success");
  });
});

describe("summarizeSavedWords", () => {
  it("shows at most five words and counts the rest", () => {
    expect(summarizeSavedWords(["a", "b"])).toEqual({
      shown: ["a", "b"],
      more: 0,
    });
    expect(summarizeSavedWords(["a", "b", "c", "d", "e", "f", "g"])).toEqual({
      shown: ["a", "b", "c", "d", "e"],
      more: 2,
    });
  });
});
