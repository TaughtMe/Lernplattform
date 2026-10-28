import type { LearningWordStage } from "../domain/learning-word";
import type { MentalMathTask } from "../domain/mental-math";
import {
  isMathAnswerCorrect,
  isSpellingAnswerCorrect,
} from "../domain/start-point";
import {
  createMathAttempt,
  createMathPracticeRepository,
} from "./math-practice";
import {
  PersonalLearningDatabase,
  createLearningWordProgressRepository,
} from "./personal-learning-events";

/**
 * Antworten des Startpunkts (D2-2) sind gewöhnliche Lernereignisse: Sie laufen
 * durch dieselben Wege wie das freie Üben (Lernwörter und Mathe) und damit durch
 * den Wiederholungskern. Ein Fehler wird fällig und kommt in die Tagesportion.
 * Das Ereignisformat ändert sich nicht; eine Klasse ist nicht beteiligt, die
 * Antworten erscheinen deshalb in keinem Leistungsbrief.
 */
export function createStartPointRepository(
  database = new PersonalLearningDatabase(),
) {
  const words = createLearningWordProgressRepository(database);
  const math = createMathPracticeRepository(database);

  return {
    /** Speichert eine Rechtschreib-Antwort und liefert, ob sie richtig war. */
    recordSpelling: async (input: {
      word: string;
      answer: string;
      /** Darstellung der Aufgabe: 6 Hören und schreiben, 3 Lückenwort. */
      stage: LearningWordStage;
      roundId: string;
      attemptId: string;
      now?: string;
    }) => {
      const correct = isSpellingAnswerCorrect(input.word, input.answer);
      await words.recordAttempt({
        words: [input.word],
        correct,
        usedHelp: false,
        selfCorrected: false,
        stage: input.stage,
        roundId: input.roundId,
        attemptId: input.attemptId,
        mode: "free",
        firstAttempt: true,
        ...(input.now ? { now: input.now } : {}),
      });
      return correct;
    },

    /** Speichert eine Rechen-Antwort und liefert, ob sie richtig war. */
    recordMath: async (input: {
      task: MentalMathTask;
      answer: string;
      roundId: string;
      attemptId: string;
      now?: string;
    }) => {
      const event = await createMathAttempt({
        task: input.task,
        answer: input.answer,
        roundId: input.roundId,
        attemptId: input.attemptId,
        selfCorrected: false,
        usedHelp: false,
        ...(input.now ? { now: input.now } : {}),
      });
      await math.put(event);
      return isMathAnswerCorrect(input.task, input.answer);
    },
  };
}
