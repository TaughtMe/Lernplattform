import { describe, expect, it } from "vitest";
import { LEARNING_WORD_STAGES, type LearningWordStage } from "./learning-word";
import {
  advanceWordRound,
  applyHelp,
  continueAfterFeedback,
  currentBlock,
  finishMemorize,
  sampleRoundWords,
  startWordRound,
  submitWordAnswer,
  wordRoundPercent,
  type WordRoundState,
} from "./word-round";

const WORDS = ["Sonne", "Mond", "Stern"];

function start(
  stage: LearningWordStage,
  words: string[] = WORDS,
  blockSize: 1 | 2 | 3 | 5 = 3,
) {
  return startWordRound({
    roundId: "runde-1",
    boxId: "double-consonants",
    stage,
    blockSize,
    roundSize: "all",
    words,
  });
}

function toRecall(state: WordRoundState) {
  return state.phase === "memorize" ? finishMemorize(state) : state;
}

/** Spielt alle Blöcke fehlerfrei durch. */
function playPerfect(initial: WordRoundState) {
  let state = initial;
  while (state.phase !== "complete") {
    state = toRecall(state);
    const answer = currentBlock(state).join("\n");
    state = advanceWordRound(submitWordAnswer(state, answer).state);
  }
  return state;
}

describe("startWordRound", () => {
  it("starts stages 4 and 5 with the memorize phase, others with recall", () => {
    expect(start(1).phase).toBe("recall");
    expect(start(2).phase).toBe("recall");
    expect(start(3).phase).toBe("recall");
    expect(start(4).phase).toBe("memorize");
    expect(start(5).phase).toBe("memorize");
    expect(start(6).phase).toBe("recall");
  });

  it("uses single-word blocks except in stage 5", () => {
    expect(start(1).blocks).toEqual([["Sonne"], ["Mond"], ["Stern"]]);
    expect(start(5, WORDS, 2).blocks).toEqual([["Sonne", "Mond"], ["Stern"]]);
    expect(start(4, WORDS, 3).blockSize).toBe(1);
  });

  it("limits the round size and rejects empty rounds", () => {
    const many = Array.from({ length: 30 }, (_, i) => `Wort${i}`);
    const round = startWordRound({
      roundId: "r",
      boxId: "b",
      stage: 1,
      blockSize: 1,
      roundSize: 10,
      words: many,
    });
    expect(round.blocks).toHaveLength(10);
    expect(() => start(1, [])).toThrow();
  });
});

describe("full rounds", () => {
  it.each(LEARNING_WORD_STAGES)(
    "plays stage %i from start to complete",
    (stage) => {
      const done = playPerfect(start(stage));
      expect(done.phase).toBe("complete");
      expect(done.results.map((r) => r.word)).toEqual(WORDS);
      expect(done.results.every((r) => r.firstTry)).toBe(true);
      expect(wordRoundPercent(done.results)).toBe(100);
    },
  );
});

describe("answers", () => {
  it("records a wrong first answer and keeps the word out of first try", () => {
    let state = start(1);
    const wrong = submitWordAnswer(state, "Sone");
    expect(wrong.correct).toBe(false);
    expect(wrong.attempts).toEqual([
      expect.objectContaining({
        words: ["Sonne"],
        correct: false,
        selfCorrected: false,
        stage: 1,
      }),
    ]);
    expect(wrong.state.phase).toBe("feedback");
    expect(wrong.state.lastFeedback?.words[0]?.result).toMatchObject({
      kind: "falsch",
      nearMiss: true,
    });
    state = continueAfterFeedback(wrong.state);
    expect(state.phase).toBe("recall");
    const right = submitWordAnswer(state, "Sonne");
    expect(right.correct).toBe(true);
    expect(right.attempts[0]).toMatchObject({
      correct: true,
      selfCorrected: true,
    });
    expect(right.state.results[0]).toMatchObject({
      word: "Sonne",
      firstTry: false,
      attempts: 2,
      firstResult: "falsch",
    });
  });

  it("does not count a case slip as right", () => {
    const wrong = submitWordAnswer(start(1), "sonne");
    expect(wrong.correct).toBe(false);
    expect(wrong.state.lastFeedback?.words[0]?.result.kind).toBe("gross-klein");
  });

  it("returns to the memorize phase after an error in stages 4 and 5", () => {
    const four = continueAfterFeedback(
      submitWordAnswer(finishMemorize(start(4)), "Son").state,
    );
    expect(four.phase).toBe("memorize");
    const five = continueAfterFeedback(
      submitWordAnswer(finishMemorize(start(5)), "Sonne").state,
    );
    expect(five.phase).toBe("memorize");
  });

  it("rejects empty input", () => {
    expect(() => submitWordAnswer(start(1), "   ")).toThrow(/leer/);
  });

  it("lets help prevent a first-try result", () => {
    let state = applyHelp(start(1));
    expect(state.usedHelp).toBe(true);
    expect(applyHelp(state)).toBe(state);
    const result = submitWordAnswer(state, "Sonne");
    expect(result.attempts[0]).toMatchObject({
      correct: true,
      usedHelp: true,
      selfCorrected: false,
    });
    expect(result.state.results[0]).toMatchObject({
      firstTry: false,
      usedHelp: true,
      firstResult: "richtig",
    });
    state = advanceWordRound(result.state);
    expect(state.usedHelp).toBe(false);
  });

  it("does not count self-correction in the percentage but keeps the learning state", () => {
    let state = start(1, ["Sonne", "Mond"]);
    state = continueAfterFeedback(submitWordAnswer(state, "Son").state);
    state = advanceWordRound(submitWordAnswer(state, "Sonne").state);
    state = advanceWordRound(submitWordAnswer(state, "Mond").state);
    expect(state.phase).toBe("complete");
    expect(wordRoundPercent(state.results)).toBe(50);
  });

  it("scores stage 5 per word and repeats the block until everything is right", () => {
    let state = finishMemorize(start(5));
    const first = submitWordAnswer(state, "Sonne\nMond\nSterm");
    expect(first.correct).toBe(false);
    expect(first.attempts.map((a) => [a.words[0], a.correct])).toEqual([
      ["Sonne", true],
      ["Mond", true],
      ["Stern", false],
    ]);
    state = finishMemorize(continueAfterFeedback(first.state));
    const second = submitWordAnswer(state, "Stern\nSonne\nMond");
    expect(second.correct).toBe(true);
    // Schon richtige Wörter werden nicht doppelt im Lernstand verbucht.
    expect(second.attempts).toEqual([
      expect.objectContaining({
        words: ["Stern"],
        correct: true,
        selfCorrected: true,
      }),
    ]);
    const done = advanceWordRound(second.state);
    expect(done.phase).toBe("complete");
    expect(done.results.map((r) => [r.word, r.firstTry])).toEqual([
      ["Sonne", true],
      ["Mond", true],
      ["Stern", false],
    ]);
    expect(wordRoundPercent(done.results)).toBe(67);
  });

  it('keeps first-try credit for words settled before "Wort zeigen" in stage 5', () => {
    let state = finishMemorize(start(5));
    const first = submitWordAnswer(state, "Sonne\nMond\nSterm");
    state = applyHelp(finishMemorize(continueAfterFeedback(first.state)));
    const second = submitWordAnswer(state, "Stern\nSonne\nMond");
    expect(second.attempts).toEqual([
      expect.objectContaining({ words: ["Stern"], usedHelp: true }),
    ]);
    const done = advanceWordRound(second.state);
    expect(done.results.map((r) => [r.word, r.firstTry, r.usedHelp])).toEqual([
      ["Sonne", true, false],
      ["Mond", true, false],
      ["Stern", false, true],
    ]);
    expect(wordRoundPercent(done.results)).toBe(67);
  });

  it("shows extra words in stage 5 without penalty", () => {
    const result = submitWordAnswer(
      finishMemorize(start(5, ["Sonne"])),
      "Sonne\nHaus",
    );
    expect(result.correct).toBe(true);
    expect(result.state.lastFeedback?.extra).toEqual(["Haus"]);
  });

  it("creates deterministic attempt ids for retries", () => {
    const first = submitWordAnswer(start(1), "x");
    const again = submitWordAnswer(continueAfterFeedback(first.state), "y");
    expect(first.attempts[0]!.attemptId).toBe("0:1");
    expect(again.attempts[0]!.attemptId).toBe("0:2");
  });
});

describe("invalid transitions", () => {
  it("throws outside the matching phase", () => {
    const recall = start(1);
    const memorize = start(4);
    expect(() => finishMemorize(recall)).toThrow();
    expect(() => submitWordAnswer(memorize, "Sonne")).toThrow();
    expect(() => applyHelp(memorize)).toThrow();
    expect(() => continueAfterFeedback(recall)).toThrow();
    expect(() => advanceWordRound(recall)).toThrow();
  });

  it("rejects a second submission and wrong follow-ups", () => {
    const right = submitWordAnswer(start(1), "Sonne");
    expect(() => submitWordAnswer(right.state, "Sonne")).toThrow();
    expect(() => continueAfterFeedback(right.state)).toThrow();
    const wrong = submitWordAnswer(start(1), "x");
    expect(() => advanceWordRound(wrong.state)).toThrow();
    const done = playPerfect(start(1));
    expect(() => advanceWordRound(done)).toThrow();
  });
});

describe("wordRoundPercent", () => {
  const entry = (firstTry: boolean) => ({
    word: "x",
    firstTry,
    attempts: 1,
    usedHelp: false,
    firstResult: "richtig" as const,
  });

  it("rounds to whole percent", () => {
    expect(wordRoundPercent([entry(true), entry(false), entry(false)])).toBe(
      33,
    );
    expect(wordRoundPercent([entry(true), entry(true), entry(false)])).toBe(67);
  });

  it("handles empty and perfect rounds", () => {
    expect(wordRoundPercent([])).toBe(0);
    expect(wordRoundPercent([entry(true)])).toBe(100);
    expect(wordRoundPercent([entry(false)])).toBe(0);
  });
});

describe("sampleRoundWords", () => {
  const bank = Array.from({ length: 30 }, (_, i) => `Wort${i}`);

  it("takes different words with different random values", () => {
    const first = sampleRoundWords(bank, 10, () => 0);
    const second = sampleRoundWords(bank, 10, () => 0.99);
    expect(first).toHaveLength(10);
    expect(new Set(first).size).toBe(10);
    expect(second).not.toEqual(first);
  });

  it("is reproducible with the same generator", () => {
    const make = () => {
      let seed = 7;
      return () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
    };
    expect(sampleRoundWords(bank, 5, make())).toEqual(
      sampleRoundWords(bank, 5, make()),
    );
  });

  it("keeps the order when everything fits", () => {
    expect(sampleRoundWords(bank, "all", () => 0.5)).toEqual(bank);
    expect(sampleRoundWords(bank, 40, () => 0.5)).toEqual(bank);
  });

  it("is used by startWordRound when a generator is given", () => {
    const round = startWordRound({
      roundId: "r",
      boxId: "b",
      stage: 1,
      blockSize: 1,
      roundSize: 5,
      words: bank,
      random: () => 0.99,
    });
    expect(round.blocks).toHaveLength(5);
    expect(round.blocks.flat()).not.toEqual(bank.slice(0, 5));
  });
});
