import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLearningBoxCard,
  createLearningBoxDeck,
  processLearningBoxResult,
} from "../domain/learning-box";
import { parseMentalMathTask } from "../domain/mental-math";
import { createMathAttempt } from "./math-practice";
import { createLearningRecommendationRepository } from "./learning-recommendations";
import {
  createLearningBoxRepository,
  createLearningWordProgressRepository,
  createPersonalLearningEventRepository,
  createTypingProgressRepository,
  PersonalLearningDatabase,
} from "./personal-learning-events";

const databases: PersonalLearningDatabase[] = [];

afterEach(async () => {
  await Promise.all(databases.map((database) => database.delete()));
  databases.length = 0;
});

describe("shared learning recommendations", () => {
  it("combines native signals from all learning modules without a static catalog", async () => {
    const database = new PersonalLearningDatabase(
      `recommendations-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const now = "2026-08-24T12:00:00.000Z";
    const nowMs = new Date(now).getTime();

    const deck = createLearningBoxDeck({
      title: "Englisch",
      now: nowMs - 10_000,
    });
    const card = createLearningBoxCard({
      deckId: deck.id,
      question: "library",
      answer: "Bibliothek",
      now: nowMs - 10_000,
    });
    await database.learningBoxDecks.put(deck);
    await database.learningBoxCards.put(card);

    await createLearningWordProgressRepository(database).recordAttempt({
      attemptId: "attempt-1",
      words: ["Schlüssel"],
      correct: false,
      usedHelp: false,
      selfCorrected: false,
      stage: 2,
      roundId: "word-round",
      // Am Vortag: Ein Fehler macht das Wort erst am nächsten Tag fällig.
      now: "2026-08-23T12:00:00.000Z",
    });
    await createTypingProgressRepository(database).recordAttempt(
      "grundstellung-zeigefinger",
      {
        totalChars: 20,
        correctChars: 15,
        errorCount: 5,
        accuracy: 75,
        elapsedMs: 20_000,
        cpm: 45,
        wpm: 9,
        corrections: 1,
        problemChars: [{ char: "f", errors: 3 }],
      },
      "typing-round",
      now,
    );
    await createPersonalLearningEventRepository(database).put({
      id: "math-error",
      learningObjectId: "math:add:range:range-20",
      occurredAt: now,
      source: "lesson",
      learningArea: "mathematics",
      roundId: "math-round",
      direction: "prompt-to-answer",
      answerMode: "typed",
      help: "none",
      practice: {
        title: "Passende Kopfrechenaufgaben",
        route: "/frei/mathematics",
      },
      assessment: {
        knowledge: "incorrect",
        writing: "not-assessed",
        selfCorrected: false,
      },
    });

    const recommendations = await createLearningRecommendationRepository(
      database,
    ).list({
      enabledModules: ["vocabulary", "german", "mathematics", "typing"],
      now,
    });

    expect(recommendations).toHaveLength(4);
    expect(new Set(recommendations.map((item) => item.module))).toEqual(
      new Set(["vocabulary", "german", "mathematics", "typing"]),
    );
    expect(
      recommendations.find((item) => item.module === "mathematics"),
    ).toMatchObject({
      reason: "error",
      route: "/frei/mathematics",
    });
    // Die Karte ist neu: ein nächster Schritt, kein Rückstand.
    expect(
      recommendations.find((item) => item.module === "vocabulary"),
    ).toMatchObject({ reason: "next-step", route: "/lernbox" });
  });

  it("zählt die Mathe-Menge nach Aufgabenfamilien und stuft frische Fehler als Fehler ein", async () => {
    const database = new PersonalLearningDatabase(
      `recommendations-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const events = createPersonalLearningEventRepository(database);
    // Fünf falsche Aufgaben: vier aus der 7er-Reihe (eine Familie), eine ÷.
    const sources = ["7 * 7", "7 * 8", "7 * 9", "7 * 10", "56 : 8"];
    for (const [index, source] of sources.entries())
      await events.put(
        await createMathAttempt({
          task: parseMentalMathTask(source)!,
          roundId: "runde",
          attemptId: String(index),
          answer: "0",
          selfCorrected: false,
          usedHelp: false,
          now: "2026-08-24T10:00:00.000Z",
        }),
      );
    const recommendations = await createLearningRecommendationRepository(
      database,
    ).list({
      enabledModules: ["mathematics"],
      now: "2026-08-24T12:00:00.000Z",
    });
    expect(recommendations).toMatchObject([
      { id: "math-reviews", reason: "error", amount: 2 },
    ]);
  });

  it("meldet Mathe nach mehreren sicheren Wiederholungen nur noch als fällig", async () => {
    const database = new PersonalLearningDatabase(
      `recommendations-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const events = createPersonalLearningEventRepository(database);
    const task = parseMentalMathTask("7 * 8")!;
    const attempts = [
      ["a", "2026-08-01T10:00:00.000Z", "1"],
      ["b", "2026-08-02T10:00:00.000Z", "56"],
      ["c", "2026-08-05T10:00:00.000Z", "56"],
    ] as const;
    for (const [id, at, answer] of attempts)
      await events.put(
        await createMathAttempt({
          task,
          roundId: `runde-${id}`,
          attemptId: id,
          answer,
          selfCorrected: false,
          usedHelp: false,
          now: at,
        }),
      );
    const recommendations = await createLearningRecommendationRepository(
      database,
    ).list({
      enabledModules: ["mathematics"],
      now: "2026-08-24T12:00:00.000Z",
    });
    expect(recommendations).toMatchObject([
      { id: "math-reviews", reason: "due", amount: 1 },
    ]);
  });

  it("returns only recommendations for active class modules", async () => {
    const database = new PersonalLearningDatabase(
      `recommendations-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const recommendations = await createLearningRecommendationRepository(
      database,
    ).list({
      enabledModules: ["typing"],
      now: "2026-08-24T12:00:00.000Z",
    });
    expect(recommendations).toMatchObject([
      { module: "typing", reason: "next-step", route: "/frei/typing" },
    ]);
  });

  it("derives error recommendations from legacy events without module metadata", async () => {
    const database = new PersonalLearningDatabase(
      `recommendations-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = createPersonalLearningEventRepository(database);
    const baseEvent = {
      occurredAt: "2026-08-24T12:00:00.000Z",
      roundId: "legacy-round",
      direction: "prompt-to-answer" as const,
      answerMode: "typed" as const,
      help: "none" as const,
      assessment: {
        knowledge: "incorrect" as const,
        writing: "incorrect" as const,
        selfCorrected: false,
      },
    };
    await repository.put({
      ...baseEvent,
      id: "legacy-vocabulary",
      learningObjectId: "legacy-card",
      source: "learning-box",
    });
    await repository.put({
      ...baseEvent,
      id: "legacy-math",
      learningObjectId: "math:add:range-20",
      source: "lesson",
    });
    await repository.put({
      ...baseEvent,
      id: "legacy-typing",
      learningObjectId: "typing:first",
      source: "lesson",
    });
    await repository.put({
      ...baseEvent,
      id: "legacy-word",
      learningObjectId: "learning-word:Haus",
      source: "lesson",
    });
    await repository.put({
      ...baseEvent,
      id: "unknown",
      learningObjectId: "unknown",
      source: "lesson",
    });

    const recommendations = await createLearningRecommendationRepository(
      database,
    ).list({
      enabledModules: ["vocabulary", "mathematics"],
      now: "2026-08-24T13:00:00.000Z",
    });
    expect(recommendations).toMatchObject([
      {
        module: "mathematics",
        title: "Fehlerfamilien im Kopfrechnen festigen",
        route: "/frei/mathematics",
      },
      {
        module: "vocabulary",
        title: "Unsichere Vokabeln wiederholen",
        route: "/lernbox",
      },
    ]);
  });

  it("distinguishes due learning from errors and advances the typing path", async () => {
    const database = new PersonalLearningDatabase(
      `recommendations-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const now = "2026-08-24T12:00:00.000Z";
    const old = "2026-08-10T12:00:00.000Z";
    const nowMs = new Date(now).getTime();
    const deck = createLearningBoxDeck({
      title: "Englisch",
      now: nowMs - 20_000,
    });
    const errorCard = createLearningBoxCard({
      deckId: deck.id,
      question: "school",
      answer: "Schule",
      now: nowMs - 20_000,
    });
    await database.learningBoxDecks.put(deck);
    await database.learningBoxCards.put({
      ...errorCard,
      lastReviewed: nowMs - 10_000,
      // Schon geübt: vorwärts nach einem Fehler, rückwärts in Box 2.
      interval: 1,
      nextReview: nowMs,
      reverseInterval: 3,
      reverseNextReview: nowMs + 86_400_000,
      box: 1,
      reverseBox: 2,
    });
    await database.learningWordProgress.put({
      id: "learning-word:haus",
      word: "Haus",
      stage: 3,
      box: 2,
      dueAt: now,
      attempts: 2,
      incorrectAttempts: 0,
      helpUses: 0,
      lastPracticedAt: old,
    });
    await createTypingProgressRepository(database).recordAttempt(
      "grundstellung-zeigefinger",
      {
        totalChars: 20,
        correctChars: 20,
        errorCount: 0,
        accuracy: 100,
        elapsedMs: 20_000,
        cpm: 60,
        wpm: 12,
        corrections: 0,
        problemChars: [],
      },
      "typing-complete",
      old,
    );
    await createPersonalLearningEventRepository(database).put({
      id: "old-vocabulary",
      learningObjectId: "class-word",
      occurredAt: old,
      source: "lesson",
      learningArea: "vocabulary",
      roundId: "class-round",
      direction: "prompt-to-answer",
      answerMode: "typed",
      help: "none",
      assessment: {
        knowledge: "correct",
        writing: "correct",
        selfCorrected: false,
      },
    });

    const recommendations = await createLearningRecommendationRepository(
      database,
    ).list({
      enabledModules: ["vocabulary", "german", "typing"],
      now,
      limit: 3,
    });

    expect(
      recommendations.find((item) => item.module === "vocabulary"),
    ).toMatchObject({
      reason: "error",
      title: "Unsichere Vokabeln erneut abrufen",
    });
    expect(
      recommendations.find((item) => item.module === "german"),
    ).toMatchObject({
      reason: "due",
      title: "Fällige Lernwörter wiederholen",
    });
    expect(
      recommendations.find((item) => item.module === "typing"),
    ).toMatchObject({
      reason: "next-step",
      title: "Grundstellung: nur Mittelfinger beginnen",
    });
  });

  it("offers new cards as a next step instead of counting them as due", async () => {
    const database = new PersonalLearningDatabase(
      `recommendations-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const nowMs = new Date("2026-08-24T12:00:00.000Z").getTime();
    const deck = createLearningBoxDeck({ title: "Englisch", now: nowMs });
    await database.learningBoxDecks.put(deck);
    await database.learningBoxCards.bulkPut(
      Array.from({ length: 150 }, (_, index) =>
        createLearningBoxCard({
          deckId: deck.id,
          question: `word-${index}`,
          answer: `Wort-${index}`,
          now: nowMs,
        }),
      ),
    );

    const recommendations = await createLearningRecommendationRepository(
      database,
    ).list({
      enabledModules: ["vocabulary"],
      now: new Date(nowMs + 1000).toISOString(),
    });

    expect(recommendations).toEqual([
      expect.objectContaining({
        id: "learning-box-new",
        reason: "next-step",
        route: "/lernbox",
      }),
    ]);
  });

  it("closes a card for today once it was answered, without counting it twice", async () => {
    const database = new PersonalLearningDatabase(
      `recommendations-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const nowMs = new Date("2026-08-24T12:00:00.000Z").getTime();
    const repository = createLearningBoxRepository(database);
    const deck = createLearningBoxDeck({ title: "Englisch", now: nowMs });
    await database.learningBoxDecks.put(deck);
    const cards = ["Haus;house", "Baum;tree"].map((line) => {
      const [question, answer] = line.split(";");
      return createLearningBoxCard({
        deckId: deck.id,
        question: question!,
        answer: answer!,
        now: nowMs,
      });
    });
    // Beide Karten wurden gestern vorwärts geübt und sind heute fällig; die
    // Rückrichtung ist noch neu.
    await database.learningBoxCards.bulkPut(
      cards.map((card) => ({
        ...card,
        interval: 1,
        lastReviewed: nowMs - 86_400_000,
      })),
    );
    const open = async (at: number) =>
      (
        await createLearningRecommendationRepository(database).list({
          enabledModules: ["vocabulary"],
          now: new Date(at).toISOString(),
        })
      )
        .filter((item) => item.reason === "due" || item.reason === "error")
        .reduce((sum, item) => sum + item.amount, 0);
    expect(await open(nowMs + 1000)).toBe(2);

    // Eine Karte vorwärts richtig beantwortet: Rückrichtung bleibt ungeübt.
    await repository.putCardAndEvent({
      card: processLearningBoxResult(
        (await database.learningBoxCards.get(cards[0]!.id))!,
        {
          correct: true,
          direction: "forward",
          mode: "writing",
          now: nowMs + 2000,
        },
      ),
      correct: true,
      direction: "forward",
      mode: "writing",
      roundId: "round-1",
      now: new Date(nowMs + 2000).toISOString(),
    });
    expect(await open(nowMs + 3000)).toBe(1);
  });
});
