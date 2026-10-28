import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { getLearningWordCollection } from "./german-learning-content";
import {
  MATH_LEVELS,
  SPELLING_LEVELS,
  START_POINT_MAX_TASKS,
  buildMathStartPoint,
  buildSpellingStartPoint,
  mathSuggestion,
  spellingSuggestion,
  startPointProgress,
  type StartPointAnswer,
  type StartPointTask,
} from "./start-point";
import { checkMentalMathAnswer } from "./mental-math";

/** Fester Zufall für die Mathe-Folge. */
function seeded(seed = 7) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/** Antworten: pro Aufgabe richtig (true) oder falsch (false), der Reihe nach. */
function answers(
  tasks: readonly StartPointTask<unknown>[],
  results: readonly boolean[],
): StartPointAnswer[] {
  return results.map((correct, index) => ({
    taskId: tasks[index]!.id,
    correct,
  }));
}

describe("Startpunkt: Folge der Rechtschreibung", () => {
  const tasks = buildSpellingStartPoint();

  it("hat höchstens 12 Aufgaben in steigender Stufe", () => {
    expect(tasks).toHaveLength(12);
    expect(tasks.length).toBeLessThanOrEqual(START_POINT_MAX_TASKS);
    const levels = tasks.map((task) => task.level);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
    expect(new Set(tasks.map((task) => task.id)).size).toBe(tasks.length);
  });

  it("nimmt jedes Wort aus der Wortbox seiner Stufe", () => {
    for (const level of SPELLING_LEVELS) {
      const collection = getLearningWordCollection(level.collectionId);
      expect(collection, level.collectionId).toBeDefined();
      for (const word of level.words) {
        expect(collection!.words, word).toContain(word);
      }
    }
    expect(tasks[0]!.payload).toEqual({
      word: SPELLING_LEVELS[0]!.words[0],
      collectionId: SPELLING_LEVELS[0]!.collectionId,
    });
  });

  it("hat noch keinen Vorschlag ohne Antwort", () => {
    expect(spellingSuggestion(tasks, [])).toBeNull();
  });

  it("endet mit zwei Fehlern auf einer Stufe und schlägt diese Wortbox vor", () => {
    // Stufe 1 und 2 richtig, auf Stufe 3 beide falsch.
    const given = answers(tasks, [true, true, true, true, false, false]);
    const progress = startPointProgress(tasks, given);
    expect(progress).toMatchObject({
      status: "finished",
      end: "two-errors",
      stoppedLevel: 2,
      answered: 6,
    });
    expect(spellingSuggestion(tasks, given)).toEqual({
      subject: "spelling",
      collectionId: "ck-tz",
      collectionTitle: "ck und tz",
      stage: 2,
      reason: "stopped",
    });
  });

  it("zählt zwei Fehler auf verschiedenen Stufen nicht als Ende", () => {
    const given = answers(tasks, [true, false, true, false]);
    expect(startPointProgress(tasks, given)).toMatchObject({
      status: "running",
      answered: 4,
      errorsByLevel: [1, 1, 0, 0, 0, 0],
    });
  });

  it("schlägt bei einem einzelnen Fehler die erste Stufe mit Fehler vor", () => {
    const results = tasks.map(() => true);
    results[5] = false;
    results[8] = false;
    const given = answers(tasks, results);
    expect(startPointProgress(tasks, given)).toMatchObject({
      status: "finished",
      end: "all-answered",
      answered: 12,
    });
    expect(spellingSuggestion(tasks, given)).toMatchObject({
      collectionId: "ck-tz",
      stage: 4,
      reason: "single-error",
    });
  });

  it("schlägt ohne Fehler die schwerste Wortbox mit freiem Abruf vor", () => {
    const given = answers(
      tasks,
      tasks.map(() => true),
    );
    expect(spellingSuggestion(tasks, given)).toMatchObject({
      collectionId: "s-ss-sz",
      stage: 6,
      reason: "all-correct",
    });
  });

  it("endet schon bei zwei Fehlern auf der ersten Stufe", () => {
    const given = answers(tasks, [false, false, true, true]);
    expect(startPointProgress(tasks, given)).toMatchObject({
      status: "finished",
      answered: 2,
      stoppedLevel: 0,
    });
    expect(spellingSuggestion(tasks, given)).toMatchObject({
      collectionId: "long-i",
      stage: 2,
    });
  });

  it("zeigt die nächste Aufgabe und ignoriert Antworten nach dem Ende", () => {
    const running = startPointProgress(tasks, answers(tasks, [true]));
    expect(running).toMatchObject({ status: "running", answered: 1 });
    if (running.status === "running")
      expect(running.next.id).toBe(tasks[1]!.id);
    const extra = answers(tasks, [false, false, true, true, true]);
    expect(startPointProgress(tasks, extra)).toMatchObject({ answered: 2 });
  });
});

describe("Startpunkt: Folge des Kopfrechnens", () => {
  it("hat zwei verschiedene Aufgaben je Stufe, höchstens 12", () => {
    const tasks = buildMathStartPoint(seeded());
    expect(tasks).toHaveLength(MATH_LEVELS.length * 2);
    expect(tasks.length).toBeLessThanOrEqual(START_POINT_MAX_TASKS);
    for (let level = 0; level < MATH_LEVELS.length; level += 1) {
      const own = tasks.filter((task) => task.level === level);
      expect(own).toHaveLength(2);
      expect(new Set(own.map((task) => task.payload.task.source)).size).toBe(2);
    }
  });

  it("hält jede Aufgabe in ihrem Zahlenraum und bei ihrer Rechenart", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const tasks = buildMathStartPoint(seeded(seed));
      for (const { level, payload } of tasks) {
        const config = MATH_LEVELS[level]!;
        expect(config.operations).toContain(payload.task.operation);
        expect(payload.task.answer).toBeGreaterThanOrEqual(0);
        expect(payload.task.answer).toBeLessThanOrEqual(config.maxValue);
        expect(payload.levelId).toBe(config.id);
        expect(
          checkMentalMathAnswer(payload.task, String(payload.task.answer)),
        ).toBe(true);
      }
    }
  });

  it("ist mit festem Zufall reproduzierbar", () => {
    expect(buildMathStartPoint(seeded(9))).toEqual(
      buildMathStartPoint(seeded(9)),
    );
  });

  it("schlägt bei zwei Fehlern in Plus und Minus bis 100 genau diesen Zahlenraum vor", () => {
    const tasks = buildMathStartPoint(seeded());
    const given = answers(tasks, [true, true, true, true, false, false]);
    expect(mathSuggestion(tasks, given)).toEqual({
      subject: "math",
      levelId: "bis-100",
      label: "Plus und Minus bis 100",
      operations: ["add", "subtract"],
      maxValue: 100,
      reason: "stopped",
    });
  });

  it("schlägt ohne Fehler die schwerste Stufe vor und ohne Antwort nichts", () => {
    const tasks = buildMathStartPoint(seeded());
    expect(mathSuggestion(tasks, [])).toBeNull();
    const perfect = answers(
      tasks,
      tasks.map(() => true),
    );
    expect(mathSuggestion(tasks, perfect)).toMatchObject({
      levelId: "bis-1000",
      reason: "all-correct",
    });
  });
});

describe("Startpunkt: Zusammentreffen von Fehlern", () => {
  it("bevorzugt eine Stufe mit zwei Fehlern vor einem früheren Einzelfehler", () => {
    const tasks = buildSpellingStartPoint();
    // Ein Fehler auf Stufe 2, danach zwei Fehler auf Stufe 4.
    const given = answers(tasks, [
      true,
      true,
      true,
      false,
      true,
      true,
      false,
      false,
    ]);
    expect(spellingSuggestion(tasks, given)).toMatchObject({
      collectionId: "final-devoicing",
      reason: "stopped",
    });
  });
});

describe("Startpunkt: Eigenschaften", () => {
  const tasks = buildSpellingStartPoint();
  const results = fc.array(fc.boolean(), { maxLength: 20 });

  it("beantwortet nie mehr Aufgaben als 12 und nie mehr als eine Stufe mit zwei Fehlern", () => {
    fc.assert(
      fc.property(results, (given) => {
        const progress = startPointProgress(
          tasks,
          given.map((correct, index) => ({
            taskId: tasks[index]?.id ?? `extra-${index}`,
            correct,
          })),
        );
        expect(progress.answered).toBeLessThanOrEqual(START_POINT_MAX_TASKS);
        expect(Math.max(...progress.errorsByLevel)).toBeLessThanOrEqual(2);
        if (progress.status === "finished" && progress.end === "two-errors") {
          expect(progress.errorsByLevel[progress.stoppedLevel!]).toBe(2);
        }
        // Läuft er noch, hat keine Stufe zwei Fehler.
        if (progress.status === "running") {
          expect(Math.max(...progress.errorsByLevel)).toBeLessThan(2);
        }
      }),
    );
  });

  it("gibt für jede Antwortfolge mit mindestens einer Antwort einen Vorschlag", () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 12 }),
        (given) => {
          const suggestion = spellingSuggestion(
            tasks,
            given.map((correct, index) => ({
              taskId: tasks[index]!.id,
              correct,
            })),
          );
          expect(suggestion).not.toBeNull();
          expect(SPELLING_LEVELS.map((level) => level.collectionId)).toContain(
            suggestion!.collectionId,
          );
        },
      ),
    );
  });
});
