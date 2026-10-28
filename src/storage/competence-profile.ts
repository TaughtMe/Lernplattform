import {
  buildCompetenceProfile,
  type CompetenceProfile,
  type CompetenceSources,
} from "../domain/competence-profile";
import { LEARNING_WORD_COLLECTIONS } from "../domain/german-learning-content";
import { learningEventV1Schema } from "../domain/learning-bundle";
import { readTolerant } from "../domain/tolerant-read";
import { allWordBoxViews, wordBoxSchema } from "../domain/word-box";
import { PersonalLearningDatabase } from "./personal-learning-events";
import { learningWordProgressSchema } from "./progress-schema";

/**
 * Lädt den Lernstand einmal und liefert das Kompetenzprofil (D2-3). Es wird
 * nichts geschrieben: Das Profil ist eine Projektion, die bei jedem Aufruf neu
 * entsteht. Unlesbare Datensätze bleiben gespeichert und fehlen im Profil
 * (tolerantes Lesen, Regel S-1).
 */
export function createCompetenceProfileRepository(
  database = new PersonalLearningDatabase(),
) {
  const readSources = async (now: number): Promise<CompetenceSources> => {
    const [events, cards, decks, words, boxes] = await Promise.all([
      database.learningEvents.toArray(),
      database.learningBoxCards.toArray(),
      database.learningBoxDecks.toArray(),
      database.learningWordProgress.toArray(),
      database.wordBoxes.toArray(),
    ]);
    const own = readTolerant(wordBoxSchema, boxes, "wordBoxes").items;
    return {
      now,
      events: readTolerant(learningEventV1Schema, events, "learningEvents")
        .items,
      cards,
      decks: decks.map((deck) => ({ id: deck.id, title: deck.title })),
      words: readTolerant(
        learningWordProgressSchema,
        words,
        "learningWordProgress",
      ).items,
      wordBoxes: allWordBoxViews(own, LEARNING_WORD_COLLECTIONS).map(
        (view) => ({
          id: view.id,
          // `allWordBoxViews` liefert nur diese drei Arten.
          kind:
            view.kind === "fest" || view.kind === "unterricht"
              ? view.kind
              : "eigen",
          title: view.title,
          words: view.words,
        }),
      ),
    };
  };

  return {
    load: async (now = Date.now()): Promise<CompetenceProfile> =>
      buildCompetenceProfile(await readSources(now)),
  };
}
