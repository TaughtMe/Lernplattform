import { answerKey, answerKeys } from "./answer-normalization";
import {
  getLearningBoxPrompt,
  learningBoxAlternatives,
  type LearningBoxCard,
  type LearningBoxDirection,
} from "./learning-box";

/**
 * Lernform „Zuordnen“ und Fragearten der LernBox (Auswahl) (Vision, Etappe 1: „ein
 * Inhalt, viele Lernformen“). Rundenbildung, Mischen und Auswertung sind rein;
 * der Zufall kommt von außen. Die Wirkung auf Box und Fälligkeit steht in
 * `docs/umsetzungsplan-lernbox-lernformen.md` (Regeln LF-1 bis LF-8).
 */

/** Zufallszahl in [0, 1), wie `Math.random`. */
export type LearningBoxRandom = () => number;

/** Ab so vielen Karten bietet ein Stapel Zuordnen und Auswahl an. */
export const LEARNING_BOX_FORM_MIN_CARDS = 4;
/** Paare je Runde beim Zuordnen. */
export const MATCH_PAIRS_PER_ROUND = 6;
/** Runden je Spiel; ein Spiel bleibt damit kurz (höchstens 18 Paare). */
export const MATCH_MAX_ROUNDS = 3;
/** Antworten je Auswahlfrage (eine richtige, sonst falsche aus dem Stapel). */
export const CHOICE_OPTIONS = 4;

/** Mischt, ohne die Vorlage zu ändern (Fisher-Yates). */
export function shuffleLearningBoxItems<T>(
  items: readonly T[],
  random: LearningBoxRandom = Math.random,
): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other]!, result[index]!];
  }
  return result;
}

/** Anzeige eines Kartentexts: Alternativen („home | house“) mit „ / “. */
function display(text: string) {
  return learningBoxAlternatives(text).join(" / ");
}

const key = (text: string) => answerKey(text, { compatibility: true });

/** Ein Stapel kann die neuen Lernformen anbieten (LF-8). */
export function supportsLearningBoxForms(cardCount: number) {
  return cardCount >= LEARNING_BOX_FORM_MIN_CARDS;
}

// --- Zuordnen ---------------------------------------------------------------

export type MatchTile = {
  id: string;
  cardId: string;
  side: "term" | "meaning";
  text: string;
};

export type MatchRound = {
  /**
   * Kacheln beider Seiten: zuerst alle Begriffe, dann alle Bedeutungen, jede
   * Seite für sich gemischt. Die Ansicht zeigt sie in zwei Spalten (links
   * Begriffe, rechts Bedeutungen; Entscheidung des Entwicklers vom 15.11.2026).
   */
  tiles: MatchTile[];
  pairs: number;
};

/**
 * Wählt die Karten eines Spiels: zufällig, höchstens `MATCH_MAX_ROUNDS` Runden.
 * Karten mit gleichem Begriff oder gleicher Bedeutung wie eine schon gewählte
 * entfallen; sonst gäbe es zwei gleiche Kacheln und ein Paar wäre nicht
 * eindeutig.
 */
function pickMatchCards(
  cards: readonly LearningBoxCard[],
  random: LearningBoxRandom,
) {
  const terms = new Set<string>();
  const meanings = new Set<string>();
  const picked: LearningBoxCard[] = [];
  for (const card of shuffleLearningBoxItems(cards, random)) {
    if (picked.length >= MATCH_PAIRS_PER_ROUND * MATCH_MAX_ROUNDS) break;
    // Vergleich über den angezeigten Text: „home | house“ und „home / house“
    // erscheinen gleich und dürfen nicht zwei Kacheln werden.
    const term = key(display(card.question));
    const meaning = key(display(card.answer));
    if (!term || !meaning || terms.has(term) || meanings.has(meaning)) continue;
    terms.add(term);
    meanings.add(meaning);
    picked.push(card);
  }
  return picked;
}

/**
 * Runden eines Zuordnen-Spiels: etwa `MATCH_PAIRS_PER_ROUND` Paare je Runde,
 * gleichmäßig verteilt (7 Karten ergeben 4 + 3, nicht 6 + 1). Unter zwei
 * eindeutigen Paaren gibt es kein Spiel.
 */
export function buildMatchRounds(
  cards: readonly LearningBoxCard[],
  random: LearningBoxRandom = Math.random,
): MatchRound[] {
  const picked = pickMatchCards(cards, random);
  if (picked.length < 2) return [];
  const roundCount = Math.ceil(picked.length / MATCH_PAIRS_PER_ROUND);
  const rounds: MatchRound[] = [];
  let start = 0;
  for (let round = 0; round < roundCount; round += 1) {
    const size = Math.ceil((picked.length - start) / (roundCount - round));
    const inside = picked.slice(start, start + size);
    start += size;
    const terms = inside.map((card): MatchTile => ({
      id: `${card.id}:term`,
      cardId: card.id,
      side: "term",
      text: display(card.question),
    }));
    const meanings = inside.map((card): MatchTile => ({
      id: `${card.id}:meaning`,
      cardId: card.id,
      side: "meaning",
      text: display(card.answer),
    }));
    rounds.push({
      pairs: inside.length,
      tiles: [
        ...shuffleLearningBoxItems(terms, random),
        ...shuffleLearningBoxItems(meanings, random),
      ],
    });
  }
  return rounds;
}

export type MatchState = {
  rounds: readonly MatchRound[];
  /** Laufende Runde (Index). */
  round: number;
  /** Zuerst angetippte Kachel. */
  selected: string | null;
  /** Gefundene Kacheln der laufenden Runde. */
  solved: readonly string[];
  /** Zuletzt gefundenes Paar (für die Rückmeldung). */
  lastPair: readonly [string, string] | null;
  /** Falsches Paar, das gerade Rückmeldung zeigt. */
  wrong: readonly [string, string] | null;
  /** Fehlversuche im ganzen Spiel. */
  mistakes: number;
  /** Gefundene Paare im ganzen Spiel. */
  found: number;
  /** Karten, die an einem Fehlversuch beteiligt waren. */
  missed: readonly string[];
  /** Alle Paare der laufenden Runde sind gefunden. */
  roundDone: boolean;
  /** Die letzte Runde ist geschafft. */
  finished: boolean;
};

export type MatchAction =
  | { type: "pick"; tileId: string }
  | { type: "clear-wrong" }
  | { type: "next-round" };

export function startMatch(rounds: readonly MatchRound[]): MatchState {
  return {
    rounds,
    round: 0,
    selected: null,
    solved: [],
    lastPair: null,
    wrong: null,
    mistakes: 0,
    found: 0,
    missed: [],
    roundDone: rounds.length === 0,
    finished: rounds.length === 0,
  };
}

/**
 * Spielzug beim Zuordnen. Zwei Kacheln derselben Karte sind ein Paar und
 * verschwinden; ein Begriff mit einer fremden Bedeutung ist ein Fehlversuch
 * (die Kacheln bleiben). Eine zweite Kachel derselben Spalte wechselt nur die
 * Wahl. Die gewählte Kachel erneut anzutippen, hebt die Wahl auf. Es gibt
 * keine Uhr.
 */
export function matchReducer(
  state: MatchState,
  action: MatchAction,
): MatchState {
  if (action.type === "clear-wrong") {
    return state.wrong ? { ...state, wrong: null } : state;
  }
  if (action.type === "next-round") {
    if (!state.roundDone || state.finished) return state;
    return {
      ...state,
      round: state.round + 1,
      selected: null,
      solved: [],
      lastPair: null,
      wrong: null,
      roundDone: false,
    };
  }
  const tiles = state.rounds[state.round]?.tiles ?? [];
  const tile = tiles.find((entry) => entry.id === action.tileId);
  if (!tile || state.roundDone || state.solved.includes(tile.id)) return state;
  if (state.selected === null) {
    return { ...state, selected: tile.id, wrong: null };
  }
  if (state.selected === tile.id) return { ...state, selected: null };
  const first = tiles.find((entry) => entry.id === state.selected);
  if (!first || first.side === tile.side) {
    return { ...state, selected: tile.id, wrong: null };
  }
  if (first.cardId !== tile.cardId) {
    return {
      ...state,
      selected: null,
      lastPair: null,
      wrong: [first.id, tile.id],
      mistakes: state.mistakes + 1,
      missed: [...new Set([...state.missed, first.cardId, tile.cardId])],
    };
  }
  const solved = [...state.solved, first.id, tile.id];
  const roundDone = solved.length >= tiles.length;
  return {
    ...state,
    selected: null,
    solved,
    lastPair: [first.id, tile.id],
    wrong: null,
    found: state.found + 1,
    roundDone,
    finished: roundDone && state.round >= state.rounds.length - 1,
  };
}

// --- Auswahl ----------------------------------------------------------------

export type ChoiceQuestion = {
  id: string;
  cardId: string;
  direction: LearningBoxDirection;
  /** Frage in Anzeigeform. */
  prompt: string;
  /** Lösung, wie sie auf der Karte steht (Alternativen mit „|“). */
  expected: string;
  /** Lösung in Anzeigeform. */
  expectedLabel: string;
  /** Antworten in Anzeigeform, gemischt. */
  options: readonly string[];
  /** Index der richtigen Antwort in `options`. */
  correctOption: number;
};

/**
 * Falsche Antworten einer Auswahlfrage: Lösungen anderer Karten des Stapels in
 * derselben Richtung. Eine Karte entfällt, wenn ihre Frage gleich lautet oder
 * ihre Lösung auch hier als richtig gälte oder schon unter den Antworten steht.
 */
function pickDistractors(
  card: LearningBoxCard,
  direction: LearningBoxDirection,
  pool: readonly LearningBoxCard[],
  random: LearningBoxRandom,
) {
  const own = getLearningBoxPrompt(card, direction);
  const taken = new Set(answerKeys(own.answer, { compatibility: true }));
  const question = key(own.question);
  const distractors: string[] = [];
  for (const other of shuffleLearningBoxItems(pool, random)) {
    if (distractors.length >= CHOICE_OPTIONS - 1) break;
    if (other.id === card.id) continue;
    const prompt = getLearningBoxPrompt(other, direction);
    const keys = answerKeys(prompt.answer, { compatibility: true });
    if (key(prompt.question) === question || keys.length === 0) continue;
    if (keys.some((entry) => taken.has(entry))) continue;
    keys.forEach((entry) => taken.add(entry));
    distractors.push(display(prompt.answer));
  }
  return distractors;
}

/**
 * Stellt die Auswahlfrage zu einer Karte zusammen: die richtige Lösung und bis
 * zu drei falsche aus dem Stapel (`pool`), gemischt. Findet sich keine falsche
 * Antwort, gibt es keine Auswahlfrage (`null`).
 */
export function buildLearningBoxChoice(
  card: LearningBoxCard,
  direction: LearningBoxDirection,
  pool: readonly LearningBoxCard[],
  random: LearningBoxRandom = Math.random,
): ChoiceQuestion | null {
  const prompt = getLearningBoxPrompt(card, direction);
  const distractors = pickDistractors(card, direction, pool, random);
  if (distractors.length === 0) return null;
  const expectedLabel = display(prompt.answer);
  const options = shuffleLearningBoxItems(
    [expectedLabel, ...distractors],
    random,
  );
  return {
    id: `${card.id}:${direction}`,
    cardId: card.id,
    direction,
    prompt: display(prompt.question),
    expected: prompt.answer,
    expectedLabel,
    options,
    correctOption: options.indexOf(expectedLabel),
  };
}

/** Bewertet die gewählte Antwort (ihr Text); keine Wahl ist falsch. */
export function gradeLearningBoxChoice(
  question: ChoiceQuestion,
  given: string,
) {
  return (
    given !== "" && question.options.indexOf(given) === question.correctOption
  );
}

// --- Gemischte Fragearten ---------------------------------------------------

/** Fragearten einer Runde: Schreiben, Mündlich, Auswahl (LF-3). */
export type LearningBoxQuestionKind = "writing" | "oral" | "choice";

/**
 * Verteilt die gewählten Fragearten auf die Karten einer Runde: gleichmäßig
 * und in zufälliger Reihenfolge (bei drei Arten und neun Karten je dreimal).
 * Eine Auswahlfrage ohne falsche Antwort wird zu Schreiben, sonst zu Mündlich,
 * je nachdem, was gewählt ist. Jede Art behält ihre Box-Regel: Auswahl ändert
 * nichts (LF-3), die übrigen laufen über `processLearningBoxResult`.
 */
export function assignLearningBoxKinds<
  T extends { card: LearningBoxCard; direction: LearningBoxDirection },
>(
  items: readonly T[],
  kinds: readonly LearningBoxQuestionKind[],
  pool: readonly LearningBoxCard[],
  random: LearningBoxRandom = Math.random,
): (T & { kind: LearningBoxQuestionKind; choice?: ChoiceQuestion })[] {
  const chosen = [...new Set(kinds)];
  if (chosen.length === 0) chosen.push("writing");
  const order = shuffleLearningBoxItems(
    items.map((_, index) => chosen[index % chosen.length]!),
    random,
  );
  return items.map((item, index) => {
    const kind = order[index]!;
    if (kind !== "choice") return { ...item, kind };
    const choice = buildLearningBoxChoice(
      item.card,
      item.direction,
      pool,
      random,
    );
    if (choice) return { ...item, kind, choice };
    return {
      ...item,
      kind:
        chosen.includes("oral") && !chosen.includes("writing")
          ? "oral"
          : "writing",
    };
  });
}
