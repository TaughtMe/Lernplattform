import { describe, expect, it } from "vitest";
import {
  advanceFallingWords,
  createFallingWordPool,
  createFallingWordsGame,
  spawnFallingWord,
  typeFallingWordCharacter,
} from "./falling-words-game";

describe("calm falling words game", () => {
  it("scores completed groups and keeps wrong keys consequence-free", () => {
    let state = spawnFallingWord(createFallingWordsGame(), "fj");
    const unchanged = typeFallingWordCharacter(state, "x");
    expect(unchanged).toEqual(state);

    state = typeFallingWordCharacter(state, "f");
    state = typeFallingWordCharacter(state, "j");
    expect(state.words).toHaveLength(0);
    expect(state.score).toBe(2);
    expect(state.streak).toBe(1);
  });

  it("lets missed groups pass without subtracting points", () => {
    let state = spawnFallingWord(createFallingWordsGame(), "fj");
    state = advanceFallingWords(state, 8_000);
    expect(state.words).toHaveLength(0);
    expect(state.missed).toBe(1);
    expect(state.score).toBe(0);
    expect(state).not.toHaveProperty("lives");
  });

  it("uses only keys from completed learning steps", () => {
    const pool = createFallingWordPool(
      new Set(["grundstellung-zeigefinger"]),
      "stable-seed",
    );
    expect(pool).toHaveLength(24);
    expect(pool.every((group) => /^[fj]+$/.test(group))).toBe(true);
  });
});
