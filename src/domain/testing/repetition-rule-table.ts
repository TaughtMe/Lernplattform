import { expect } from "vitest";

/**
 * Regeltabelle aus Vault 06 („Grundregeln“) als gemeinsamer Regressionstest
 * für alle Wiederholungsmodule (Audit A-004, Welle 3 D1). Jedes Modul
 * schreibt einen Treiber, der Antworten in seine eigene Fachlogik übersetzt;
 * die Fälle hier prüfen nur, was Box und Fälligkeit danach zeigen.
 */
export type RuleTableAnswer = {
  at: number;
  correct: boolean;
  roundId: string;
  usedHelp?: boolean;
  /** Standard: erster Versuch in der Runde. */
  firstAttempt?: boolean;
  /** Selbsteinschätzung statt schriftlicher Antwort. */
  selfCheck?: boolean;
};

export type RuleTableDriver = {
  /** Antwort in der fälligen Wiederholung des Moduls. */
  answer(input: RuleTableAnswer): void;
  /** Box des Eintrags; vor dem ersten Kontakt 1. */
  box(): number;
  /** Fälligkeit in Millisekunden. */
  dueAt(): number;
};

export type RuleTableModule = {
  name: string;
  /** Neuer Treiber; `start` ist der Zeitpunkt, ab dem der Eintrag existiert. */
  create(start: number): RuleTableDriver;
  /** Höchste reguläre Box (Mathe 4, sonst 5). */
  maxBox: number;
  /** Modul kennt Selbsteinschätzung (Obergrenze Box 3). */
  selfCheck: boolean;
};

const MINUTE = 60_000;
export const RULE_TABLE_START = Date.parse("2026-03-02T08:00:00.000Z");

let roundCounter = 0;
function round() {
  roundCounter += 1;
  return `runde-${roundCounter}`;
}

/** Bringt den Eintrag mit sauberen, fälligen Antworten auf Box `target`. */
export function advanceToBox(driver: RuleTableDriver, target: number) {
  let at = RULE_TABLE_START;
  for (let step = 0; step < 12 && driver.box() < target; step += 1) {
    at = Math.max(at, driver.dueAt()) + MINUTE;
    driver.answer({ at, correct: true, roundId: round() });
  }
  expect(driver.box()).toBe(target);
  return Math.max(at, driver.dueAt()) + MINUTE;
}

export type RuleTableCase = {
  /** Zeile der Vault-Tabelle bzw. Grundregel. */
  rule: string;
  applies?: (learningModule: RuleTableModule) => boolean;
  run(learningModule: RuleTableModule): void;
};

export const REPETITION_RULE_TABLE: readonly RuleTableCase[] = [
  {
    rule: "Neues Wort: Box 1",
    run(learningModule) {
      const driver = learningModule.create(RULE_TABLE_START);
      expect(driver.box()).toBe(1);
    },
  },
  {
    rule: "Beim ersten Versuch richtig (fällig): eine Box weiter",
    run(learningModule) {
      const driver = learningModule.create(RULE_TABLE_START);
      const at = advanceToBox(driver, 2);
      driver.answer({ at, correct: true, roundId: round() });
      expect(driver.box()).toBe(3);
      expect(driver.dueAt()).toBeGreaterThan(at);
    },
  },
  {
    rule: "Bedeutung falsch: Box 1",
    run(learningModule) {
      const driver = learningModule.create(RULE_TABLE_START);
      const at = advanceToBox(driver, 3);
      driver.answer({ at, correct: false, roundId: round() });
      expect(driver.box()).toBe(1);
      expect(driver.dueAt()).toBeLessThanOrEqual(at + 24 * 60 * MINUTE);
    },
  },
  {
    rule: "Hinweis oder Lösung verwendet: kein Aufstieg",
    run(learningModule) {
      const driver = learningModule.create(RULE_TABLE_START);
      const at = advanceToBox(driver, 2);
      driver.answer({ at, correct: true, usedHelp: true, roundId: round() });
      expect(driver.box()).toBeLessThanOrEqual(2);
    },
  },
  {
    rule: "Übersprungen: kein Aufstieg beziehungsweise Box 1",
    run(learningModule) {
      const driver = learningModule.create(RULE_TABLE_START);
      const at = advanceToBox(driver, 3);
      // Übersprungen wird wie eine nicht gewusste Antwort gemeldet.
      driver.answer({ at, correct: false, usedHelp: true, roundId: round() });
      expect(driver.box()).toBe(1);
    },
  },
  {
    rule: "Nach einem Fehler doch richtig: bleibt in Box 1",
    run(learningModule) {
      const driver = learningModule.create(RULE_TABLE_START);
      const at = advanceToBox(driver, 3);
      driver.answer({ at, correct: false, roundId: round() });
      driver.answer({ at: at + 10 * MINUTE, correct: true, roundId: round() });
      expect(driver.box()).toBe(1);
    },
  },
  {
    rule: "Mehrfach in derselben Runde richtig: höchstens ein Aufstieg",
    run(learningModule) {
      const driver = learningModule.create(RULE_TABLE_START);
      const at = advanceToBox(driver, 2);
      const roundId = round();
      driver.answer({ at, correct: true, roundId });
      driver.answer({
        at: at + MINUTE,
        correct: true,
        roundId,
        firstAttempt: false,
      });
      driver.answer({ at: at + 2 * MINUTE, correct: true, roundId });
      expect(driver.box()).toBe(3);
    },
  },
  {
    rule: "Kein Aufstieg vor der Fälligkeit",
    run(learningModule) {
      const driver = learningModule.create(RULE_TABLE_START);
      let at = advanceToBox(driver, 2);
      for (let step = 0; step < 5; step += 1) {
        at += 40 * MINUTE;
        driver.answer({ at, correct: true, roundId: round() });
      }
      expect(driver.box()).toBe(3);
    },
  },
  {
    rule: "Höchste Box: richtig und fällig bleibt dort, kein Überlauf",
    run(learningModule) {
      const driver = learningModule.create(RULE_TABLE_START);
      const at = advanceToBox(driver, learningModule.maxBox);
      driver.answer({ at, correct: true, roundId: round() });
      expect(driver.box()).toBe(learningModule.maxBox);
    },
  },
  {
    rule: "Selbsteinschätzung hebt höchstens bis Box 3",
    applies: (learningModule) => learningModule.selfCheck,
    run(learningModule) {
      const driver = learningModule.create(RULE_TABLE_START);
      let at = RULE_TABLE_START;
      for (let step = 0; step < 6; step += 1) {
        at = Math.max(at, driver.dueAt()) + MINUTE;
        driver.answer({ at, correct: true, roundId: round(), selfCheck: true });
      }
      expect(driver.box()).toBe(3);
    },
  },
];
