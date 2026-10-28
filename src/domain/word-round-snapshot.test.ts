import { describe, expect, it } from "vitest";
import type { WordBoxView } from "./word-box";
import { buildRoundSnapshot, parseRoundSnapshot } from "./round-snapshot";
import {
  advanceWordRound,
  continueAfterFeedback,
  startWordRound,
  submitWordAnswer,
  type WordRoundState,
} from "./word-round";
import {
  buildWordRoundSnapshot,
  wordRoundProgress,
  wordRoundSnapshotSchema,
} from "./word-round-snapshot";

const view: WordBoxView = {
  id: "ck-tz",
  kind: "fest",
  title: "ck und tz",
  words: ["Hecke", "Katze", "backen", "Mütze"],
  editable: false,
  // Wird nicht mitgespeichert.
  strategy: "Merken",
};

const config = { stage: 1, roundSize: 10, blockSize: 3 } as const;
const startedAt = "2026-10-28T09:00:00.000Z";
const now = new Date("2026-10-28T09:05:00.000Z");

function fresh(): WordRoundState {
  return startWordRound({
    roundId: "runde-1",
    boxId: view.id,
    stage: 1,
    blockSize: 3,
    roundSize: "all",
    words: view.words,
    random: () => 0,
  });
}

/** Speichert, serialisiert und liest wie die Oberfläche. */
function roundTrip(state: WordRoundState) {
  const content = buildWordRoundSnapshot({ state, view, config, startedAt });
  expect(content).not.toBeNull();
  const raw = JSON.stringify(
    buildRoundSnapshot({
      module: "wortspeicher",
      roundId: state.roundId,
      startedAt,
      now,
      ...wordRoundProgress(state),
      state: content,
    }),
  );
  return parseRoundSnapshot(raw, {
    module: "wortspeicher",
    now,
    state: wordRoundSnapshotSchema,
  });
}

describe("wordRoundProgress", () => {
  it("zählt erledigte Blöcke, eine richtige Antwort sofort", () => {
    const start = fresh();
    expect(wordRoundProgress(start)).toEqual({ done: 0, total: 4 });
    const answered = submitWordAnswer(start, start.blocks[0]![0]!).state;
    expect(wordRoundProgress(answered)).toEqual({ done: 1, total: 4 });
    const next = advanceWordRound(answered);
    expect(wordRoundProgress(next)).toEqual({ done: 1, total: 4 });
  });

  it("zählt einen Fehler nicht als erledigt", () => {
    const wrong = submitWordAnswer(fresh(), "falsch").state;
    expect(wordRoundProgress(wrong)).toEqual({ done: 0, total: 4 });
  });
});

describe("Zwischenstand der Wortspeicher-Runde", () => {
  it("übersteht Speichern und Lesen unverändert", () => {
    let state = fresh();
    for (let step = 0; step < 3; step += 1) {
      state = advanceWordRound(
        submitWordAnswer(state, state.blocks[state.index]![0]!).state,
      );
    }
    const restored = roundTrip(state);
    expect(restored).toMatchObject({ done: 3, total: 4 });
    expect(restored?.state.state).toEqual(state);
    expect(restored?.state.view).toEqual({
      id: "ck-tz",
      kind: "fest",
      title: "ck und tz",
      words: view.words,
      editable: false,
    });
    expect(restored?.state.config).toEqual(config);
  });

  it("zählt nach dem Fortsetzen den ersten Versuch weiter und wertet nichts doppelt", () => {
    const start = fresh();
    const word = start.blocks[0]![0]!;
    const wrong = submitWordAnswer(start, "falsch");
    expect(wrong.attempts).toEqual([
      expect.objectContaining({ firstAttempt: true, attemptId: "0:1" }),
    ]);

    // Neu geladen mitten in der Rückmeldung eines Fehlers.
    const restored = roundTrip(wrong.state)!.state.state;
    const again = submitWordAnswer(continueAfterFeedback(restored), word);
    expect(again.attempts).toEqual([
      expect.objectContaining({
        firstAttempt: false,
        attemptId: "0:2",
        correct: true,
        selfCorrected: true,
      }),
    ]);
    // Auf Anhieb richtig zählt nicht: Das Wort war beim ersten Versuch falsch.
    expect(again.state.results[0]).toMatchObject({
      word,
      firstTry: false,
      attempts: 2,
    });
  });

  it("bietet eine abgeschlossene Runde nicht an", () => {
    let state = fresh();
    while (state.phase !== "complete") {
      state = submitWordAnswer(state, state.blocks[state.index]![0]!).state;
      state = advanceWordRound(state);
    }
    expect(
      buildWordRoundSnapshot({ state, view, config, startedAt }),
    ).toBeNull();
  });

  it("verwirft Zustände, die nicht zu den Blöcken passen", () => {
    const state = fresh();
    const content = buildWordRoundSnapshot({
      state,
      view,
      config,
      startedAt,
    })!;
    const broken = (patch: Record<string, unknown>) =>
      wordRoundSnapshotSchema.safeParse({
        ...content,
        state: { ...content.state, ...patch },
      }).success;
    expect(broken({})).toBe(true);
    expect(broken({ index: 99 })).toBe(false);
    expect(broken({ phase: "complete" })).toBe(false);
    // „feedback“ ohne Rückmeldung.
    expect(broken({ phase: "feedback" })).toBe(false);
    expect(broken({ blocks: [] })).toBe(false);
    expect(broken({ stage: 7 })).toBe(false);
  });
});
