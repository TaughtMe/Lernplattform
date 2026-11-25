import "fake-indexeddb/auto";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LearningBoxDeck } from "../../src/domain/learning-box";
import { matchReducer, startMatch } from "../../src/domain/learning-box-forms";
import {
  PersonalLearningDatabase,
  createLearningBoxRepository,
} from "../../src/storage/personal-learning-events";
import { useLearningBoxForms } from "./learning-box-forms";

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
    useLearningBoxForms({ cards, deckById, onNotice }),
  );
  const card = (question: string) => {
    const found = cards.find((entry) => entry.question === question);
    if (!found) throw new Error(`Karte fehlt: ${question}`);
    return found;
  };
  const events = () => database.learningEvents.toArray();
  return {
    database,
    repository,
    view,
    card,
    events,
    deck,
  };
}

describe("LernBox-Lernformen: Wirkung auf Karten und Ereignisse", () => {
  it("schreibt beim Zuordnen nie ein Ereignis und ändert keine Karte (LF-1)", async () => {
    const { view, deck, database, repository, events } = await setup();
    const putCardAndEvent = vi.spyOn(repository, "putCardAndEvent");
    const before = await database.learningBoxCards.toArray();
    act(() => view.result.current.start({ scope: deck.id, form: "match" }));
    const main = view.result.current.main;
    if (main?.kind !== "match") throw new Error("Zuordnen läuft nicht");
    // Das ganze Spiel durchspielen: alle Paare finden, dazu einen Fehlversuch.
    let state = startMatch(main.match.rounds);
    while (!state.finished) {
      const tiles = main.match.rounds[state.round]!.tiles;
      const open = tiles.filter((tile) => !state.solved.includes(tile.id));
      const wrongA = open[0]!;
      const wrongB = open.find(
        (tile) => tile.cardId !== wrongA.cardId && tile.side !== wrongA.side,
      )!;
      state = matchReducer(state, { type: "pick", tileId: wrongA.id });
      state = matchReducer(state, { type: "pick", tileId: wrongB.id });
      state = matchReducer(state, { type: "clear-wrong" });
      for (const tile of open) {
        const mate = open.find(
          (other) => other.cardId === tile.cardId && other.id !== tile.id,
        )!;
        if (state.solved.includes(tile.id)) continue;
        state = matchReducer(state, { type: "pick", tileId: tile.id });
        state = matchReducer(state, { type: "pick", tileId: mate.id });
      }
      if (state.roundDone && !state.finished)
        state = matchReducer(state, { type: "next-round" });
    }
    expect(state.mistakes).toBeGreaterThan(0);
    act(() => view.result.current.finish());
    expect(putCardAndEvent).not.toHaveBeenCalled();
    expect(await events()).toHaveLength(0);
    expect(await database.learningEvents.count()).toBe(0);
    expect(await database.learningBoxCards.toArray()).toEqual(before);
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
        onNotice,
      }),
    );
    act(() => again.result.current.start({ scope: deck.id, form: "match" }));
    expect(again.result.current.main).toBeNull();
    expect(onNotice).toHaveBeenCalledWith(
      "Dafür sind zu wenige verschiedene Karten im Stapel.",
    );
    expect(view.result.current.main).toBeNull();
  });
});
