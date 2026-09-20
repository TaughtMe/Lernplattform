import { describe, expect, it } from "vitest";
import { createLearningBoxCard, createLearningBoxDeck } from "./learning-box";
import {
  createPersonalLearningBackup,
  parsePersonalLearningBackup,
  parsePersonalLearningBackupText,
  serializePersonalLearningBackup,
} from "./personal-backup";

function sample() {
  const deck = createLearningBoxDeck({
    title: "Englisch",
    now: 1_000,
  });
  const card = createLearningBoxCard({
    deckId: deck.id,
    question: "library",
    answer: "Bibliothek",
    now: 1_000,
  });
  return { deck, card };
}

describe("personal backup contract", () => {
  it("round-trips an empty personal backup", () => {
    const backup = createPersonalLearningBackup({
      learningEvents: [],
      learningBoxDecks: [],
      learningBoxCards: [],
      learningWordProgress: [],
      typingProgress: [],
    });

    expect(
      parsePersonalLearningBackupText(serializePersonalLearningBackup(backup)),
    ).toEqual(backup);
  });

  it("migrates the former decks/cards backup shape", () => {
    const { deck, card } = sample();
    const migrated = parsePersonalLearningBackup({
      decks: [deck],
      cards: [card],
    });

    expect(migrated.data.learningBoxDecks).toEqual([deck]);
    expect(migrated.data.learningBoxCards).toEqual([card]);
    expect(migrated.data.learningEvents).toEqual([]);
  });

  it("rejects damaged, unknown and overlarge backup data", () => {
    expect(() => parsePersonalLearningBackupText("{")).toThrow(
      "kein gültiges JSON",
    );
    expect(() =>
      parsePersonalLearningBackup({
        kind: "lernraum-personal-backup",
        schemaVersion: 1,
        exportedAt: "2026-09-20T10:00:00.000Z",
        dataArea: "personal",
        data: {
          learningEvents: [],
          learningBoxDecks: [],
          learningBoxCards: [],
          learningWordProgress: [],
          typingProgress: [],
          classMemberships: [],
        },
      }),
    ).toThrow();

    const { deck } = sample();
    expect(() =>
      createPersonalLearningBackup({
        learningEvents: [],
        learningBoxDecks: Array.from({ length: 100_001 }, (_, index) => ({
          ...deck,
          id: `${deck.id}-${index}`,
        })),
        learningBoxCards: [],
        learningWordProgress: [],
        typingProgress: [],
      }),
    ).toThrow();
  });
});
