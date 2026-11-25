import { describe, expect, it } from "vitest";
import { createLearningBoxCard, type LearningBoxCard } from "./learning-box";
import {
  MATCH_MAX_ROUNDS,
  MATCH_PAIRS_PER_ROUND,
  CHOICE_OPTIONS,
  assignLearningBoxKinds,
  buildLearningBoxChoice,
  buildMatchRounds,
  gradeLearningBoxChoice,
  matchReducer,
  shuffleLearningBoxItems,
  startMatch,
  supportsLearningBoxForms,
  type MatchState,
} from "./learning-box-forms";

const NOW = Date.UTC(2026, 10, 14, 9);

/** Fester Zufall, damit die Tests wiederholbar sind. */
function seeded(seed = 1) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

let serial = 0;
function card(question: string, answer: string): LearningBoxCard {
  serial += 1;
  return {
    ...createLearningBoxCard({ deckId: "deck", question, answer, now: NOW }),
    id: `card-${serial}`,
  };
}

function deck(count: number) {
  return Array.from({ length: count }, (_, index) =>
    card(`Wort ${index + 1}`, `word ${index + 1}`),
  );
}

describe("Mischen", () => {
  it("behält alle Elemente und ändert die Vorlage nicht", () => {
    const items = [1, 2, 3, 4, 5, 6];
    const mixed = shuffleLearningBoxItems(items, seeded());
    expect([...mixed].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
    expect(mixed).not.toEqual(items);
  });
});

describe("Zuordnen: Rundenbildung", () => {
  it("bietet die Lernformen erst ab vier Karten an", () => {
    expect(supportsLearningBoxForms(3)).toBe(false);
    expect(supportsLearningBoxForms(4)).toBe(true);
  });

  it("bildet eine Runde mit beiden Seiten jeder Karte", () => {
    const cards = deck(5);
    const rounds = buildMatchRounds(cards, seeded());
    expect(rounds).toHaveLength(1);
    expect(rounds[0]!.pairs).toBe(5);
    expect(rounds[0]!.tiles).toHaveLength(10);
    for (const entry of cards) {
      const sides = rounds[0]!.tiles
        .filter((tile) => tile.cardId === entry.id)
        .map((tile) => tile.side)
        .sort();
      expect(sides).toEqual(["meaning", "term"]);
    }
  });

  it("verteilt die Paare gleichmäßig statt eine Restrunde zu bilden", () => {
    expect(buildMatchRounds(deck(7), seeded()).map((r) => r.pairs)).toEqual([
      4, 3,
    ]);
    expect(buildMatchRounds(deck(12), seeded()).map((r) => r.pairs)).toEqual([
      6, 6,
    ]);
  });

  it("begrenzt ein Spiel auf drei Runden mit je höchstens sechs Paaren", () => {
    const rounds = buildMatchRounds(deck(40), seeded());
    expect(rounds).toHaveLength(MATCH_MAX_ROUNDS);
    expect(rounds.every((r) => r.pairs === MATCH_PAIRS_PER_ROUND)).toBe(true);
    const ids = rounds.flatMap((r) => r.tiles.map((tile) => tile.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("lässt Karten mit gleichem Begriff oder gleicher Bedeutung weg", () => {
    const cards = [
      card("Haus", "house"),
      card("Heim", "House"),
      card("haus", "home"),
      card("Baum", "tree"),
    ];
    const rounds = buildMatchRounds(cards, seeded());
    expect(rounds[0]!.pairs).toBeGreaterThanOrEqual(2);
    expect(rounds[0]!.pairs).toBeLessThanOrEqual(3);
    const texts = rounds[0]!.tiles.map((tile) => tile.text.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("lässt Karten weg, deren Kacheln gleich aussehen würden", () => {
    // „home | house“ und „home / house“ erscheinen beide als „home / house“.
    const cards = [
      card("Haus", "home | house"),
      card("Heim", "home / house"),
      card("Baum", "tree"),
      card("Hund", "dog"),
    ];
    for (let seed = 1; seed <= 20; seed += 1) {
      const rounds = buildMatchRounds(cards, seeded(seed));
      const texts = rounds.flatMap((round) =>
        round.tiles.map((tile) => tile.text.toLowerCase()),
      );
      expect(new Set(texts).size).toBe(texts.length);
      expect(texts.filter((text) => text === "home / house")).toHaveLength(1);
    }
  });

  it("zeigt Alternativen lesbar und gibt ohne zwei Paare kein Spiel", () => {
    const rounds = buildMatchRounds(
      [card("Haus", "home | house"), card("Baum", "tree")],
      seeded(),
    );
    expect(rounds[0]!.tiles.map((tile) => tile.text)).toContain("home / house");
    expect(buildMatchRounds([card("Haus", "house")], seeded())).toEqual([]);
  });
});

describe("Zuordnen: Spielzüge", () => {
  function game(count = 2) {
    const cards = deck(count);
    const state = startMatch(buildMatchRounds(cards, seeded()));
    return { cards, state };
  }
  const pick = (state: MatchState, tileId: string) =>
    matchReducer(state, { type: "pick", tileId });

  it("lässt ein richtiges Paar verschwinden", () => {
    const { cards, state } = game();
    const id = cards[0]!.id;
    const next = pick(pick(state, `${id}:term`), `${id}:meaning`);
    expect(next.solved).toEqual([`${id}:term`, `${id}:meaning`]);
    expect(next.found).toBe(1);
    expect(next.mistakes).toBe(0);
    expect(next.selected).toBeNull();
    expect(next.roundDone).toBe(false);
  });

  it("zählt ein falsches Paar als Fehlversuch und lässt die Kacheln stehen", () => {
    const { cards, state } = game();
    const [a, b] = [cards[0]!.id, cards[1]!.id];
    const next = pick(pick(state, `${a}:term`), `${b}:meaning`);
    expect(next.wrong).toEqual([`${a}:term`, `${b}:meaning`]);
    expect(next.mistakes).toBe(1);
    expect(next.solved).toEqual([]);
    expect([...next.missed].sort()).toEqual([a, b].sort());
    expect(matchReducer(next, { type: "clear-wrong" }).wrong).toBeNull();
  });

  it("wechselt bei einer Kachel derselben Spalte nur die Wahl", () => {
    // Zwei Spalten (Entscheidung des Entwicklers vom 15.11.2026): Ein zweiter
    // Begriff ist kein Fehlversuch, sondern eine neue Wahl.
    const { cards, state } = game();
    const next = pick(
      pick(state, `${cards[0]!.id}:term`),
      `${cards[1]!.id}:term`,
    );
    expect(next.mistakes).toBe(0);
    expect(next.wrong).toBeNull();
    expect(next.selected).toBe(`${cards[1]!.id}:term`);
  });

  it("legt je Runde zuerst die Begriffe, dann die Bedeutungen ab", () => {
    const rounds = buildMatchRounds(deck(12), seeded());
    for (const round of rounds) {
      const sides = round.tiles.map((tile) => tile.side);
      expect(sides).toEqual([
        ...Array<string>(round.pairs).fill("term"),
        ...Array<string>(round.pairs).fill("meaning"),
      ]);
      expect(round.pairs).toBeLessThanOrEqual(6);
    }
  });

  it("hebt die Wahl auf, wenn dieselbe Kachel noch einmal angetippt wird", () => {
    const { cards, state } = game();
    const id = `${cards[0]!.id}:term`;
    const next = pick(pick(state, id), id);
    expect(next.selected).toBeNull();
    expect(next.mistakes).toBe(0);
  });

  it("ignoriert gefundene und unbekannte Kacheln", () => {
    const { cards, state } = game();
    const id = cards[0]!.id;
    const solved = pick(pick(state, `${id}:term`), `${id}:meaning`);
    expect(pick(solved, `${id}:term`)).toBe(solved);
    expect(pick(solved, "fremd")).toBe(solved);
  });

  it("beendet die Runde und nach der letzten Runde das Spiel", () => {
    const cards = deck(7);
    let state = startMatch(buildMatchRounds(cards, seeded()));
    expect(matchReducer(state, { type: "next-round" })).toBe(state);
    const solveRound = () => {
      const ids = new Set(
        state.rounds[state.round]!.tiles.map((tile) => tile.cardId),
      );
      for (const id of ids) {
        state = pick(pick(state, `${id}:term`), `${id}:meaning`);
      }
    };
    solveRound();
    expect(state.roundDone).toBe(true);
    expect(state.finished).toBe(false);
    state = matchReducer(state, { type: "next-round" });
    expect(state.round).toBe(1);
    expect(state.solved).toEqual([]);
    solveRound();
    expect(state.finished).toBe(true);
    expect(state.found).toBe(7);
    expect(matchReducer(state, { type: "next-round" })).toBe(state);
  });
});

describe("Auswahl: Zusammenstellung", () => {
  it("bietet vier verschiedene Antworten aus dem Stapel, eine ist richtig", () => {
    const cards = deck(8);
    const answers = new Set(cards.map((entry) => entry.answer));
    for (const source of cards) {
      const question = buildLearningBoxChoice(
        source,
        "forward",
        cards,
        seeded(3),
      )!;
      expect(question.cardId).toBe(source.id);
      expect(question.options).toHaveLength(CHOICE_OPTIONS);
      expect(new Set(question.options).size).toBe(CHOICE_OPTIONS);
      expect(question.options.every((option) => answers.has(option))).toBe(
        true,
      );
      expect(question.options[question.correctOption]).toBe(
        question.expectedLabel,
      );
    }
  });

  it("nimmt keine falsche Antwort, die auch richtig wäre", () => {
    const cards = [
      card("Haus", "home | house"),
      card("Heim", "home"),
      card("Gebäude", "House"),
      card("Baum", "tree"),
      card("Hund", "dog"),
    ];
    for (let seed = 1; seed <= 40; seed += 1) {
      const question = buildLearningBoxChoice(
        cards[0]!,
        "forward",
        cards,
        seeded(seed),
      )!;
      const wrong = question.options.filter(
        (_, index) => index !== question.correctOption,
      );
      expect(wrong).not.toContain("home");
      expect(wrong).not.toContain("House");
    }
  });

  it("fragt rückwärts nach dem Begriff", () => {
    const cards = deck(4);
    const question = buildLearningBoxChoice(
      cards[0]!,
      "reverse",
      cards,
      seeded(),
    )!;
    expect(question.prompt).toBe(cards[0]!.answer);
    expect(question.expected).toBe(cards[0]!.question);
    expect(question.direction).toBe("reverse");
  });

  it("gibt ohne falsche Antwort keine Auswahlfrage", () => {
    const cards = [card("Haus", "house"), card("Heim", "house")];
    expect(
      buildLearningBoxChoice(cards[0]!, "forward", cards, seeded()),
    ).toBeNull();
  });

  it("bewertet nach der gewählten Antwort; keine Wahl ist falsch", () => {
    const cards = deck(8);
    const choice = buildLearningBoxChoice(
      cards[0]!,
      "forward",
      cards,
      seeded(),
    )!;
    const right = choice.options[choice.correctOption]!;
    const wrong = choice.options.find((option) => option !== right)!;
    expect(gradeLearningBoxChoice(choice, right)).toBe(true);
    expect(gradeLearningBoxChoice(choice, wrong)).toBe(false);
    expect(gradeLearningBoxChoice(choice, "")).toBe(false);
  });
});

describe("Gemischte Fragearten", () => {
  const items = (cards: LearningBoxCard[]) =>
    cards.map((entry) => ({ card: entry, direction: "forward" as const }));

  it("verteilt die gewählten Arten gleichmäßig auf die Karten", () => {
    const cards = deck(9);
    const mixed = assignLearningBoxKinds(
      items(cards),
      ["writing", "oral", "choice"],
      cards,
      seeded(),
    );
    for (const kind of ["writing", "oral", "choice"]) {
      expect(mixed.filter((entry) => entry.kind === kind)).toHaveLength(3);
    }
    expect(mixed.map((entry) => entry.card.id)).toEqual(
      cards.map((entry) => entry.id),
    );
  });

  it("wechselt reproduzierbar, wenn der Zufall fest ist", () => {
    const cards = deck(8);
    const kinds = (seed: number) =>
      assignLearningBoxKinds(
        items(cards),
        ["writing", "oral"],
        cards,
        seeded(seed),
      ).map((entry) => entry.kind);
    expect(kinds(5)).toEqual(kinds(5));
    expect(new Set(kinds(5))).toEqual(new Set(["writing", "oral"]));
  });

  it("hängt an jede Auswahlfrage ihre Antworten und nur dort", () => {
    const cards = deck(6);
    for (const entry of assignLearningBoxKinds(
      items(cards),
      ["writing", "choice"],
      cards,
      seeded(2),
    )) {
      if (entry.kind === "choice") {
        expect(entry.choice?.cardId).toBe(entry.card.id);
      } else {
        expect(entry.choice).toBeUndefined();
      }
    }
  });

  it("macht eine Auswahlfrage ohne falsche Antwort zu Schreiben, sonst zu Mündlich", () => {
    const cards = [card("Haus", "house"), card("Heim", "house")];
    expect(
      assignLearningBoxKinds(
        items(cards),
        ["choice", "oral"],
        cards,
        seeded(),
      ).map((entry) => entry.kind),
    ).toEqual(["oral", "oral"]);
    expect(
      assignLearningBoxKinds(items(cards), ["choice"], cards, seeded()).every(
        (entry) => entry.kind === "writing",
      ),
    ).toBe(true);
    expect(
      assignLearningBoxKinds(
        items(cards),
        ["choice", "oral", "writing"],
        cards,
        seeded(),
      ).every((entry) => entry.kind !== "choice"),
    ).toBe(true);
  });
});
