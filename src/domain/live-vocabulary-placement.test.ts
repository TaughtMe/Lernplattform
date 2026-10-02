import { describe, expect, it } from "vitest";
import {
  classifyLiveVocabulary,
  DEFAULT_PLACEMENT_RULES,
  shouldTransfer,
  type LiveVocabularyOutcome,
  type LiveVocabularyTransferChoice,
  type LiveWordTrace,
  type PlacementRules,
} from "./live-vocabulary-placement";

const strict: PlacementRules = { resetAfterErrors: 5 };

describe("classifyLiveVocabulary", () => {
  const cases: [
    string,
    LiveWordTrace,
    PlacementRules,
    LiveVocabularyOutcome,
  ][] = [
    [
      "sicher gewusst",
      { errors: 0, usedHelp: false, answered: true },
      DEFAULT_PLACEMENT_RULES,
      "known",
    ],
    [
      "1 Fehlversuch",
      { errors: 1, usedHelp: false, answered: true },
      DEFAULT_PLACEMENT_RULES,
      "practice",
    ],
    [
      "2 Fehlversuche",
      { errors: 2, usedHelp: false, answered: true },
      DEFAULT_PLACEMENT_RULES,
      "practice",
    ],
    [
      "3 Fehlversuche",
      { errors: 3, usedHelp: false, answered: true },
      DEFAULT_PLACEMENT_RULES,
      "reset",
    ],
    [
      "Hilfe ohne Fehler",
      { errors: 0, usedHelp: true, answered: true },
      DEFAULT_PLACEMENT_RULES,
      "reset",
    ],
    [
      "4 Fehlversuche, lockere Regel",
      { errors: 4, usedHelp: false, answered: true },
      strict,
      "practice",
    ],
    [
      "5 Fehlversuche, lockere Regel",
      { errors: 5, usedHelp: false, answered: true },
      strict,
      "reset",
    ],
    [
      "nicht erreicht",
      { errors: 0, usedHelp: false, answered: false },
      DEFAULT_PLACEMENT_RULES,
      "unseen",
    ],
    [
      "angefangen mit Fehler",
      { errors: 1, usedHelp: false, answered: false },
      DEFAULT_PLACEMENT_RULES,
      "practice",
    ],
    [
      "angefangen mit 3 Fehlern",
      { errors: 3, usedHelp: false, answered: false },
      DEFAULT_PLACEMENT_RULES,
      "reset",
    ],
    [
      "angefangen mit Hilfe",
      { errors: 0, usedHelp: true, answered: false },
      DEFAULT_PLACEMENT_RULES,
      "reset",
    ],
  ];
  it.each(cases)("%s", (_name, trace, rules, expected) => {
    expect(classifyLiveVocabulary(trace, rules)).toBe(expected);
  });
});

describe("shouldTransfer", () => {
  const outcomes: LiveVocabularyOutcome[] = [
    "known",
    "practice",
    "reset",
    "unseen",
  ];
  const expected: Record<LiveVocabularyTransferChoice, boolean[]> = {
    all: [true, true, true, true],
    errors: [false, true, true, true],
    none: [false, false, false, false],
  };
  for (const choice of Object.keys(
    expected,
  ) as LiveVocabularyTransferChoice[]) {
    it(`Option ${choice}`, () => {
      expect(
        outcomes.map((outcome) => shouldTransfer(outcome, choice)),
      ).toEqual(expected[choice]);
    });
  }
});
