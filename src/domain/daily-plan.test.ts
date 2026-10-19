import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  DAILY_PLAN_MODULES,
  DAILY_PLAN_QUOTAS,
  DAILY_PLAN_SIZE,
  dailyPlanProgress,
  dailyPlanSchema,
  selectDailyPlan,
  type DailyPlan,
  type DailyPlanCandidate,
  type DailyPlanKind,
  type DailyPlanModule,
} from "./daily-plan";
import type { LearningEventV1 } from "./learning-bundle";
import { localDayKey } from "./local-day";

// Lokale Zeit, damit die Tests in jeder Zeitzone denselben Tag meinen.
const at = (hour: number, minute = 0, dayOfMonth = 19) =>
  new Date(2026, 9, dayOfMonth, hour, minute).toISOString();
const DAY = localDayKey(new Date(2026, 9, 19, 8));
const NOW = at(8);

function candidate(
  key: string,
  module: DailyPlanModule,
  kind: DailyPlanKind,
  dueAt = at(7),
  extra: Partial<DailyPlanCandidate> = {},
): DailyPlanCandidate {
  return { key, module, kind, objectIds: [key], dueAt, ...extra };
}

function many(
  count: number,
  module: DailyPlanModule,
  kind: DailyPlanKind,
  prefix = `${module}-${kind}`,
) {
  return Array.from({ length: count }, (_, index) =>
    candidate(
      `${prefix}-${String(index).padStart(3, "0")}`,
      module,
      kind,
      new Date(2026, 9, 1, 0, index).toISOString(),
    ),
  );
}

const select = (candidates: DailyPlanCandidate[], size?: number) =>
  selectDailyPlan({
    candidates,
    day: DAY,
    now: NOW,
    ...(size === undefined ? {} : { size }),
  });
const count = (plan: DailyPlan, kind: DailyPlanKind) =>
  plan.items.filter((item) => item.kind === kind).length;

describe("selectDailyPlan", () => {
  it("macht ohne Kandidaten einen leeren Plan", () => {
    expect(select([])).toEqual({
      day: DAY,
      createdAt: NOW,
      size: DAILY_PLAN_SIZE,
      items: [],
    });
  });

  it("hält die Kontingente: höchstens 6 Fehler vorab, 4 neue", () => {
    const plan = select([
      ...many(30, "vocabulary", "error"),
      ...many(30, "vocabulary", "review"),
      ...many(30, "vocabulary", "new"),
    ]);
    expect(plan.items).toHaveLength(DAILY_PLAN_SIZE);
    expect(count(plan, "new")).toBe(DAILY_PLAN_QUOTAS.new);
    // Fehler: 6 vorab; die Wiederholungen füllen den Rest bis 16, der Platz
    // für neue bleibt frei. Übrige Fehler kommen nicht mehr hinein.
    expect(count(plan, "error")).toBe(DAILY_PLAN_QUOTAS.error);
    expect(count(plan, "review")).toBe(10);
  });

  it("füllt bei wenigen Fehlern mit Wiederholungen und bei wenigen Wiederholungen mit übrigen Fehlern auf", () => {
    const fewErrors = select([
      ...many(2, "vocabulary", "error"),
      ...many(40, "vocabulary", "review"),
    ]);
    expect(count(fewErrors, "error")).toBe(2);
    expect(count(fewErrors, "review")).toBe(18);

    const fewReviews = select([
      ...many(40, "vocabulary", "error"),
      ...many(3, "vocabulary", "review"),
      ...many(2, "vocabulary", "new"),
    ]);
    expect(fewReviews.items).toHaveLength(DAILY_PLAN_SIZE);
    expect(count(fewReviews, "new")).toBe(2);
    expect(count(fewReviews, "review")).toBe(3);
    expect(count(fewReviews, "error")).toBe(15);
  });

  it("zählt weniger als 20 Elemente, wenn nicht mehr ansteht", () => {
    const plan = select([
      candidate("a", "vocabulary", "review"),
      candidate("b", "german", "new"),
    ]);
    expect(plan.items.map((item) => item.key)).toEqual(["a", "b"]);
  });

  it("bietet ohne Rückstand bis zu 10 neue an, damit die Portion nicht leer wirkt", () => {
    const plan = select(many(50, "vocabulary", "new"));
    expect(plan.items).toHaveLength(DAILY_PLAN_QUOTAS.newWhenFree);
    expect(plan.items.every((item) => item.kind === "new")).toBe(true);
  });

  it("nimmt neben genug Wiederholungen nur 4 neue", () => {
    const plan = select([
      ...many(50, "vocabulary", "new"),
      ...many(30, "german", "review"),
    ]);
    expect(count(plan, "new")).toBe(DAILY_PLAN_QUOTAS.new);
    expect(plan.items).toHaveLength(DAILY_PLAN_SIZE);
  });

  it("füllt bei wenig Rückstand mit Neuem auf, höchstens bis 10", () => {
    const plan = select([
      ...many(50, "vocabulary", "new"),
      ...many(3, "german", "review"),
    ]);
    expect(count(plan, "review")).toBe(3);
    expect(count(plan, "new")).toBe(DAILY_PLAN_QUOTAS.newWhenFree);
  });

  it("wechselt zwischen den Modulen ab", () => {
    const plan = select([
      ...many(10, "vocabulary", "review"),
      ...many(10, "german", "review"),
      ...many(10, "mathematics", "review"),
    ]);
    expect(plan.items.slice(0, 6).map((item) => item.module)).toEqual([
      "vocabulary",
      "german",
      "mathematics",
      "vocabulary",
      "german",
      "mathematics",
    ]);
    const perModule = Object.fromEntries(
      DAILY_PLAN_MODULES.map((module) => [
        module,
        plan.items.filter((item) => item.module === module).length,
      ]),
    );
    expect(perModule).toEqual({ vocabulary: 7, german: 7, mathematics: 6 });
  });

  it("lässt ein kleines Modul nicht Plätze blockieren", () => {
    const plan = select([
      ...many(1, "mathematics", "review"),
      ...many(30, "vocabulary", "review"),
    ]);
    expect(plan.items).toHaveLength(DAILY_PLAN_SIZE);
    expect(
      plan.items.filter((item) => item.module === "mathematics"),
    ).toHaveLength(1);
  });

  it("nimmt den jüngsten Fehler, die am längsten überfällige Wiederholung und das älteste Neue zuerst", () => {
    const plan = select(
      [
        candidate("fehler-alt", "vocabulary", "error", at(1), {
          occurredAt: at(1),
        }),
        candidate("fehler-neu", "vocabulary", "error", at(1), {
          occurredAt: at(6),
        }),
        candidate("fehler-ohne-zeit", "vocabulary", "error", at(3)),
        candidate("wdh-spaet", "vocabulary", "review", at(5)),
        candidate("wdh-frueh", "vocabulary", "review", at(2)),
        candidate("neu-spaet", "vocabulary", "new", at(5)),
        candidate("neu-frueh", "vocabulary", "new", at(2)),
      ],
      DAILY_PLAN_SIZE,
    );
    expect(plan.items.map((item) => item.key)).toEqual([
      "fehler-neu",
      "fehler-ohne-zeit",
      "fehler-alt",
      "wdh-frueh",
      "wdh-spaet",
      "neu-frueh",
      "neu-spaet",
    ]);
  });

  it("ist unabhängig von der Reihenfolge der Eingabe und entscheidet Gleichstand nach dem Schlüssel", () => {
    const input = [
      candidate("c", "vocabulary", "review", at(2)),
      candidate("a", "vocabulary", "review", at(2)),
      candidate("b", "vocabulary", "review", at(2)),
      candidate("e", "vocabulary", "error", at(2), { occurredAt: at(2) }),
      candidate("d", "vocabulary", "error", at(2), { occurredAt: at(2) }),
    ];
    const keys = (items: DailyPlanCandidate[]) =>
      select(items).items.map((item) => item.key);
    expect(keys(input)).toEqual(["d", "e", "a", "b", "c"]);
    expect(keys([...input].reverse())).toEqual(keys(input));
  });

  it("begrenzt auch bei 500 Kandidaten auf 20 und hält die Größe ein", () => {
    const candidates = [
      ...many(200, "vocabulary", "review"),
      ...many(100, "german", "error"),
      ...many(100, "mathematics", "new"),
      ...many(100, "vocabulary", "new"),
    ];
    expect(candidates).toHaveLength(500);
    expect(select(candidates).items).toHaveLength(20);
    expect(select(candidates, 5).items).toHaveLength(5);
    expect(select(candidates, 5).size).toBe(5);
  });

  it("zählt doppelte Schlüssel einmal und bewahrt Objekte und Richtung", () => {
    const plan = select([
      candidate("a", "vocabulary", "review", at(1), {
        objectIds: ["karte"],
        direction: "reverse",
      }),
      candidate("a", "vocabulary", "review", at(2)),
      candidate("m", "mathematics", "error", at(1), {
        objectIds: ["x", "y"],
      }),
    ]);
    expect(plan.items).toEqual([
      {
        key: "m",
        module: "mathematics",
        kind: "error",
        objectIds: ["x", "y"],
      },
      {
        key: "a",
        module: "vocabulary",
        kind: "review",
        objectIds: [expect.any(String)],
      },
    ]);
  });

  it("behält die Richtung im Element", () => {
    const plan = select([
      candidate("k:forward", "vocabulary", "review", at(1), {
        direction: "forward",
      }),
      candidate("k:reverse", "vocabulary", "review", at(2), {
        direction: "reverse",
      }),
    ]);
    expect(plan.items.map((item) => item.direction)).toEqual([
      "forward",
      "reverse",
    ]);
    // Ohne Richtung steht das Feld gar nicht erst im Element.
    expect(
      "direction" in select([candidate("a", "german", "review")]).items[0]!,
    ).toBe(false);
  });

  it("behält eine eigene Übungsroute im Element", () => {
    const plan = select([
      candidate("a", "vocabulary", "error", at(1), {
        route: "/klasse/7b/aufgaben/vokabeln",
      }),
      candidate("b", "vocabulary", "error", at(1)),
    ]);
    expect(plan.items[0]).toMatchObject({
      route: "/klasse/7b/aufgaben/vokabeln",
    });
    expect(plan.items[1]).not.toHaveProperty("route");
    expect(dailyPlanSchema.safeParse(plan).success).toBe(true);
  });

  it("rundet eine ungültige Größe auf mindestens 1", () => {
    expect(select(many(5, "vocabulary", "review"), 0).items).toHaveLength(1);
    expect(select(many(5, "vocabulary", "review"), 2.9).items).toHaveLength(2);
  });

  it("kommt auch mit einer Größe unter den Kontingenten aus", () => {
    const plan = select(
      [...many(5, "vocabulary", "error"), ...many(5, "vocabulary", "new")],
      3,
    );
    expect(plan.items).toHaveLength(3);
    expect(count(plan, "error")).toBe(3);
  });

  it("hält die Invarianten für beliebige Kandidaten (Eigenschaftstest)", () => {
    const arbitraryCandidate = fc.record({
      key: fc.string({ minLength: 1, maxLength: 4 }),
      module: fc.constantFrom(...DAILY_PLAN_MODULES),
      kind: fc.constantFrom<DailyPlanKind>("error", "review", "new"),
      dueAt: fc
        .date({
          min: new Date(2026, 0, 1),
          max: new Date(2026, 11, 31),
          noInvalidDate: true,
        })
        .map((date) => date.toISOString()),
    });
    fc.assert(
      fc.property(
        fc.array(arbitraryCandidate, { maxLength: 80 }),
        fc.integer({ min: 1, max: 30 }),
        (raw, size) => {
          const candidates = raw.map((entry) => ({
            ...entry,
            objectIds: [entry.key],
          }));
          const plan = select(candidates, size);
          const keys = plan.items.map((item) => item.key);
          expect(plan.items.length).toBeLessThanOrEqual(size);
          expect(new Set(keys).size).toBe(keys.length);
          expect(count(plan, "new")).toBeLessThanOrEqual(
            DAILY_PLAN_QUOTAS.newWhenFree,
          );
          // Reihenfolge der Eingabe ändert nichts, wenn die Schlüssel eindeutig sind.
          const unique = [
            ...new Map(candidates.map((entry) => [entry.key, entry])).values(),
          ];
          expect(select([...unique].reverse(), size).items).toEqual(
            select(unique, size).items,
          );
          expect(dailyPlanSchema.safeParse(plan).success).toBe(true);
        },
      ),
    );
  });
});

function event(
  objectId: string,
  occurredAt: string,
  direction: LearningEventV1["direction"] = "prompt-to-answer",
  id = `${objectId}-${occurredAt}-${direction}`,
): LearningEventV1 {
  return {
    id,
    learningObjectId: objectId,
    occurredAt,
    source: "learning-box",
    roundId: "runde",
    direction,
    answerMode: "typed",
    help: "none",
    assessment: {
      knowledge: "correct",
      writing: "correct",
      selfCorrected: false,
    },
  };
}

describe("dailyPlanProgress", () => {
  const plan: DailyPlan = {
    day: DAY,
    createdAt: at(8),
    size: 20,
    items: [
      {
        key: "vocabulary:k1:forward",
        module: "vocabulary",
        kind: "review",
        objectIds: ["k1"],
        direction: "forward",
      },
      {
        key: "vocabulary:k1:reverse",
        module: "vocabulary",
        kind: "new",
        objectIds: ["k1"],
        direction: "reverse",
      },
      {
        key: "german:w",
        module: "german",
        kind: "error",
        objectIds: ["w"],
      },
      {
        key: "mathematics:familie",
        module: "mathematics",
        kind: "review",
        objectIds: ["m1", "m2"],
      },
    ],
  };

  it("zählt ohne Ereignisse nichts als erledigt", () => {
    expect(dailyPlanProgress(plan, [])).toEqual({
      done: 0,
      total: 4,
      openByModule: { vocabulary: 2, german: 1, mathematics: 1 },
      openItems: plan.items,
    });
  });

  it("erkennt ein Element nach einem Ereignis zu einem seiner Objekte", () => {
    const progress = dailyPlanProgress(plan, [
      event("w", at(9)),
      event("m2", at(9, 5)),
    ]);
    expect(progress.done).toBe(2);
    expect(progress.openByModule).toEqual({
      vocabulary: 2,
      german: 0,
      mathematics: 0,
    });
    expect(progress.openItems.map((item) => item.key)).toEqual([
      "vocabulary:k1:forward",
      "vocabulary:k1:reverse",
    ]);
  });

  it("zählt ein Ereignis vor Erzeugen des Plans nicht", () => {
    expect(dailyPlanProgress(plan, [event("w", at(7, 59))]).done).toBe(0);
    expect(dailyPlanProgress(plan, [event("w", at(8))]).done).toBe(1);
  });

  it("zählt ein Ereignis vom Vortag nicht und eines vom Folgetag auch nicht", () => {
    const earlier: DailyPlan = { ...plan, createdAt: at(0, 0, 18) };
    expect(dailyPlanProgress(earlier, [event("w", at(23, 59, 18))]).done).toBe(
      0,
    );
    expect(dailyPlanProgress(earlier, [event("w", at(0, 0, 20))]).done).toBe(0);
    expect(dailyPlanProgress(earlier, [event("w", at(0, 0, 19))]).done).toBe(1);
  });

  it("zählt Mehrfachübung einmal", () => {
    const progress = dailyPlanProgress(plan, [
      event("w", at(9)),
      event("w", at(10)),
      event("m1", at(11)),
      event("m2", at(12)),
    ]);
    expect(progress.done).toBe(2);
    expect(progress.total).toBe(4);
  });

  it("verlangt bei Elementen mit Richtung diese Richtung", () => {
    const forwardOnly = dailyPlanProgress(plan, [event("k1", at(9))]);
    expect(forwardOnly.openItems.map((item) => item.key)).toEqual([
      "vocabulary:k1:reverse",
      "german:w",
      "mathematics:familie",
    ]);
    const both = dailyPlanProgress(plan, [
      event("k1", at(9)),
      event("k1", at(9, 1), "answer-to-prompt"),
    ]);
    expect(both.done).toBe(2);
  });

  it("hat bei einem leeren Plan nichts zu tun", () => {
    expect(
      dailyPlanProgress({ ...plan, items: [] }, [event("w", at(9))]),
    ).toEqual({
      done: 0,
      total: 0,
      openByModule: { vocabulary: 0, german: 0, mathematics: 0 },
      openItems: [],
    });
  });
});

describe("dailyPlanSchema", () => {
  const valid = select([
    candidate("a", "vocabulary", "review", at(1), { direction: "forward" }),
    candidate("b", "mathematics", "error", at(1)),
  ]);

  it("nimmt einen erzeugten Plan an", () => {
    expect(dailyPlanSchema.parse(valid)).toEqual(valid);
  });

  it.each([
    ["ein anderer Tagesformat", { ...valid, day: "19.10.2026" }],
    ["eine ungültige Zeit", { ...valid, createdAt: "gestern" }],
    [
      "eine fremde Übungsroute",
      { ...valid, items: [{ ...valid.items[0], route: "//example.org" }] },
    ],
    [
      "eine Übungsroute ohne Pfad",
      {
        ...valid,
        items: [{ ...valid.items[0], route: "https://example.org" }],
      },
    ],
    ["unbekannte Felder", { ...valid, extra: true }],
    [
      "ein unbekanntes Modul",
      { ...valid, items: [{ ...valid.items[0], module: "typing" }] },
    ],
    [
      "eine ungültige Richtung",
      { ...valid, items: [{ ...valid.items[0], direction: "up" }] },
    ],
    [
      "Elemente ohne Objekte",
      { ...valid, items: [{ ...valid.items[0], objectIds: [] }] },
    ],
    ["mehr Elemente als Größe", { ...valid, size: 1 }],
    [
      "doppelte Schlüssel",
      { ...valid, items: [valid.items[0], valid.items[0]] },
    ],
    ["kein Objekt", null],
  ])("lehnt %s ab", (_label, value) => {
    expect(dailyPlanSchema.safeParse(value).success).toBe(false);
  });
});
