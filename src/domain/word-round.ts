import {
  chunkLearningWords,
  evaluateLearningWordBlock,
  selectLearningWordRound,
  type LearningWordBlockSize,
  type LearningWordStage,
} from "./learning-word";
import {
  compareGaps,
  type WordResult,
  type WordResultKind,
} from "./text-compare";

/**
 * Zustandsautomat einer Runde im Wortspeicher (Plan 3.3), nach dem Muster von
 * `textbox-session.ts`: rein, ohne Speicher und ohne Oberfläche. Ungültige
 * Übergänge werfen.
 */
export type WordRoundPhase = "memorize" | "recall" | "feedback" | "complete";

export type WordRoundWordResult = {
  word: string;
  /** Auf Anhieb richtig: erste Antwort exakt richtig und keine Hilfe (Plan 2.5). */
  firstTry: boolean;
  attempts: number;
  usedHelp: boolean;
  /** Fehlerart des ersten Versuchs. */
  firstResult: WordResultKind;
};

export type WordRoundFeedbackWord = {
  word: string;
  correct: boolean;
  result: WordResult;
};

export type WordRoundFeedback = {
  correct: boolean;
  input: string;
  words: WordRoundFeedbackWord[];
  /** Zusätzlich eingegebene Wörter (nur Stufe 5), nicht abgezogen. */
  extra: string[];
};

export type WordRoundState = {
  roundId: string;
  boxId: string;
  stage: LearningWordStage;
  blockSize: LearningWordBlockSize;
  blocks: string[][];
  index: number;
  phase: WordRoundPhase;
  usedHelp: boolean;
  incorrectAttempts: number;
  results: WordRoundWordResult[];
  lastFeedback?: WordRoundFeedback | undefined;
  /** Versuche am aktuellen Block (auch fehlerhafte). */
  blockAttempts: number;
  /** Fehlerart je Wort des Blocks im ersten Versuch. */
  firstKinds: Partial<Record<string, WordResultKind>>;
  /** Wörter des Blocks, die schon einmal falsch waren. */
  failedWords: string[];
  /** Wörter des Blocks, die schon richtig abgeschlossen sind. */
  settledWords: string[];
  /** Wörter des Blocks, bei denen „Wort zeigen“ vor ihrem Abschluss genutzt wurde. */
  helpedWords: string[];
  /** Nummer des Versuchs, in dem ein Wort des Blocks richtig wurde. */
  settledAt: Partial<Record<string, number>>;
};

/** Alles, was `recordAttempt` des Repositories für ein Wort braucht. */
export type AttemptRecord = {
  words: string[];
  correct: boolean;
  usedHelp: boolean;
  selfCorrected: boolean;
  stage: LearningWordStage;
  attemptId: string;
};

/**
 * Zufällige Auswahl für „Nochmal üben“: bei großen Wortboxen jedes Mal andere
 * Wörter (Teilmischung nach Fisher–Yates mit injizierbarem Zufallsgenerator).
 * Passt alles in die Runde, bleibt die Reihenfolge der Wortbox.
 */
export function sampleRoundWords(
  words: readonly string[],
  size: number | "all",
  random: () => number,
): string[] {
  if (size === "all" || size >= words.length) return [...words];
  const count = Math.max(1, Math.floor(size));
  const pool = [...words];
  for (let index = 0; index < count; index += 1) {
    const pick = index + Math.floor(random() * (pool.length - index));
    [pool[index], pool[pick]] = [pool[pick]!, pool[index]!];
  }
  return pool.slice(0, count);
}

export type StartWordRoundInput = {
  roundId: string;
  boxId: string;
  stage: LearningWordStage;
  blockSize: LearningWordBlockSize;
  roundSize: number | "all";
  words: string[];
  /** Zufallsgenerator für die Auswahl; ohne ihn gleichmäßig über die Wortbox verteilt. */
  random?: () => number;
};

function firstPhase(stage: LearningWordStage): WordRoundPhase {
  return stage === 4 || stage === 5 ? "memorize" : "recall";
}

function resetBlock(): Pick<
  WordRoundState,
  | "usedHelp"
  | "incorrectAttempts"
  | "blockAttempts"
  | "firstKinds"
  | "failedWords"
  | "settledWords"
  | "helpedWords"
  | "settledAt"
  | "lastFeedback"
> {
  return {
    usedHelp: false,
    incorrectAttempts: 0,
    blockAttempts: 0,
    firstKinds: {},
    failedWords: [],
    settledWords: [],
    helpedWords: [],
    settledAt: {},
    lastFeedback: undefined,
  };
}

function expectPhase(state: WordRoundState, phase: WordRoundPhase) {
  if (state.phase !== phase) {
    throw new Error(
      `Ungültiger Übergang: Die Runde ist in der Phase „${state.phase}“, erwartet war „${phase}“.`,
    );
  }
}

export function startWordRound(input: StartWordRoundInput): WordRoundState {
  const words = input.random
    ? sampleRoundWords(input.words, input.roundSize, input.random)
    : selectLearningWordRound(input.words, input.roundSize);
  if (words.length === 0) {
    throw new Error("Eine Runde braucht mindestens ein Wort.");
  }
  const blockSize = input.stage === 5 ? input.blockSize : 1;
  return {
    roundId: input.roundId,
    boxId: input.boxId,
    stage: input.stage,
    blockSize,
    blocks: chunkLearningWords(words, blockSize),
    index: 0,
    phase: firstPhase(input.stage),
    results: [],
    ...resetBlock(),
  };
}

export function currentBlock(state: WordRoundState): string[] {
  return state.blocks[state.index] ?? [];
}

export function finishMemorize(state: WordRoundState): WordRoundState {
  expectPhase(state, "memorize");
  return { ...state, phase: "recall" };
}

/**
 * „Wort zeigen“: zählt als Hilfe für alle Wörter des Blocks, die noch nicht
 * richtig abgeschlossen sind. Schon abgeschlossene Wörter behalten ihren Stand.
 */
export function applyHelp(state: WordRoundState): WordRoundState {
  expectPhase(state, "recall");
  if (state.usedHelp) return state;
  const settled = new Set(state.settledWords);
  return {
    ...state,
    usedHelp: true,
    helpedWords: currentBlock(state).filter((word) => !settled.has(word)),
  };
}

function evaluate(
  state: WordRoundState,
  input: string,
): { words: WordRoundFeedbackWord[]; extra: string[]; correct: boolean } {
  const block = currentBlock(state);
  if (state.stage === 5) {
    const evaluation = evaluateLearningWordBlock(block, input);
    return {
      words: evaluation.words,
      extra: evaluation.extra,
      correct: evaluation.allCorrect,
    };
  }
  const word = block[0]!;
  const result = compareGaps([word], [input])[0]!;
  const correct = result.kind === "richtig";
  return { words: [{ word, correct, result }], extra: [], correct };
}

export function submitWordAnswer(
  state: WordRoundState,
  input: string,
): { state: WordRoundState; correct: boolean; attempts: AttemptRecord[] } {
  expectPhase(state, "recall");
  if (input.trim() === "") throw new Error("Die Eingabe ist leer.");

  const evaluation = evaluate(state, input);
  const attemptNumber = state.blockAttempts + 1;
  const firstKinds = { ...state.firstKinds };
  if (attemptNumber === 1) {
    for (const entry of evaluation.words) {
      firstKinds[entry.word] = entry.result.kind;
    }
  }

  const failedWords = new Set(state.failedWords);
  const settledWords = new Set(state.settledWords);
  const settledAt = { ...state.settledAt };
  const attempts: AttemptRecord[] = [];
  for (const entry of evaluation.words) {
    if (settledWords.has(entry.word)) continue;
    const selfCorrected = entry.correct && failedWords.has(entry.word);
    attempts.push({
      words: [entry.word],
      correct: entry.correct,
      usedHelp: state.helpedWords.includes(entry.word),
      selfCorrected,
      stage: state.stage,
      attemptId: `${state.index}:${attemptNumber}`,
    });
    if (entry.correct) {
      settledWords.add(entry.word);
      settledAt[entry.word] = attemptNumber;
    } else failedWords.add(entry.word);
  }

  const feedback: WordRoundFeedback = {
    correct: evaluation.correct,
    input,
    words: evaluation.words,
    extra: evaluation.extra,
  };
  const next: WordRoundState = {
    ...state,
    phase: "feedback",
    blockAttempts: attemptNumber,
    incorrectAttempts: evaluation.correct
      ? state.incorrectAttempts
      : state.incorrectAttempts + 1,
    firstKinds,
    failedWords: [...failedWords],
    settledWords: [...settledWords],
    settledAt,
    lastFeedback: feedback,
  };

  if (!evaluation.correct) {
    return { state: next, correct: false, attempts };
  }

  const finished: WordRoundWordResult[] = currentBlock(state).map((word) => {
    const firstResult = firstKinds[word] ?? "fehlt";
    const helped = state.helpedWords.includes(word);
    return {
      word,
      firstTry: firstResult === "richtig" && !helped,
      attempts: settledAt[word] ?? attemptNumber,
      usedHelp: helped,
      firstResult,
    };
  });
  return {
    state: { ...next, results: [...state.results, ...finished] },
    correct: true,
    attempts,
  };
}

/** Nach einem Fehler: Merkphase (Stufe 4, 5) bzw. erneut schreiben. */
export function continueAfterFeedback(state: WordRoundState): WordRoundState {
  expectPhase(state, "feedback");
  if (state.lastFeedback?.correct !== false) {
    throw new Error(
      "Nach einer richtigen Antwort geht es mit dem nächsten Block weiter.",
    );
  }
  return { ...state, phase: firstPhase(state.stage), lastFeedback: undefined };
}

/** Nach der kurzen Erfolgsanzeige: nächster Block oder Abschluss. */
export function advanceWordRound(state: WordRoundState): WordRoundState {
  expectPhase(state, "feedback");
  if (state.lastFeedback?.correct !== true) {
    throw new Error("Erst nach einer richtigen Antwort geht es weiter.");
  }
  const index = state.index + 1;
  if (index >= state.blocks.length) {
    return {
      ...state,
      index: state.blocks.length - 1,
      phase: "complete",
      lastFeedback: undefined,
    };
  }
  return { ...state, index, phase: firstPhase(state.stage), ...resetBlock() };
}

/** Wörter auf Anhieb richtig ÷ Wörter der Runde, auf ganze Prozent gerundet. */
export function wordRoundPercent(
  results: readonly WordRoundWordResult[],
): number {
  if (results.length === 0) return 0;
  const right = results.filter((entry) => entry.firstTry).length;
  return Math.round((right / results.length) * 100);
}
