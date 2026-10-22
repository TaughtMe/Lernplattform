import { describe, expect, it } from "vitest";
import type { LearningWordStage } from "./learning-word";
import {
  learningWordId,
  updateLearningWordProgress,
  type LearningWordBox,
  type LearningWordMode,
  type LearningWordProgress,
} from "./learning-word-progress";
import { LEITNER_INTERVAL_DAYS } from "./leitner-schedule";

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
    regel: "W-6 Wiederholung, höchstens Box 5",
    mode: "due",
    from: { box: 5, due: true, stage: 6 },
    first: true,
    outcome: "richtig",
    stage: 6,
    expect: { box: 5, dueAt: "+30", stage: 6 },
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

describe("learning word progress: Regeltabelle W-1 bis W-8", () => {
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

  it("W-6: Jede Wiederholung zur Fälligkeit hebt die Box um eine Stufe, bis 5", () => {
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
    expect(boxes).toEqual([2, 3, 4, 5, 5, 5, 5]);
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
