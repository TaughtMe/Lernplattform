import { describe, expect, it } from "vitest";
import {
  createLearningBoxCard,
  isFirstLearningBoxAttempt,
  learningBoxAttemptKey,
} from "./learning-box";
import {
  buildLearningBoxSnapshot,
  learningBoxRoundProgress,
  learningBoxSnapshotSchema,
  restoreLearningBoxQueue,
  type LearningBoxSnapshotSource,
} from "./learning-box-snapshot";
import { buildRoundSnapshot, parseRoundSnapshot } from "./round-snapshot";

const cards = ["Haus", "Baum", "Tür", "Hund", "Katze"].map((question, index) =>
  createLearningBoxCard({
    deckId: "stapel",
    question,
    answer: `answer-${index}`,
    now: 1_000 + index,
  }),
);

function source(
  overrides: Partial<LearningBoxSnapshotSource> = {},
): LearningBoxSnapshotSource {
  return {
    title: "Heute dran",
    mode: "writing",
    practice: false,
    queue: cards.map((card, index) => ({
      card,
      direction: index % 2 ? "reverse" : "forward",
    })),
    index: 2,
    answered: false,
    stats: { correct: 1, wrong: 1 },
    attempted: [
      learningBoxAttemptKey(cards[0]!.id, "forward"),
      learningBoxAttemptKey(cards[1]!.id, "reverse"),
    ],
    finished: false,
    ...overrides,
  };
}

describe("learningBoxRoundProgress", () => {
  it("zählt eine bewertete Antwort sofort mit", () => {
    expect(
      learningBoxRoundProgress({ queueLength: 10, index: 3, answered: false }),
    ).toEqual({ done: 3, total: 10 });
    expect(
      learningBoxRoundProgress({ queueLength: 10, index: 3, answered: true }),
    ).toEqual({ done: 4, total: 10 });
  });
});

describe("buildLearningBoxSnapshot", () => {
  it("speichert nur Reihenfolge, Stand und Zählung, nicht die Karten", () => {
    const content = buildLearningBoxSnapshot(source())!;
    expect(content).toMatchObject({
      title: "Heute dran",
      mode: "writing",
      practice: false,
      done: 2,
      stats: { correct: 1, wrong: 1 },
    });
    expect(content.queue[0]).toEqual({
      cardId: cards[0]!.id,
      direction: "forward",
    });
    expect(JSON.stringify(content)).not.toContain("answer-0");
  });

  it("zählt die Karte mit stehender Rückmeldung als erledigt", () => {
    expect(buildLearningBoxSnapshot(source({ answered: true }))?.done).toBe(3);
  });

  it("bietet eine beendete oder fertig beantwortete Runde nicht an", () => {
    expect(buildLearningBoxSnapshot(source({ finished: true }))).toBeNull();
    // Die letzte Karte ist beantwortet: Es bleibt nichts fortzusetzen.
    expect(
      buildLearningBoxSnapshot(source({ index: 4, answered: true })),
    ).toBeNull();
    expect(buildLearningBoxSnapshot(source({ queue: [] }))).toBeNull();
  });

  it("übersteht Speichern und Lesen", () => {
    const content = buildLearningBoxSnapshot(source())!;
    const raw = JSON.stringify(
      buildRoundSnapshot({
        module: "lernbox",
        roundId: "r",
        startedAt: "2026-10-28T09:00:00.000Z",
        now: new Date("2026-10-28T09:05:00.000Z"),
        done: content.done,
        total: content.queue.length,
        state: content,
      }),
    );
    expect(
      parseRoundSnapshot(raw, {
        module: "lernbox",
        now: new Date("2026-10-28T09:10:00.000Z"),
        state: learningBoxSnapshotSchema,
      })?.state,
    ).toEqual(content);
  });
});

describe("restoreLearningBoxQueue", () => {
  it("setzt die Runde an der gespeicherten Stelle fort", () => {
    const content = buildLearningBoxSnapshot(source())!;
    const restored = restoreLearningBoxQueue(content, cards)!;
    expect(restored.index).toBe(2);
    expect(restored.queue.map((entry) => entry.card.id)).toEqual(
      cards.map((card) => card.id),
    );
    expect(restored.queue[1]!.direction).toBe("reverse");
  });

  it("nimmt die aktuellen Karten aus der Datenbank, nicht alte Kopien", () => {
    const content = buildLearningBoxSnapshot(source())!;
    const moved = { ...cards[0]!, box: 4 as const };
    const restored = restoreLearningBoxQueue(content, [
      moved,
      ...cards.slice(1),
    ]);
    expect(restored!.queue[0]!.card.box).toBe(4);
  });

  it("lässt gelöschte Karten aus und rückt die Stelle nach", () => {
    const content = buildLearningBoxSnapshot(source())!;
    // Die erste, schon beantwortete Karte ist inzwischen gelöscht.
    const restored = restoreLearningBoxQueue(content, cards.slice(1))!;
    expect(restored.queue).toHaveLength(4);
    expect(restored.index).toBe(1);
    expect(restored.queue[restored.index]!.card.id).toBe(cards[2]!.id);
  });

  it("meldet, wenn nichts mehr zu üben bleibt", () => {
    const content = buildLearningBoxSnapshot(source())!;
    expect(restoreLearningBoxQueue(content, cards.slice(0, 2))).toBeNull();
    expect(restoreLearningBoxQueue(content, [])).toBeNull();
  });

  it("wertet nach dem Fortsetzen nur den ersten Versuch (attempted bleibt erhalten)", () => {
    const content = buildLearningBoxSnapshot(source())!;
    expect(
      isFirstLearningBoxAttempt(content.attempted, cards[0]!.id, "forward"),
    ).toBe(false);
    expect(
      isFirstLearningBoxAttempt(content.attempted, cards[2]!.id, "forward"),
    ).toBe(true);
  });
});

describe("learningBoxSnapshotSchema", () => {
  it("verwirft eine Stelle hinter dem Ende und unbekannte Richtungen", () => {
    const content = buildLearningBoxSnapshot(source())!;
    expect(
      learningBoxSnapshotSchema.safeParse({ ...content, done: 5 }).success,
    ).toBe(false);
    expect(
      learningBoxSnapshotSchema.safeParse({
        ...content,
        queue: [{ cardId: "a", direction: "quer" }],
      }).success,
    ).toBe(false);
    expect(
      learningBoxSnapshotSchema.safeParse({ ...content, mode: "laut" }).success,
    ).toBe(false);
  });
});
