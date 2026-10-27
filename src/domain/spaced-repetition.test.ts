import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  REPETITION_RULES,
  reviewRepetition,
  type RepetitionAnswer,
  type RepetitionRules,
  type RepetitionState,
} from "./spaced-repetition";
import {
  REPETITION_RULE_TABLE,
  type RuleTableModule,
} from "./testing/repetition-rule-table";

const NOW = Date.parse("2026-03-02T08:00:00.000Z");
const HOUR = 60 * 60 * 1000;

function answer(input: Partial<RepetitionAnswer> = {}): RepetitionAnswer {
  return {
    now: NOW,
    correct: true,
    usedHelp: false,
    selfCorrected: false,
    firstAttempt: true,
    evidence: "written",
    scheduled: true,
    ...input,
  };
}

function coreModule(
  name: keyof typeof REPETITION_RULES,
  maxBox: number,
  selfCheck: boolean,
): RuleTableModule {
  const rules: RepetitionRules = REPETITION_RULES[name];
  return {
    name: `Kern (${name})`,
    maxBox,
    selfCheck,
    create(start) {
      let state: RepetitionState | undefined;
      // Mathe-Posten entstehen erst durch einen Fehler.
      if (name === "mathe") {
        state = reviewRepetition(
          undefined,
          answer({ now: start - DAY_MS, correct: false, roundId: "anlage" }),
          rules,
        ).state;
      }
      return {
        answer(input) {
          state = reviewRepetition(
            state,
            answer({
              now: input.at,
              correct: input.correct,
              usedHelp: input.usedHelp ?? false,
              firstAttempt: input.firstAttempt ?? true,
              roundId: input.roundId,
              evidence: input.selfCheck ? "self-check" : "written",
            }),
            rules,
          ).state;
        },
        box: () => state?.box ?? 1,
        dueAt: () => state?.dueAt ?? start,
      };
    },
  };
}

const MODULES = [
  coreModule("lernbox", 5, true),
  coreModule("lernwort", 5, false),
  coreModule("mathe", 4, false),
  coreModule("ereignis", 5, true),
];

describe("Regeltabelle Vault 06 am Kern", () => {
  for (const learningModule of MODULES) {
    for (const row of REPETITION_RULE_TABLE) {
      if (row.applies && !row.applies(learningModule)) continue;
      it(`${learningModule.name}: ${row.rule}`, () => row.run(learningModule));
    }
  }
});

describe("reviewRepetition", () => {
  const lernbox = REPETITION_RULES.lernbox;
  const lernwort = REPETITION_RULES.lernwort;
  const introduced: RepetitionState = {
    box: 2,
    dueAt: NOW - HOUR,
    introduced: true,
    intervalDays: 3,
    lastReviewedAt: NOW - 3 * DAY_MS,
  };

  it("steigt fällig und richtig eine Box auf und nennt den Grund", () => {
    const result = reviewRepetition(introduced, answer(), lernbox);
    expect(result.decision).toBe("promoted");
    expect(result.state).toMatchObject({
      box: 3,
      dueAt: NOW + 7 * DAY_MS,
      intervalDays: 7,
      lastReviewedAt: NOW,
    });
  });

  it("wertet zu frühes Üben nur als Üben", () => {
    const early = { ...introduced, dueAt: NOW + 2 * DAY_MS };
    const result = reviewRepetition(early, answer(), lernbox);
    expect(result.decision).toBe("early");
    expect(result.state.box).toBe(2);
    expect(result.state.dueAt).toBe(early.dueAt);
  });

  it("zählt den Puffer vor der Fälligkeit (LernBox)", () => {
    const soon = { ...introduced, dueAt: NOW + 11 * HOUR };
    expect(reviewRepetition(soon, answer(), lernbox).decision).toBe("promoted");
  });

  it("setzt einen Fehler auch vor der Fälligkeit auf Box 1 (LernBox)", () => {
    const early = { ...introduced, dueAt: NOW + 2 * DAY_MS };
    const result = reviewRepetition(early, answer({ correct: false }), lernbox);
    expect(result.decision).toBe("reset");
    expect(result.state).toMatchObject({ box: 1, dueAt: NOW });
  });

  it("hält die Box bei richtig mit Hilfe (zweite Chance)", () => {
    const result = reviewRepetition(
      introduced,
      answer({ usedHelp: true }),
      lernbox,
    );
    expect(result.decision).toBe("held");
    expect(result.state).toMatchObject({ box: 2, dueAt: NOW + 3 * DAY_MS });
  });

  it("schließt einen Fehler innerhalb von 8 Stunden ohne Aufstieg", () => {
    const recent = { ...introduced, lastReviewedAt: NOW - 2 * HOUR };
    const result = reviewRepetition(recent, answer(), lernbox);
    expect(result.decision).toBe("recovered");
    expect(result.state).toMatchObject({ box: 2, dueAt: NOW + DAY_MS });
  });

  it("deckelt die Selbsteinschätzung bei Box 3, ohne höhere Boxen zu senken", () => {
    const high = { ...introduced, box: 4 };
    const result = reviewRepetition(
      high,
      answer({ evidence: "self-check" }),
      lernbox,
    );
    expect(result.decision).toBe("repeated");
    expect(result.state.box).toBe(4);
  });

  it("legt ein neues Lernwort in Box 1 an, morgen fällig", () => {
    const result = reviewRepetition(undefined, answer(), lernwort);
    expect(result.decision).toBe("started");
    expect(result.state.box).toBe(1);
    expect(result.state.dueAt).toBeGreaterThan(NOW);
    expect(result.state.dueAt).toBeLessThanOrEqual(NOW + DAY_MS);
  });

  it("lässt die Box beim freien Üben und macht Fehler morgen fällig", () => {
    const later = { ...introduced, dueAt: NOW + 5 * DAY_MS };
    const clean = reviewRepetition(
      later,
      answer({ scheduled: false }),
      lernwort,
    );
    expect(clean).toEqual({ state: later, decision: "practiced" });
    const mistake = reviewRepetition(
      later,
      answer({ scheduled: false, correct: false }),
      lernwort,
    );
    expect(mistake.decision).toBe("practiced-mistake");
    expect(mistake.state.box).toBe(2);
    expect(mistake.state.dueAt).toBeLessThanOrEqual(NOW + DAY_MS);
  });

  it("ignoriert weitere Versuche an einem fälligen Wort", () => {
    const result = reviewRepetition(
      introduced,
      answer({ firstAttempt: false, correct: false }),
      lernwort,
    );
    expect(result).toEqual({ state: introduced, decision: "ignored" });
  });

  it("wertet eine Selbstkorrektur in der fälligen Wiederholung als Fehler", () => {
    const result = reviewRepetition(
      introduced,
      answer({ selfCorrected: true }),
      lernwort,
    );
    expect(result.decision).toBe("reset");
    expect(result.state.box).toBe(1);
  });

  it("lässt in derselben Runde keinen zweiten Schritt zu (Mathe)", () => {
    const mathe = REPETITION_RULES.mathe;
    const failed = reviewRepetition(
      undefined,
      answer({ correct: false, roundId: "a" }),
      mathe,
    ).state;
    const same = reviewRepetition(
      failed,
      answer({ now: NOW + HOUR, roundId: "a" }),
      mathe,
    );
    expect(same.decision).toBe("ignored");
    expect(same.state.awaitingRecovery).toBe(true);
    const next = reviewRepetition(
      same.state,
      answer({ now: NOW + 2 * HOUR, roundId: "b" }),
      mathe,
    );
    expect(next.decision).toBe("recovered");
    expect(next.state).toMatchObject({
      box: 1,
      dueAt: NOW + 2 * HOUR + DAY_MS,
    });
  });
});

describe("Eigenschaft: Aufstieg höchstens einmal je Fälligkeit", () => {
  const step = fc.record({
    minutes: fc.integer({ min: 0, max: 60 * 24 * 10 }),
    correct: fc.boolean(),
    usedHelp: fc.boolean(),
    selfCorrected: fc.boolean(),
    firstAttempt: fc.boolean(),
    selfCheck: fc.boolean(),
    scheduled: fc.boolean(),
    newRound: fc.boolean(),
  });

  for (const name of Object.keys(REPETITION_RULES) as Array<
    keyof typeof REPETITION_RULES
  >) {
    it(`${name}: jeder Aufstieg erst ab Fälligkeit, nie über die höchste Box`, () => {
      const rules: RepetitionRules = REPETITION_RULES[name];
      fc.assert(
        fc.property(fc.array(step, { maxLength: 40 }), (steps) => {
          let state: RepetitionState | undefined;
          let now = NOW;
          let round = 0;
          for (const input of steps) {
            now += input.minutes * 60_000;
            if (input.newRound) round += 1;
            const before = state;
            const result = reviewRepetition(
              state,
              answer({
                now,
                correct: input.correct,
                usedHelp: input.usedHelp,
                selfCorrected: input.selfCorrected,
                firstAttempt: input.firstAttempt,
                evidence: input.selfCheck ? "self-check" : "written",
                scheduled: input.scheduled,
                roundId: `r${round}`,
              }),
              rules,
            );
            state = result.state;
            expect(state.box).toBeGreaterThanOrEqual(1);
            expect(state.box).toBeLessThanOrEqual(rules.maxBox);
            if (result.decision === "promoted") {
              expect(input.correct && !input.usedHelp).toBe(true);
              if (before?.introduced) {
                expect(now).toBeGreaterThanOrEqual(
                  before.dueAt - rules.dueToleranceMs(before),
                );
              }
              expect(state.box).toBe((before?.box ?? 1) + 1);
            } else if (result.decision !== "started") {
              expect(state.box).toBeLessThanOrEqual(before?.box ?? 1);
            }
          }
        }),
      );
    });
  }
});
