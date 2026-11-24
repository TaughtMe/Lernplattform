import { describe, expect, it } from "vitest";
import {
  createLearningBoxCard,
  evaluateLearningBoxAnswer,
  processLearningBoxResult,
  type LearningBoxCard,
} from "./learning-box";
import {
  MATCH_MAX_ROUNDS,
  MATCH_PAIRS_PER_ROUND,
  TEST_CHOICES,
  TEST_MAX_QUESTIONS,
  buildLearningBoxTest,
  buildMatchRounds,
  gradeLearningBoxTestAnswer,
  learningBoxTestAnswerCounts,
  matchReducer,
  shuffleLearningBoxItems,
  startMatch,
  summarizeLearningBoxTest,
  supportsLearningBoxForms,
  type MatchState,
} from "./learning-box-forms";

const NOW = Date.UTC(2026, 10, 14, 9);
const DAY_MS = 24 * 60 * 60 * 1000;

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

describe("Test: Zusammenstellung", () => {
  it("fragt jede Karte einmal, erst schriftlich, dann als Auswahl", () => {
    const cards = deck(8);
    const questions = buildLearningBoxTest(cards, {
      direction: "forward",
      random: seeded(),
    });
    expect(questions).toHaveLength(8);
    expect(new Set(questions.map((q) => q.cardId)).size).toBe(8);
    expect(questions.map((q) => q.kind)).toEqual([
      ...Array<string>(4).fill("written"),
      ...Array<string>(4).fill("choice"),
    ]);
  });

  it("begrenzt den Test auf zehn Fragen", () => {
    const questions = buildLearningBoxTest(deck(30), {
      direction: "forward",
      random: seeded(),
    });
    expect(questions).toHaveLength(TEST_MAX_QUESTIONS);
  });

  it("bietet vier verschiedene Antworten aus dem Stapel, eine ist richtig", () => {
    const cards = deck(8);
    const answers = new Set(cards.map((entry) => entry.answer));
    for (const question of buildLearningBoxTest(cards, {
      direction: "forward",
      random: seeded(3),
    }).filter((q) => q.kind === "choice")) {
      expect(question.options).toHaveLength(TEST_CHOICES);
      expect(new Set(question.options).size).toBe(TEST_CHOICES);
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
    let checked = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      const question = buildLearningBoxTest(cards, {
        direction: "forward",
        random: seeded(seed),
      }).find((q) => q.cardId === cards[0]!.id && q.kind === "choice");
      if (!question) continue;
      checked += 1;
      const wrong = question.options.filter(
        (_, index) => index !== question.correctOption,
      );
      expect(wrong).not.toContain("home");
      expect(wrong).not.toContain("House");
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("fragt rückwärts nach dem Begriff und wechselt gemischt ab", () => {
    const cards = deck(4);
    const reverse = buildLearningBoxTest(cards, {
      direction: "reverse",
      random: seeded(),
    });
    for (const question of reverse) {
      const source = cards.find((entry) => entry.id === question.cardId)!;
      expect(question.prompt).toBe(source.answer);
      expect(question.expected).toBe(source.question);
    }
    const mixed = buildLearningBoxTest(cards, {
      direction: "mixed",
      random: seeded(),
    });
    expect(mixed.map((q) => q.direction)).toEqual([
      "forward",
      "reverse",
      "forward",
      "reverse",
    ]);
  });

  it("macht aus einer Auswahlfrage ohne falsche Antwort eine Schreibfrage", () => {
    const cards = [card("Haus", "house"), card("Heim", "house")];
    const questions = buildLearningBoxTest(cards, {
      direction: "forward",
      random: seeded(),
    });
    expect(questions.every((q) => q.kind === "written")).toBe(true);
  });
});

describe("Test: Auswertung", () => {
  const cards = deck(8);
  const questions = buildLearningBoxTest(cards, {
    direction: "forward",
    random: seeded(),
  });
  const written = questions.find((q) => q.kind === "written")!;
  const choice = questions.find((q) => q.kind === "choice")!;

  it("bewertet Schreibfragen wie der Schreibmodus", () => {
    const source = card("Haus", "home | house (building)");
    const [question] = buildLearningBoxTest([source], {
      direction: "forward",
      random: seeded(),
    });
    for (const input of ["House", " home ", "house building", "hause", ""]) {
      expect(gradeLearningBoxTestAnswer(question!, input)).toBe(
        evaluateLearningBoxAnswer(source, input, "forward").accepted,
      );
    }
    expect(gradeLearningBoxTestAnswer(question!, "ＨＯＭＥ")).toBe(true);
    expect(gradeLearningBoxTestAnswer(question!, "hause")).toBe(false);
  });

  it("bewertet Auswahlfragen nach der gewählten Antwort", () => {
    const right = choice.options[choice.correctOption]!;
    const wrong = choice.options.find((option) => option !== right)!;
    expect(gradeLearningBoxTestAnswer(choice, right)).toBe(true);
    expect(gradeLearningBoxTestAnswer(choice, wrong)).toBe(false);
    expect(gradeLearningBoxTestAnswer(choice, "")).toBe(false);
  });

  it("nennt die falsch und die nicht beantworteten Fragen", () => {
    const summary = summarizeLearningBoxTest(questions, {
      ...Object.fromEntries(
        questions.map((q) => [q.id, { given: q.expected, correct: true }]),
      ),
      [written.id]: { given: "falsch", correct: false },
    });
    expect(summary.total).toBe(8);
    expect(summary.correct).toBe(7);
    expect(summary.missed).toEqual([{ question: written, given: "falsch" }]);
    expect(summarizeLearningBoxTest(questions, {}).missed).toHaveLength(8);
  });

  it("lässt nur Schreibfragen fälliger Karten auf die Box wirken", () => {
    const fresh = cards.find((entry) => entry.id === written.cardId)!;
    // Neue Karte: fällig wie im Schreibmodus.
    expect(learningBoxTestAnswerCounts(written, fresh, NOW)).toBe(true);
    const practised = processLearningBoxResult(fresh, {
      correct: true,
      direction: "forward",
      mode: "writing",
      now: NOW,
    });
    // Gerade aufgestiegen (Box 2): erst in drei Tagen wieder fällig.
    expect(learningBoxTestAnswerCounts(written, practised, NOW + 1000)).toBe(
      false,
    );
    expect(
      learningBoxTestAnswerCounts(written, practised, NOW + 4 * DAY_MS),
    ).toBe(true);
    // Auswahlfragen zählen nie, auch nicht bei fälligen Karten.
    expect(learningBoxTestAnswerCounts(choice, fresh, NOW)).toBe(false);
  });
});
