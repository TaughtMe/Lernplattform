import { nextLocalDayStart } from "./local-day";

/**
 * Gemeinsamer Wiederholungskern (Audit A-004, M1; Umsetzungsplan Welle 3, D1).
 *
 * Eine reine Funktion entscheidet für LernBox, Lernwörter, Mathe und die
 * Ereignisableitung, was eine Antwort mit Box und Fälligkeit macht. Die Module
 * übergeben nur ihren Stand und die Antwort; was sich zwischen ihnen
 * unterscheidet, steht ausdrücklich in `RepetitionRules`. Modulbesonderheiten
 * (Lernarchiv, Rückstufung nach Zeit, „gefestigt“ in Mathe) bleiben in den
 * Modulen und setzen auf der Entscheidung des Kerns auf.
 *
 * Gemeinsame Regeln (Vault 06, Grundregeln):
 * - Kein Aufstieg vor der Fälligkeit.
 * - Höchstens ein Aufstieg je Fälligkeit: Nach einem Aufstieg liegt die neue
 *   Fälligkeit in der Zukunft, jede weitere Antwort ist zu früh.
 * - Hilfe, Lösung oder Selbstkorrektur: kein Aufstieg.
 * - Nach einem Fehler doch richtig: kein Aufstieg, der Fehler gilt als
 *   geschlossen (Erholung).
 * - In einer Runde zählt nur der erste Versuch.
 * - Selbsteinschätzung hebt höchstens bis `selfCheckMaxBox`.
 *
 * Jede Entscheidung trägt einen maschinenlesbaren Grund (`RepetitionDecision`).
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

export type RepetitionState = {
  /** Box, von der aus gerechnet wird (bei der LernBox die wirksame Box). */
  box: number;
  /** Fälligkeit in Millisekunden. */
  dueAt: number;
  /**
   * Schon im Zeitplan (mindestens einmal bewertet). Neue Einträge steigen nach
   * `rules.newItem` auf oder starten in Box 1.
   */
  introduced: boolean;
  /** Letzter Abruf in dieser Richtung bzw. diesem Eintrag (Erholungsfenster). */
  lastReviewedAt?: number;
  /** Ein Fehler ist noch nicht durch eine richtige Antwort geschlossen. */
  awaitingRecovery?: boolean;
  /** Runde der letzten gewerteten Antwort (Regel „eine Runde, ein Schritt“). */
  lastRoundId?: string;
  /** Aktueller Abstand in Tagen, falls das Modul ihn getrennt speichert (LernBox). */
  intervalDays?: number;
};

export type RepetitionAnswer = {
  now: number;
  correct: boolean;
  /** Hinweis, Lösung, Abschreibvorlage oder zweite Chance genutzt. */
  usedHelp: boolean;
  /** Vor dem Absenden korrigiert oder erst im zweiten Anlauf richtig. */
  selfCorrected: boolean;
  /** Erster Versuch an diesem Eintrag in dieser Runde. */
  firstAttempt: boolean;
  roundId?: string;
  /** Schriftlich geprüft oder selbst eingeschätzt („Gewusst“ nach Aufdecken). */
  evidence: "written" | "self-check";
  /**
   * Antwort zählt für den Zeitplan. `false` ist freies Üben: Es ändert die Box
   * nie (Lernwörter, Regel W-1).
   */
  scheduled: boolean;
};

export type RepetitionRules = {
  /** Abstand in Tagen je Box (Index = Box − 1). */
  intervalDays: readonly number[];
  /** Höchste Box im Kern. Ein Lernarchiv o. Ä. setzt das Modul darauf. */
  maxBox: number;
  /** Selbsteinschätzung hebt höchstens bis hierhin. */
  selfCheckMaxBox: number;
  /** So viel früher als `dueAt` gilt ein Eintrag schon als fällig. */
  dueToleranceMs: (state: RepetitionState) => number;
  /** Fälligkeit nach einem Fehler: sofort oder Beginn des nächsten Tages. */
  failureDue: "now" | "next-local-day";
  /**
   * Was ein Fehler außerhalb der fälligen Wiederholung (freies Üben, zu früh)
   * bewirkt: `reset` wie in der fälligen Wiederholung, `due-next-local-day`
   * lässt die Box und macht den Eintrag spätestens morgen fällig (W-3).
   */
  mistakeOutsideSchedule: "reset" | "due-next-local-day";
  /**
   * Richtig mit Hilfe: `mistake` zählt wie ein Fehler, `hold` lässt die Box
   * und setzt den Abstand der Box (zweite Chance der LernBox).
   */
  helpedCorrect: "mistake" | "hold";
  /**
   * Erste Antwort an einem neuen Eintrag: `promote` steigt wie eine fällige
   * Antwort auf (LernBox), `start` legt Box 1 an, morgen fällig (W-4).
   */
  newItem: "promote" | "start";
  /**
   * Erholung nach einem Fehler: `flag` nutzt `awaitingRecovery`, `gapMs`
   * zusätzlich den Abstand zum letzten Abruf (LernBox: 8 Stunden).
   */
  recovery: { flag: boolean; gapMs?: number };
  /** Eine weitere Antwort in derselben Runde ändert nichts (Mathe). */
  oneStepPerRound: boolean;
};

export type RepetitionDecision =
  /** Neuer Eintrag, Box 1 (W-4). */
  | "started"
  /** Eine Box höher. */
  | "promoted"
  /** Fällig und richtig, Box bleibt an der Obergrenze (maxBox bzw. Selbsteinschätzung). */
  | "repeated"
  /** Richtig mit Hilfe, Box bleibt, Abstand der Box. */
  | "held"
  /** Erster richtiger Abruf nach einem Fehler: Box bleibt, morgen wieder. */
  | "recovered"
  /** Fehler: Box 1. */
  | "reset"
  /** Richtig, aber noch nicht fällig: nur Üben. */
  | "early"
  /** Freies Üben ohne Fehler: nichts ändert sich. */
  | "practiced"
  /** Fehler beim freien Üben: Box bleibt, spätestens morgen fällig. */
  | "practiced-mistake"
  /** Nicht der erste Versuch bzw. dieselbe Runde: zählt nicht. */
  | "ignored";

export type RepetitionResult = {
  state: RepetitionState;
  decision: RepetitionDecision;
};

const HOUR_MS = 60 * 60 * 1000;

/** Abstände 1/3/7/14/30 Tage je Box (Vault 06, „Erste technische Fälligkeitsstaffel“). */
export const LEITNER_STAFFEL_DAYS = [1, 3, 7, 14, 30] as const;

/**
 * Regelkonfiguration je Modul an einem Ort, damit Unterschiede sichtbar und
 * begründet bleiben (Regeltabelle D1).
 */
export const REPETITION_RULES = {
  /**
   * LernBox je Richtung: fällig mit Puffer (4 h bei Abstand ≤ 1 Tag, sonst
   * 12 h), Fehler sofort fällig, Erholungsfenster 8 h zum letzten Abruf dieser
   * Richtung, zweite Chance hält die Box, Selbsteinschätzung bis Box 3.
   */
  lernbox: {
    intervalDays: LEITNER_STAFFEL_DAYS,
    maxBox: 5,
    selfCheckMaxBox: 3,
    dueToleranceMs: (state) =>
      ((state.intervalDays ?? 0) <= 1 ? 4 : 12) * HOUR_MS,
    failureDue: "now",
    mistakeOutsideSchedule: "reset",
    helpedCorrect: "hold",
    newItem: "promote",
    recovery: { flag: false, gapMs: 8 * HOUR_MS },
    oneStepPerRound: false,
  },
  /**
   * Lernwörter (W-1 bis W-8): Nur „Trainingswörter heute“ zählt; Fehler und
   * Hilfe setzen auf Box 1, morgen fällig; freies Üben ändert die Box nie.
   * Das Lernarchiv (Box 6) setzt das Modul auf Box 5 auf.
   */
  lernwort: {
    intervalDays: LEITNER_STAFFEL_DAYS,
    maxBox: 5,
    selfCheckMaxBox: 5,
    dueToleranceMs: () => 0,
    failureDue: "next-local-day",
    mistakeOutsideSchedule: "due-next-local-day",
    helpedCorrect: "mistake",
    newItem: "start",
    recovery: { flag: false },
    oneStepPerRound: false,
  },
  /**
   * Mathe-Wiederholungsposten: Box = Stufe 1 bis 4 (`MATH_REVIEW_DAYS`), ein
   * Posten entsteht erst durch einen Fehler. Erste saubere Antwort danach
   * schließt den Fehler (Stufe 1), je Runde höchstens ein Schritt; die saubere
   * fällige Antwort auf Stufe 4 festigt den Posten (Modul).
   */
  mathe: {
    intervalDays: [1, 3, 7, 14],
    maxBox: 4,
    selfCheckMaxBox: 4,
    dueToleranceMs: () => 0,
    failureDue: "now",
    mistakeOutsideSchedule: "reset",
    helpedCorrect: "mistake",
    newItem: "promote",
    recovery: { flag: true },
    oneStepPerRound: true,
  },
  /**
   * Ableitung aus Lernereignissen (Wissen und Schreiben je Richtung): wie die
   * LernBox, aber Erholung über den offenen Fehler statt über die Uhr.
   */
  ereignis: {
    intervalDays: LEITNER_STAFFEL_DAYS,
    maxBox: 5,
    selfCheckMaxBox: 3,
    dueToleranceMs: () => 0,
    failureDue: "now",
    mistakeOutsideSchedule: "reset",
    helpedCorrect: "hold",
    newItem: "promote",
    recovery: { flag: true },
    oneStepPerRound: true,
  },
} as const satisfies Record<string, RepetitionRules>;

export function repetitionIntervalDays(rules: RepetitionRules, box: number) {
  const index = Math.min(Math.max(box, 1), rules.intervalDays.length) - 1;
  return rules.intervalDays[index]!;
}

export function isRepetitionDue(
  state: RepetitionState,
  now: number,
  rules: Pick<RepetitionRules, "dueToleranceMs">,
) {
  return now >= state.dueAt - rules.dueToleranceMs(state);
}

function nextDayStart(now: number) {
  return new Date(nextLocalDayStart(now)).getTime();
}

function failureDueAt(rules: RepetitionRules, now: number) {
  return rules.failureDue === "now" ? now : nextDayStart(now);
}

/**
 * Wirkung einer Antwort auf Box und Fälligkeit. Ohne `current` ist der
 * Eintrag neu. Die Reihenfolge der Prüfungen ist die Regeltabelle D1 in
 * `docs/umsetzungsplan-audit-welle-3.md`.
 */
export function reviewRepetition(
  current: RepetitionState | undefined,
  answer: RepetitionAnswer,
  rules: RepetitionRules,
): RepetitionResult {
  const { now } = answer;
  const state: RepetitionState = current ?? {
    box: 1,
    dueAt: now,
    introduced: false,
  };
  const reviewed = (
    next: Partial<RepetitionState>,
    decision: RepetitionDecision,
  ): RepetitionResult => ({
    state: {
      ...state,
      ...next,
      introduced: true,
      lastReviewedAt: now,
      ...(answer.roundId === undefined ? {} : { lastRoundId: answer.roundId }),
    },
    decision,
  });

  // K-1: Neuer Eintrag ohne Aufstieg startet in Box 1, morgen fällig.
  if (!state.introduced && rules.newItem === "start") {
    return reviewed(
      { box: 1, dueAt: nextDayStart(now), intervalDays: 1 },
      "started",
    );
  }

  const mistake =
    !answer.correct || (answer.usedHelp && rules.helpedCorrect === "mistake");
  const clean = answer.correct && !answer.usedHelp && !answer.selfCorrected;
  const held =
    rules.helpedCorrect === "hold" &&
    answer.correct &&
    answer.usedHelp &&
    !answer.selfCorrected;
  const due = !state.introduced || isRepetitionDue(state, now, rules);

  // K-2: Freies Üben und zu frühe Antworten ändern die Box nie (W-1 bis W-3).
  if (
    !(answer.scheduled && due) &&
    rules.mistakeOutsideSchedule === "due-next-local-day"
  ) {
    if (!mistake) {
      return { state, decision: answer.scheduled ? "early" : "practiced" };
    }
    return {
      state: { ...state, dueAt: Math.min(state.dueAt, nextDayStart(now)) },
      decision: "practiced-mistake",
    };
  }

  // K-3: Nur der erste Versuch einer Runde zählt.
  if (!answer.firstAttempt) return { state, decision: "ignored" };

  // K-4: Fehler (auch zu früh): Box 1.
  if (!clean && !held) {
    return reviewed(
      {
        box: 1,
        dueAt: failureDueAt(rules, now),
        intervalDays: 1,
        awaitingRecovery: true,
      },
      "reset",
    );
  }

  // K-5: Richtig mit Hilfe: Box bleibt, Abstand der Box.
  if (held) {
    return reviewed(
      {
        dueAt: now + repetitionIntervalDays(rules, state.box) * DAY_MS,
        intervalDays: repetitionIntervalDays(rules, state.box),
        awaitingRecovery: false,
      },
      "held",
    );
  }

  // K-6: Weitere Antwort derselben Runde, freies Üben, zu früh: kein Aufstieg.
  if (
    rules.oneStepPerRound &&
    answer.roundId !== undefined &&
    state.lastRoundId === answer.roundId
  ) {
    return reviewed({}, "ignored");
  }
  if (!answer.scheduled) return { state, decision: "practiced" };
  if (!due) return reviewed({}, "early");

  // K-7: Erster richtiger Abruf nach einem Fehler: Box bleibt, morgen wieder.
  const recovering =
    state.introduced &&
    ((rules.recovery.flag && state.awaitingRecovery === true) ||
      (rules.recovery.gapMs !== undefined &&
        state.lastReviewedAt !== undefined &&
        now - state.lastReviewedAt < rules.recovery.gapMs));
  if (recovering) {
    return reviewed(
      {
        dueAt: now + repetitionIntervalDays(rules, 1) * DAY_MS,
        intervalDays: repetitionIntervalDays(rules, 1),
        awaitingRecovery: false,
      },
      "recovered",
    );
  }

  // K-8: Fällig und richtig: eine Box höher, Selbsteinschätzung gedeckelt.
  const ceiling =
    answer.evidence === "self-check"
      ? Math.max(Math.min(state.box, rules.maxBox), rules.selfCheckMaxBox)
      : rules.maxBox;
  const box = Math.min(state.box + 1, ceiling);
  return reviewed(
    {
      box,
      dueAt: now + repetitionIntervalDays(rules, box) * DAY_MS,
      intervalDays: repetitionIntervalDays(rules, box),
      awaitingRecovery: false,
    },
    box > state.box ? "promoted" : "repeated",
  );
}
