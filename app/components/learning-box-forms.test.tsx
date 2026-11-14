import "fake-indexeddb/auto";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  LearningBoxCard,
  LearningBoxDeck,
} from "../../src/domain/learning-box";
import type { TestQuestion } from "../../src/domain/learning-box-forms";
import {
  PersonalLearningDatabase,
  createLearningBoxRepository,
} from "../../src/storage/personal-learning-events";
import { useLearningBoxForms } from "./learning-box-forms";

const DAY_MS = 24 * 60 * 60 * 1000;
const databases: PersonalLearningDatabase[] = [];

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

/** Stapel mit vier neuen (und damit fälligen) Karten. */
async function setup(options: { onNotice?: (message: string) => void } = {}) {
  const database = new PersonalLearningDatabase();
  databases.push(database);
  const repository = createLearningBoxRepository(database);
  const deck = await repository.createDeck({
    title: "Englisch 7b",
    frontLocale: "de-DE",
    backLocale: "en-US",
  });
  await repository.importCards(deck.id, [
    { question: "Haus", answer: "house" },
    { question: "Hund", answer: "dog" },
    { question: "Baum", answer: "tree" },
    { question: "Katze", answer: "cat" },
  ]);
  const cards = await repository.listAllCards();
  const decks = await repository.listDecks();
  const deckById = new Map<string, LearningBoxDeck>(
    decks.map((entry) => [entry.id, entry]),
  );
  const onNotice = options.onNotice ?? vi.fn();
  const view = renderHook(() =>
    useLearningBoxForms({ cards, deckById, repository, onNotice }),
  );
  const card = (question: string) => {
    const found = cards.find((entry) => entry.question === question);
    if (!found) throw new Error(`Karte fehlt: ${question}`);
    return found;
  };
  const question = (
    entry: LearningBoxCard,
    kind: TestQuestion["kind"],
  ): TestQuestion => ({
    id: `${entry.id}:forward`,
    kind,
    cardId: entry.id,
    direction: "forward",
    prompt: entry.question,
    expected: entry.answer,
    expectedLabel: entry.answer,
    options: kind === "choice" ? [entry.answer, "x"] : [],
    correctOption: kind === "choice" ? 0 : -1,
  });
  const startTest = () =>
    act(() =>
      view.result.current.start({
        scope: deck.id,
        form: "test",
        direction: "forward",
      }),
    );
  const events = () => database.learningEvents.toArray();
  return {
    database,
    repository,
    view,
    card,
    question,
    startTest,
    events,
    deck,
  };
}

describe("LernBox-Lernformen: Wirkung auf Karten und Ereignisse", () => {
  it("schreibt beim Zuordnen nie ein Ereignis und ändert keine Karte (LF-1)", async () => {
    const { view, deck, database, events } = await setup();
    const before = await database.learningBoxCards.toArray();
    act(() =>
      view.result.current.start({
        scope: deck.id,
        form: "match",
        direction: "forward",
      }),
    );
    expect(view.result.current.main?.kind).toBe("match");
    act(() => view.result.current.finish());
    await view.result.current.settle();
    expect(await events()).toHaveLength(0);
    expect(await database.learningBoxCards.toArray()).toEqual(before);
  });

  it("ändert bei Auswahlfragen weder richtig noch falsch etwas (LF-3)", async () => {
    const { view, card, question, startTest, events } = await setup();
    await startTest();
    act(() => {
      view.result.current.answer(question(card("Haus"), "choice"), true);
      view.result.current.answer(question(card("Hund"), "choice"), false);
    });
    await view.result.current.settle();
    expect(await events()).toHaveLength(0);
    await waitFor(() =>
      expect(view.result.current.main).toMatchObject({
        kind: "test",
        test: { counted: 0 },
      }),
    );
  });

  it("hebt eine fällige Karte nach richtiger Schreibantwort um eine Box (LF-4)", async () => {
    const { view, card, question, startTest, events, repository } =
      await setup();
    await startTest();
    const roundId = view.result.current.form?.roundId;
    const entry = card("Haus");
    act(() => view.result.current.answer(question(entry, "written"), true));
    await view.result.current.settle();
    const [event] = await events();
    expect(await events()).toHaveLength(1);
    expect(event).toMatchObject({ roundId, learningObjectId: entry.id });
    const saved = await repository.getCard(entry.id);
    expect(saved?.box).toBe(entry.box + 1);
    await waitFor(() =>
      expect(view.result.current.main).toMatchObject({
        test: { counted: 1 },
      }),
    );
  });

  it("setzt eine fällige Karte nach falscher Schreibantwort auf Box 1 (LF-4)", async () => {
    const { view, card, question, startTest, events, repository, database } =
      await setup();
    const entry = card("Hund");
    await database.learningBoxCards.put({
      ...entry,
      box: 3,
      level: 3,
      interval: 7,
      nextReview: Date.now() - 2 * DAY_MS,
      lastReviewed: Date.now() - 9 * DAY_MS,
    });
    await startTest();
    act(() => view.result.current.answer(question(entry, "written"), false));
    await view.result.current.settle();
    expect(await events()).toHaveLength(1);
    expect((await repository.getCard(entry.id))?.box).toBe(1);
  });

  it("ändert eine nicht fällige Karte weder bei richtiger noch bei falscher Schreibantwort (LF-5)", async () => {
    const { view, card, question, startTest, events, repository, database } =
      await setup();
    for (const name of ["Haus", "Hund"]) {
      await database.learningBoxCards.put({
        ...card(name),
        box: 3,
        level: 3,
        interval: 7,
        nextReview: Date.now() + 10 * DAY_MS,
        lastReviewed: Date.now() - DAY_MS,
      });
    }
    const before = await repository.getCard(card("Haus").id);
    await startTest();
    act(() => {
      view.result.current.answer(question(card("Haus"), "written"), true);
      view.result.current.answer(question(card("Hund"), "written"), false);
    });
    await view.result.current.settle();
    expect(await events()).toHaveLength(0);
    expect(await repository.getCard(card("Haus").id)).toEqual(before);
    await waitFor(() =>
      expect(view.result.current.main).toMatchObject({
        test: { counted: 0 },
      }),
    );
  });

  it("zählt nur wirksame Schreibantworten und wertet jede Frage höchstens einmal (LF-6)", async () => {
    const { view, card, question, startTest, events } = await setup();
    await startTest();
    const written = question(card("Haus"), "written");
    act(() => {
      view.result.current.answer(written, true);
      view.result.current.answer(written, true);
      view.result.current.answer(question(card("Hund"), "choice"), true);
      view.result.current.answer(question(card("Baum"), "written"), false);
    });
    await view.result.current.settle();
    expect(await events()).toHaveLength(2);
    await waitFor(() =>
      expect(view.result.current.main).toMatchObject({
        test: { counted: 2 },
      }),
    );
  });

  it("meldet bei zu wenigen verschiedenen Karten und bleibt in der Übersicht", async () => {
    const onNotice = vi.fn();
    const { view, deck, database, card } = await setup({ onNotice });
    // Alle Karten bekommen dieselbe Vorderseite: kein Paar ist eindeutig.
    for (const name of ["Haus", "Hund", "Baum", "Katze"]) {
      await database.learningBoxCards.put({
        ...card(name),
        question: "Gleich",
      });
    }
    const cards = await database.learningBoxCards.toArray();
    const repository = createLearningBoxRepository(database);
    const decks = await repository.listDecks();
    const again = renderHook(() =>
      useLearningBoxForms({
        cards,
        deckById: new Map(decks.map((entry) => [entry.id, entry])),
        repository,
        onNotice,
      }),
    );
    act(() =>
      again.result.current.start({
        scope: deck.id,
        form: "match",
        direction: "forward",
      }),
    );
    expect(again.result.current.main).toBeNull();
    expect(onNotice).toHaveBeenCalledWith(
      "Dafür sind zu wenige verschiedene Karten im Stapel.",
    );
    expect(view.result.current.main).toBeNull();
  });
});
