import { describe, expect, it } from "vitest";
import type { LearningWordStage } from "./learning-word";
import {
  isLearningArchiveBonusDue,
  isLearningArchiveWord,
  isLearningWordDue,
  learningWordId,
  updateLearningWordProgress,
  type LearningWordBox,
  type LearningWordMode,
  type LearningWordProgress,
} from "./learning-word-progress";
import {
  REPETITION_RULE_TABLE,
  type RuleTableModule,
} from "./testing/repetition-rule-table";
import {
  LEARNING_ARCHIVE_BONUS_DAYS,
  LEITNER_INTERVAL_DAYS,
} from "./leitner-schedule";

// Lokale Zeiten: „Beginn des nächsten Tages“ hängt an der Zeitzone des Geräts.
const NOW = new Date(2026, 9, 21, 15, 0).toISOString();
const NEXT_DAY = new Date(2026, 9, 22, 0, 0).toISOString();
const DAY_MS = 86_400_000;

function shifted(base: string, ms: number) {
  return new Date(new Date(base).getTime() + ms).toISOString();
}
/** Schon fällig (seit einer Stunde) oder erst in zehn Tagen. */
const DUE = shifted(NOW, -3_600_000);
const LATER = shifted(NOW, 10 * DAY_MS);

function stored(
  box: LearningWordBox,
  dueAt: string,
  stage: LearningWordStage,
): LearningWordProgress {
  return {
    id: learningWordId("Schlüssel"),
    word: "Schlüssel",
    stage,
    box,
    dueAt,
    attempts: 4,
    incorrectAttempts: 1,
    helpUses: 0,
    lastPracticedAt: shifted(NOW, -5 * DAY_MS),
  };
}

type Outcome = "richtig" | "falsch" | "hilfe" | "korrigiert" | "nach-fehler";

/** Übersetzt das Ergebnis eines Versuchs in die Eingabefelder. */
function attempt(outcome: Outcome) {
  switch (outcome) {
    case "richtig":
      return { correct: true, usedHelp: false, selfCorrected: false };
    case "falsch":
    case "nach-fehler":
      return { correct: false, usedHelp: false, selfCorrected: false };
    case "hilfe":
      return { correct: true, usedHelp: true, selfCorrected: false };
    case "korrigiert":
      return { correct: true, usedHelp: false, selfCorrected: true };
  }
}

function update(
  current: LearningWordProgress | undefined,
  options: {
    mode: LearningWordMode;
    first: boolean;
    outcome: Outcome;
    stage: LearningWordStage;
    now?: string;
  },
) {
  return updateLearningWordProgress(current, {
    word: "Schlüssel",
    ...attempt(options.outcome),
    stage: options.stage,
    now: options.now ?? NOW,
    mode: options.mode,
    firstAttempt: options.first,
  });
}

type Row = {
  regel: string;
  mode: LearningWordMode;
  /** Ausgangslernstand: Box, fällig, Merkstufe; `null` = noch nie geübt. */
  from: { box: LearningWordBox; due: boolean; stage: LearningWordStage } | null;
  first: boolean;
  outcome: Outcome;
  stage: LearningWordStage;
  expect: {
    box: LearningWordBox;
    /** `same` = Fälligkeit bleibt, `next` = Beginn des nächsten Tages, `+n` = n Tage ab jetzt. */
    dueAt: "same" | "next" | `+${number}`;
    stage: LearningWordStage;
  };
};

const RULES: Row[] = [
  // W-1, W-2: Freies Üben, erster Versuch richtig ohne Hilfe.
  {
    regel: "W-2 frei, fällig, richtig: Box und Fälligkeit bleiben",
    mode: "free",
    from: { box: 3, due: true, stage: 3 },
    first: true,
    outcome: "richtig",
    stage: 4,
    expect: { box: 3, dueAt: "same", stage: 4 },
  },
  {
    regel: "W-2 frei, nicht fällig, richtig: Box und Fälligkeit bleiben",
    mode: "free",
    from: { box: 4, due: false, stage: 5 },
    first: true,
    outcome: "richtig",
    stage: 5,
    expect: { box: 4, dueAt: "same", stage: 5 },
  },
  {
    regel: "W-1/W-8 frei, Abschreiben (Stufe 1) hebt weder Box noch Merkstufe",
    mode: "free",
    from: { box: 2, due: true, stage: 3 },
    first: true,
    outcome: "richtig",
    stage: 1,
    expect: { box: 2, dueAt: "same", stage: 3 },
  },
  // W-3: Freies Üben, Fehler oder „Wort zeigen“.
  {
    regel: "W-3 frei, Fehler: Box bleibt, spätestens morgen fällig",
    mode: "free",
    from: { box: 4, due: false, stage: 5 },
    first: true,
    outcome: "falsch",
    stage: 5,
    expect: { box: 4, dueAt: "next", stage: 4 },
  },
  {
    regel: "W-3 frei, Wort zeigen: Box bleibt, spätestens morgen fällig",
    mode: "free",
    from: { box: 3, due: false, stage: 4 },
    first: true,
    outcome: "hilfe",
    stage: 4,
    expect: { box: 3, dueAt: "next", stage: 3 },
  },
  {
    regel:
      "W-3 frei, Fehler bei schon fälligem Wort: Fälligkeit wird nicht später",
    mode: "free",
    from: { box: 2, due: true, stage: 2 },
    first: true,
    outcome: "falsch",
    stage: 2,
    expect: { box: 2, dueAt: "same", stage: 1 },
  },
  {
    regel: "W-3 frei, spätere Korrektur ändert nichts",
    mode: "free",
    from: { box: 2, due: false, stage: 2 },
    first: false,
    outcome: "korrigiert",
    stage: 2,
    expect: { box: 2, dueAt: "same", stage: 2 },
  },
  {
    regel:
      "W-3 frei, weiterer Fehler: Box bleibt, Merkstufe sinkt nicht noch einmal",
    mode: "free",
    from: { box: 2, due: false, stage: 2 },
    first: false,
    outcome: "nach-fehler",
    stage: 2,
    expect: { box: 2, dueAt: "next", stage: 2 },
  },
  // W-4: Wort ohne Lernstand.
  {
    regel: "W-4 frei, neues Wort richtig: Box 1, morgen fällig",
    mode: "free",
    from: null,
    first: true,
    outcome: "richtig",
    stage: 2,
    expect: { box: 1, dueAt: "next", stage: 2 },
  },
  {
    regel: "W-4 frei, neues Wort falsch: Box 1, morgen fällig",
    mode: "free",
    from: null,
    first: true,
    outcome: "falsch",
    stage: 3,
    expect: { box: 1, dueAt: "next", stage: 2 },
  },
  {
    regel: "W-4 Wiederholung ohne Lernstand: wie freies Üben",
    mode: "due",
    from: null,
    first: true,
    outcome: "richtig",
    stage: 4,
    expect: { box: 1, dueAt: "next", stage: 4 },
  },
  // W-6: Fällige Wiederholung, erster Versuch richtig.
  {
    regel: "W-6 Wiederholung, fällig, richtig: Box + 1, Abstand der neuen Box",
    mode: "due",
    from: { box: 2, due: true, stage: 4 },
    first: true,
    outcome: "richtig",
    stage: 4,
    expect: { box: 3, dueAt: "+7", stage: 4 },
  },
  {
    regel: "W-6 Wiederholung, Box 1 → 2",
    mode: "due",
    from: { box: 1, due: true, stage: 5 },
    first: true,
    outcome: "richtig",
    stage: 5,
    expect: { box: 2, dueAt: "+3", stage: 5 },
  },
  {
    regel: "W-6 Wiederholung, Box 3 → 4",
    mode: "due",
    from: { box: 3, due: true, stage: 5 },
    first: true,
    outcome: "richtig",
    stage: 5,
    expect: { box: 4, dueAt: "+14", stage: 5 },
  },
  {
    regel: "W-6/A-1 Wiederholung, Stufe 4 in Box 5 bleibt Box 5",
    mode: "due",
    from: { box: 5, due: true, stage: 4 },
    first: true,
    outcome: "richtig",
    stage: 4,
    expect: { box: 5, dueAt: "+30", stage: 4 },
  },
  {
    regel: "W-6/A-1 Wiederholung, Stufe 5 in Box 5 bleibt Box 5",
    mode: "due",
    from: { box: 5, due: true, stage: 5 },
    first: true,
    outcome: "richtig",
    stage: 5,
    expect: { box: 5, dueAt: "+30", stage: 5 },
  },
  // A-1: Lernarchiv (Box 6).
  {
    regel: "A-1 Wiederholung, Box 5 richtig auf Stufe 6: Lernarchiv, Bonus +30",
    mode: "due",
    from: { box: 5, due: true, stage: 6 },
    first: true,
    outcome: "richtig",
    stage: 6,
    expect: { box: 6, dueAt: "+30", stage: 6 },
  },
  {
    regel: "A-1 Box 4 richtig auf Stufe 6 kommt nur in Box 5, nicht ins Archiv",
    mode: "due",
    from: { box: 4, due: true, stage: 6 },
    first: true,
    outcome: "richtig",
    stage: 6,
    expect: { box: 5, dueAt: "+30", stage: 6 },
  },
  {
    regel: "A-1 Box 5 auf Stufe 6 mit Hilfe: nicht ins Archiv, Box 1",
    mode: "due",
    from: { box: 5, due: true, stage: 6 },
    first: true,
    outcome: "hilfe",
    stage: 6,
    expect: { box: 1, dueAt: "next", stage: 5 },
  },
  {
    regel: "A-1 Box 5 auf Stufe 6 mit Selbstkorrektur: nicht ins Archiv, Box 1",
    mode: "due",
    from: { box: 5, due: true, stage: 6 },
    first: true,
    outcome: "korrigiert",
    stage: 6,
    expect: { box: 1, dueAt: "next", stage: 5 },
  },
  {
    regel: "A-1 Box 5 auf Stufe 6, nur späterer Versuch: kein Archiv",
    mode: "due",
    from: { box: 5, due: true, stage: 6 },
    first: false,
    outcome: "richtig",
    stage: 6,
    expect: { box: 5, dueAt: "same", stage: 6 },
  },
  {
    regel: "A-1 Box 5 auf Stufe 6 im freien Üben: Box bleibt 5 (W-1)",
    mode: "free",
    from: { box: 5, due: true, stage: 6 },
    first: true,
    outcome: "richtig",
    stage: 6,
    expect: { box: 5, dueAt: "same", stage: 6 },
  },
  // A-4: Bonusabfrage eines Archivworts.
  {
    regel: "A-4 Bonus richtig: bleibt Box 6, wieder +30 Tage",
    mode: "due",
    from: { box: 6, due: true, stage: 6 },
    first: true,
    outcome: "richtig",
    stage: 4,
    expect: { box: 6, dueAt: "+30", stage: 6 },
  },
  {
    regel: "A-4 Bonus falsch: zurück in Box 4, morgen fällig",
    mode: "due",
    from: { box: 6, due: true, stage: 6 },
    first: true,
    outcome: "falsch",
    stage: 5,
    expect: { box: 4, dueAt: "next", stage: 4 },
  },
  {
    regel: "A-4 Bonus mit Hilfe: zurück in Box 4, morgen fällig",
    mode: "due",
    from: { box: 6, due: true, stage: 6 },
    first: true,
    outcome: "hilfe",
    stage: 6,
    expect: { box: 4, dueAt: "next", stage: 5 },
  },
  {
    regel: "A-4 Bonus mit Selbstkorrektur: zurück in Box 4, morgen fällig",
    mode: "due",
    from: { box: 6, due: true, stage: 6 },
    first: true,
    outcome: "korrigiert",
    stage: 6,
    expect: { box: 4, dueAt: "next", stage: 5 },
  },
  {
    regel: "A-4 Archivwort, noch nicht für den Bonus fällig: wie freies Üben",
    mode: "due",
    from: { box: 6, due: false, stage: 6 },
    first: true,
    outcome: "richtig",
    stage: 6,
    expect: { box: 6, dueAt: "same", stage: 6 },
  },
  {
    regel: "A-4 freies Üben, richtig: Box 6 und Bonus-Termin bleiben (W-1)",
    mode: "free",
    from: { box: 6, due: false, stage: 6 },
    first: true,
    outcome: "richtig",
    stage: 4,
    expect: { box: 6, dueAt: "same", stage: 6 },
  },
  {
    regel: "A-4 freies Üben, Fehler: Box 6 bleibt, Bonus darf morgen kommen",
    mode: "free",
    from: { box: 6, due: false, stage: 6 },
    first: true,
    outcome: "falsch",
    stage: 4,
    expect: { box: 6, dueAt: "next", stage: 3 },
  },
  {
    regel:
      "A-4 freies Üben, Wort zeigen: Box 6 bleibt, Bonus darf morgen kommen",
    mode: "free",
    from: { box: 6, due: false, stage: 6 },
    first: true,
    outcome: "hilfe",
    stage: 6,
    expect: { box: 6, dueAt: "next", stage: 5 },
  },
  {
    regel: "W-6 Wiederholung, Box 4 → 5",
    mode: "due",
    from: { box: 4, due: true, stage: 6 },
    first: true,
    outcome: "richtig",
    stage: 6,
    expect: { box: 5, dueAt: "+30", stage: 6 },
  },
  {
    regel: "W-6 Wiederholung, nicht fälliges Wort zählt wie freies Üben",
    mode: "due",
    from: { box: 3, due: false, stage: 4 },
    first: true,
    outcome: "richtig",
    stage: 4,
    expect: { box: 3, dueAt: "same", stage: 4 },
  },
  {
    regel: "W-6 Wiederholung, nicht fälliges Wort mit Fehler: wie freies Üben",
    mode: "due",
    from: { box: 3, due: false, stage: 4 },
    first: true,
    outcome: "falsch",
    stage: 4,
    expect: { box: 3, dueAt: "next", stage: 3 },
  },
  // W-7: Fällige Wiederholung, erster Versuch falsch oder mit Hilfe.
  {
    regel: "W-7 Wiederholung, Fehler: Box 1, morgen fällig",
    mode: "due",
    from: { box: 4, due: true, stage: 5 },
    first: true,
    outcome: "falsch",
    stage: 5,
    expect: { box: 1, dueAt: "next", stage: 4 },
  },
  {
    regel: "W-7 Wiederholung, Wort zeigen (F-001): Box 1, morgen fällig",
    mode: "due",
    from: { box: 4, due: true, stage: 4 },
    first: true,
    outcome: "hilfe",
    stage: 4,
    expect: { box: 1, dueAt: "next", stage: 3 },
  },
  {
    regel: "W-7 Wiederholung, spätere Selbstkorrektur ändert nichts",
    mode: "due",
    from: { box: 1, due: true, stage: 3 },
    first: false,
    outcome: "korrigiert",
    stage: 4,
    expect: { box: 1, dueAt: "same", stage: 3 },
  },
  {
    regel: "W-7 Wiederholung, weiterer Fehler ändert nichts",
    mode: "due",
    from: { box: 1, due: true, stage: 3 },
    first: false,
    outcome: "nach-fehler",
    stage: 4,
    expect: { box: 1, dueAt: "same", stage: 3 },
  },
  // W-8: Merkstufe.
  {
    regel: "W-8 richtig auf Anhieb: max(bisher, Stufe) ohne +1",
    mode: "free",
    from: { box: 1, due: false, stage: 2 },
    first: true,
    outcome: "richtig",
    stage: 5,
    expect: { box: 1, dueAt: "same", stage: 5 },
  },
  {
    regel: "W-8 richtig auf niedrigerer Stufe: Merkstufe bleibt",
    mode: "free",
    from: { box: 1, due: false, stage: 5 },
    first: true,
    outcome: "richtig",
    stage: 2,
    expect: { box: 1, dueAt: "same", stage: 5 },
  },
  {
    regel: "W-8 Fehler auf niedrigerer Stufe: min(bisher, Stufe) − 1",
    mode: "free",
    from: { box: 1, due: false, stage: 5 },
    first: true,
    outcome: "falsch",
    stage: 2,
    expect: { box: 1, dueAt: "next", stage: 1 },
  },
  {
    regel: "W-8 Merkstufe sinkt nie unter 1",
    mode: "due",
    from: { box: 2, due: true, stage: 1 },
    first: true,
    outcome: "falsch",
    stage: 1,
    expect: { box: 1, dueAt: "next", stage: 1 },
  },
  {
    regel: "W-8 Stufe 6 richtig bleibt bei 6",
    mode: "due",
    from: { box: 3, due: true, stage: 6 },
    first: true,
    outcome: "richtig",
    stage: 6,
    expect: { box: 4, dueAt: "+14", stage: 6 },
  },
];

function expectedDueAt(row: Row, fromDueAt: string | undefined) {
  switch (row.expect.dueAt) {
    case "same":
      return fromDueAt;
    case "next":
      return NEXT_DAY;
    default:
      return shifted(NOW, Number(row.expect.dueAt.slice(1)) * DAY_MS);
  }
}

describe("learning word progress: Regeltabelle W-1 bis W-8 und A-1 bis A-4", () => {
  it.each(RULES)("$regel", (row) => {
    const dueAt = row.from?.due ? DUE : LATER;
    const current = row.from
      ? stored(row.from.box, dueAt, row.from.stage)
      : undefined;

    const result = update(current, {
      mode: row.mode,
      first: row.first,
      outcome: row.outcome,
      stage: row.stage,
    });

    expect(result.box).toBe(row.expect.box);
    expect(result.stage).toBe(row.expect.stage);
    expect(result.dueAt).toBe(expectedDueAt(row, current?.dueAt));
  });

  it("nutzt die Abstände der Leitner-Boxen und beide Modi", () => {
    expect(RULES.some((row) => row.mode === "free")).toBe(true);
    expect(RULES.some((row) => row.mode === "due")).toBe(true);
    for (const box of [2, 3, 4, 5] as const) {
      expect(
        RULES.some(
          (row) => row.expect.dueAt === `+${LEITNER_INTERVAL_DAYS[box]}`,
        ),
      ).toBe(true);
    }
  });

  it("zählt Versuche, Fehler und Hilfen in jedem Modus mit", () => {
    const current = stored(3, LATER, 3);
    const wrong = update(current, {
      mode: "free",
      first: true,
      outcome: "falsch",
      stage: 3,
    });
    const help = update(wrong, {
      mode: "due",
      first: false,
      outcome: "hilfe",
      stage: 3,
    });
    expect(help).toMatchObject({
      attempts: 6,
      incorrectAttempts: 2,
      helpUses: 1,
      lastPracticedAt: NOW,
      word: "Schlüssel",
    });
  });
});

describe("learning word progress: Pflichtfälle des Audits", () => {
  it("D-001: Vier Abschreibrunden an einem Nachmittag ändern die Box nicht", () => {
    let progress: LearningWordProgress = stored(2, DUE, 3);
    const times = [14, 15, 16, 17].map((hour) =>
      new Date(2026, 9, 21, hour, 0).toISOString(),
    );
    for (const now of times) {
      progress = update(progress, {
        mode: "free",
        first: true,
        outcome: "richtig",
        stage: 1,
        now,
      });
    }
    expect(progress).toMatchObject({ box: 2, dueAt: DUE, stage: 3 });
  });

  it("D-001: Mehrere Erfolge in der Wiederholung zum selben Zeitpunkt heben die Box nur einmal", () => {
    let progress: LearningWordProgress = stored(1, DUE, 4);
    for (let round = 0; round < 8; round += 1) {
      progress = update(progress, {
        mode: "due",
        first: true,
        outcome: "richtig",
        stage: 4,
      });
    }
    expect(progress.box).toBe(2);
  });

  it("W-6: Jede Wiederholung zur Fälligkeit hebt die Box um eine Stufe, bis 5 und mit Stufe 6 ins Archiv", () => {
    // Erste Runde frei: Box 1, morgen fällig.
    let progress = update(undefined, {
      mode: "free",
      first: true,
      outcome: "richtig",
      stage: 4,
    });
    const boxes: number[] = [];
    for (let round = 0; round < 7; round += 1) {
      progress = update(progress, {
        mode: "due",
        first: true,
        outcome: "richtig",
        stage: 6,
        now: progress.dueAt,
      });
      boxes.push(progress.box);
    }
    // Stufe 6 ohne Hilfe in Box 5 führt ins Lernarchiv (A-1); weitere
    // fällige Abfragen sind Bonusabfragen und lassen Box 6 stehen (A-4).
    expect(boxes).toEqual([2, 3, 4, 5, 6, 6, 6]);
    expect(progress.stage).toBe(6);
  });

  it.each([1, 2, 3, 4, 5] as const)(
    "F-001: Hilfe → richtig gibt in Box %i nie einen längeren Abstand als falsch → richtig",
    (box) => {
      for (const mode of ["free", "due"] as const) {
        for (const dueAt of [DUE, LATER]) {
          const current = stored(box, dueAt, 4);
          const help = update(current, {
            mode,
            first: true,
            outcome: "hilfe",
            stage: 4,
          });
          const wrong = update(current, {
            mode,
            first: true,
            outcome: "falsch",
            stage: 4,
          });
          const wrongThenRight = update(wrong, {
            mode,
            first: false,
            outcome: "korrigiert",
            stage: 4,
          });
          expect(new Date(help.dueAt).getTime()).toBeLessThanOrEqual(
            new Date(wrongThenRight.dueAt).getTime(),
          );
          expect(help.box).toBeLessThanOrEqual(wrongThenRight.box);
        }
      }
    },
  );

  it("W-8: Fehler auf Stufe 6, danach Abschreiben: Merkstufe steigt nicht auf 6", () => {
    const afterError = update(stored(3, LATER, 5), {
      mode: "free",
      first: true,
      outcome: "falsch",
      stage: 6,
    });
    expect(afterError.stage).toBe(4);
    const afterCopy = update(afterError, {
      mode: "free",
      first: true,
      outcome: "richtig",
      stage: 1,
    });
    expect(afterCopy.stage).toBe(4);
  });

  it("W-8: Merkstufe und Wiederholungsbox bleiben getrennt", () => {
    const first = update(undefined, {
      mode: "free",
      first: true,
      outcome: "richtig",
      stage: 2,
      now: "2026-08-24T10:00:00.000Z",
    });
    const afterError = update(first, {
      mode: "free",
      first: true,
      outcome: "falsch",
      stage: 3,
      now: "2026-08-25T10:00:00.000Z",
    });
    expect(first).toMatchObject({ stage: 2, box: 1 });
    expect(afterError).toMatchObject({ stage: 1, box: 1 });
  });
});

describe("Lernarchiv (Box 6): Fälligkeit", () => {
  it("A-7: Der Bonus-Abstand ist 30 Tage und steht nicht in der Leitner-Tabelle", () => {
    expect(LEARNING_ARCHIVE_BONUS_DAYS).toBe(30);
    expect(Object.keys(LEITNER_INTERVAL_DAYS)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
  });

  it("A-2: Ein Archivwort ist nie regulär fällig, aber bonusfähig ab dueAt", () => {
    const archived = stored(6, DUE, 6);
    expect(isLearningArchiveWord(archived)).toBe(true);
    expect(isLearningWordDue(archived, NOW)).toBe(false);
    expect(isLearningArchiveBonusDue(archived, NOW)).toBe(true);
    expect(isLearningArchiveBonusDue(stored(6, LATER, 6), NOW)).toBe(false);
    expect(isLearningWordDue(stored(5, DUE, 6), NOW)).toBe(true);
    expect(isLearningArchiveBonusDue(stored(5, DUE, 6), NOW)).toBe(false);
  });

  it("A-4: Nach einem Fehler im Bonus kommt das Wort über Box 4 und 5 zurück ins Archiv", () => {
    let progress = update(stored(6, DUE, 6), {
      mode: "due",
      first: true,
      outcome: "falsch",
      stage: 6,
    });
    expect(progress.box).toBe(4);
    progress = update(progress, {
      mode: "due",
      first: true,
      outcome: "richtig",
      stage: 6,
      now: progress.dueAt,
    });
    expect(progress.box).toBe(5);
    progress = update(progress, {
      mode: "due",
      first: true,
      outcome: "richtig",
      stage: 6,
      now: progress.dueAt,
    });
    expect(progress.box).toBe(6);
  });
});

/** Treiber der Regeltabelle: fällige Wiederholung („due“) auf Merkstufe 4. */
const learningWordModule: RuleTableModule = {
  name: "Lernwörter (updateLearningWordProgress)",
  maxBox: 5,
  selfCheck: false,
  create(start) {
    let progress: LearningWordProgress | undefined;
    return {
      answer(input) {
        progress = updateLearningWordProgress(progress, {
          word: "Schlüssel",
          correct: input.correct,
          usedHelp: input.usedHelp ?? false,
          selfCorrected: false,
          stage: 4,
          now: new Date(input.at).toISOString(),
          mode: "due",
          firstAttempt: input.firstAttempt ?? true,
        });
      },
      box: () => progress?.box ?? 1,
      dueAt: () => (progress ? Date.parse(progress.dueAt) : start),
    };
  },
};

describe("Regeltabelle Vault 06 an den Lernwörtern", () => {
  for (const row of REPETITION_RULE_TABLE) {
    if (row.applies && !row.applies(learningWordModule)) continue;
    it(row.rule, () => row.run(learningWordModule));
  }
});
