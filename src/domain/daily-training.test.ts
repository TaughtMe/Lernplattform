import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { CompetenceEntry, CompetenceProfile } from "./competence-profile";
import type {
  DailyPlanItem,
  DailyPlanKind,
  DailyPlanModule,
} from "./daily-plan";
import {
  TRAINING_MODULE_ROUTES,
  TRAINING_SECONDS,
  planTraining,
  trainingMinutesLabel,
  trainingSegments,
  trainingStatus,
  trainingStepHref,
} from "./daily-training";

function item(
  key: string,
  kind: DailyPlanKind,
  module: DailyPlanModule,
  objectIds: string[] = [key],
): DailyPlanItem {
  return { key, kind, module, objectIds };
}

function entry(
  id: string,
  level: CompetenceEntry["level"],
  open = 0,
): CompetenceEntry {
  return {
    id,
    kind: "wortbox",
    module: "german",
    label: `Bereich ${id}`,
    route: "/x",
    level,
    reason: { code: "no-answers" },
    objects: 10,
    started: 10,
    safe: 0,
    needed: 8,
    open,
    cleanDays: 0,
  };
}

function profile(
  entries: CompetenceEntry[],
  areas: Record<string, string[]> = {},
): CompetenceProfile {
  return { entries, objectAreas: new Map(Object.entries(areas)) };
}

const EMPTY = profile([]);

describe("Tagestraining: Planung", () => {
  it("stellt Fehler vor Wiederholungen vor Neues und das Archivwort zuletzt", () => {
    const plan = planTraining({
      items: [
        item("a", "archive", "german"),
        item("n", "new", "vocabulary"),
        item("r", "review", "german"),
        item("e", "error", "mathematics"),
      ],
      minutes: 20,
      profile: EMPTY,
    });
    expect(plan.steps.map((step) => step.item.key)).toEqual([
      "e",
      "r",
      "n",
      "a",
    ]);
  });

  it("nimmt innerhalb einer Art zuerst die schwachen Teilbereiche", () => {
    const plan = planTraining({
      items: [
        item("sicher", "review", "german", ["w1"]),
        item("neu", "review", "german", ["w2"]),
        item("schwach", "review", "german", ["w3"]),
        item("sehr-schwach", "review", "german", ["w4"]),
      ],
      minutes: 20,
      profile: profile(
        [
          entry("s", "sicher"),
          entry("n", "neu"),
          entry("a", "im-aufbau", 1),
          entry("b", "im-aufbau", 5),
        ],
        { w1: ["s"], w2: ["n"], w3: ["a"], w4: ["b"] },
      ),
    });
    expect(plan.steps.map((step) => step.item.key)).toEqual([
      "sehr-schwach",
      "schwach",
      "neu",
      "sicher",
    ]);
    expect(plan.steps[0]!.area).toEqual({ id: "b", label: "Bereich b" });
  });

  it("nimmt bei einem Wort in mehreren Wortboxen den schwächsten Teilbereich", () => {
    const plan = planTraining({
      items: [item("w", "review", "german", ["w1"])],
      minutes: 10,
      profile: profile([entry("s", "sicher"), entry("b", "im-aufbau", 3)], {
        w1: ["s", "b"],
      }),
    });
    expect(plan.steps[0]!.area?.id).toBe("b");
  });

  it("ordnet Mathe-Elemente über ihre Familie dem Teilbereich zu", () => {
    const plan = planTraining({
      items: [
        item("mathematics:add:normal:bis-20", "review", "mathematics", ["x"]),
        item("mathematics:multiply:normal:reihe-7", "review", "mathematics", [
          "y",
        ]),
      ],
      minutes: 10,
      profile: profile([
        entry("rechenart:multiply:normal:reihe-7", "im-aufbau", 2),
        entry("rechenart:add:normal:bis-20", "sicher"),
      ]),
    });
    expect(plan.steps.map((step) => step.item.key)).toEqual([
      "mathematics:multiply:normal:reihe-7",
      "mathematics:add:normal:bis-20",
    ]);
  });

  it("behält die Reihenfolge der Portion bei Gleichstand", () => {
    const plan = planTraining({
      items: [
        item("b", "review", "german"),
        item("a", "review", "vocabulary"),
        item("c", "review", "mathematics"),
      ],
      minutes: 20,
      profile: EMPTY,
    });
    expect(plan.steps.map((step) => step.item.key)).toEqual(["b", "a", "c"]);
  });

  it("nimmt Elemente auf, solange die geschätzte Zeit unter der Dauer liegt", () => {
    const items = Array.from({ length: 30 }, (_, index) =>
      item(`k${index}`, "review", "german"),
    );
    const ten = planTraining({ items, minutes: 10, profile: EMPTY });
    const twenty = planTraining({ items, minutes: 20, profile: EMPTY });
    const each = TRAINING_SECONDS.german * 1000;
    // 600 s / 45 s = 13,3: das 14. Element beginnt noch vor Ablauf.
    expect(ten.steps).toHaveLength(14);
    expect(ten.estimatedMs).toBe(14 * each);
    expect(ten.leftOut).toBe(16);
    expect(twenty.steps).toHaveLength(27);
    expect(twenty.leftOut).toBe(3);
  });

  it("plant mindestens ein Element, wenn eines offen ist, und nichts ohne", () => {
    const one = planTraining({
      items: [item("m", "error", "mathematics")],
      minutes: 10,
      profile: EMPTY,
    });
    expect(one.steps).toHaveLength(1);
    expect(one.leftOut).toBe(0);
    expect(
      planTraining({ items: [], minutes: 10, profile: EMPTY }),
    ).toMatchObject({
      steps: [],
      estimatedMs: 0,
      leftOut: 0,
    });
  });

  it("schätzt jede Aufgabenart mit einer benannten Konstante", () => {
    for (const art of ["vocabulary", "german", "mathematics"] as const) {
      expect(TRAINING_SECONDS[art]).toBeGreaterThan(0);
    }
    const plan = planTraining({
      items: [item("v", "review", "vocabulary")],
      minutes: 10,
      profile: EMPTY,
    });
    expect(plan.steps[0]!.seconds).toBe(TRAINING_SECONDS.vocabulary);
  });
});

describe("Tagestraining: Planung (Eigenschaften)", () => {
  const kinds: DailyPlanKind[] = ["error", "review", "new", "archive"];
  const modules: DailyPlanModule[] = ["vocabulary", "german", "mathematics"];
  const items = fc.array(
    fc.record({
      kind: fc.constantFrom(...kinds),
      module: fc.constantFrom(...modules),
    }),
    { maxLength: 40 },
  );

  it("bleibt unter der Dauer plus einer Aufgabe und verliert kein Element", () => {
    fc.assert(
      fc.property(
        items,
        fc.constantFrom<10 | 20>(10, 20),
        (generated, minutes) => {
          const list = generated.map((entry, index) =>
            item(`k${index}`, entry.kind, entry.module),
          );
          const plan = planTraining({ items: list, minutes, profile: EMPTY });
          const longest = Math.max(...Object.values(TRAINING_SECONDS)) * 1000;
          expect(plan.steps.length + plan.leftOut).toBe(list.length);
          expect(plan.estimatedMs).toBeLessThan(plan.budgetMs + longest);
          // Ohne das letzte Element war noch Zeit.
          const withoutLast = plan.steps
            .slice(0, -1)
            .reduce((sum, step) => sum + step.seconds * 1000, 0);
          if (plan.steps.length > 0) {
            expect(withoutLast).toBeLessThan(plan.budgetMs);
          }
          // Reihenfolge: Fehler, Wiederholung, Neues, Archiv.
          const order = plan.steps.map((step) => kinds.indexOf(step.item.kind));
          expect(order).toEqual([...order].sort((a, b) => a - b));
        },
      ),
    );
  });

  it("20 Minuten umfassen die Schritte von 10 Minuten", () => {
    fc.assert(
      fc.property(items, (generated) => {
        const list = generated.map((entry, index) =>
          item(`k${index}`, entry.kind, entry.module),
        );
        const ten = planTraining({ items: list, minutes: 10, profile: EMPTY });
        const twenty = planTraining({
          items: list,
          minutes: 20,
          profile: EMPTY,
        });
        expect(twenty.steps.slice(0, ten.steps.length)).toEqual(ten.steps);
        expect(twenty.steps.length).toBeGreaterThanOrEqual(ten.steps.length);
      }),
    );
  });
});

describe("Tagestraining: Ende-Regel", () => {
  const budgetMs = 10 * 60_000;

  it("läuft, solange Zeit und Schritte da sind", () => {
    expect(
      trainingStatus({
        budgetMs,
        activeMs: 1000,
        taskRunning: false,
        stepsLeft: 3,
      }),
    ).toBe("running");
    expect(
      trainingStatus({
        budgetMs,
        activeMs: 1000,
        taskRunning: true,
        stepsLeft: 0,
      }),
    ).toBe("running");
  });

  it("lässt die laufende Aufgabe fertig werden, wenn die Zeit abläuft", () => {
    expect(
      trainingStatus({
        budgetMs,
        activeMs: budgetMs,
        taskRunning: true,
        stepsLeft: 5,
      }),
    ).toBe("finish-current");
    expect(
      trainingStatus({
        budgetMs,
        activeMs: budgetMs + 5000,
        taskRunning: true,
        stepsLeft: 5,
      }),
    ).toBe("finish-current");
  });

  it("schließt ab, sobald nach Ablauf keine Aufgabe mehr läuft", () => {
    expect(
      trainingStatus({
        budgetMs,
        activeMs: budgetMs,
        taskRunning: false,
        stepsLeft: 5,
      }),
    ).toBe("closing");
  });

  it("schließt auch vor Ablauf ab, wenn nichts mehr offen ist", () => {
    expect(
      trainingStatus({
        budgetMs,
        activeMs: 2000,
        taskRunning: false,
        stepsLeft: 0,
      }),
    ).toBe("closing");
  });
});

describe("Tagestraining: Hilfen", () => {
  it("verlinkt auf die Portion des Moduls oder die eigene Route", () => {
    expect(trainingStepHref(item("a", "review", "german"))).toBe(
      TRAINING_MODULE_ROUTES.german,
    );
    expect(TRAINING_MODULE_ROUTES.mathematics).toBe(
      "/frei/mathematics?heute=1",
    );
    expect(
      trainingStepHref({
        ...item("a", "error", "vocabulary"),
        route: "/klasse/x/aufgaben",
      }),
    ).toBe("/klasse/x/aufgaben");
  });

  it("rundet die Dauer auf ganze Minuten, mindestens eine", () => {
    expect(trainingMinutesLabel(0)).toBe(1);
    expect(trainingMinutesLabel(20_000)).toBe(1);
    expect(trainingMinutesLabel(9.4 * 60_000)).toBe(9);
    expect(trainingMinutesLabel(10 * 60_000)).toBe(10);
  });
});

describe("Tagestraining: Abschnitte", () => {
  it("fasst aufeinanderfolgende Schritte desselben Ziels zusammen", () => {
    const plan = planTraining({
      items: [
        item("a", "error", "mathematics"),
        item("b", "error", "mathematics"),
        item("c", "review", "german"),
        item("d", "review", "mathematics"),
        { ...item("e", "new", "vocabulary"), route: "/klasse/x" },
        { ...item("f", "new", "vocabulary"), route: "/klasse/x" },
      ],
      minutes: 20,
      profile: EMPTY,
    });
    const segments = trainingSegments(plan.steps);
    expect(
      segments.map((segment) => [
        segment.href,
        segment.steps.map((step) => step.item.key),
        segment.seconds,
      ]),
    ).toEqual([
      ["/frei/mathematics?heute=1", ["a", "b"], 150],
      ["/frei/german/lernwoerter?heute=1", ["c"], 45],
      ["/frei/mathematics?heute=1", ["d"], 75],
      ["/klasse/x", ["e", "f"], 40],
    ]);
  });

  it("liefert für kein Element keinen Abschnitt", () => {
    expect(trainingSegments([])).toEqual([]);
  });
});
