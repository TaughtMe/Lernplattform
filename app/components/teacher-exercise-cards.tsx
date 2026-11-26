"use client";

import { useState, useSyncExternalStore } from "react";
import {
  exerciseCardHref,
  type ExerciseCard,
} from "../../src/domain/exercise-card";
import {
  ExerciseCardsScreen,
  MAX_EXERCISE_CARDS,
} from "../views/lehrer/exercise-cards-screen";

const subscribeNothing = () => () => undefined;

/**
 * Übungskarten zum Ausdrucken (L25-4): Die Auswahl lebt nur im Zustand der
 * Seite und wird nicht gespeichert. Die QR-Adresse ist absolut
 * (`window.location.origin` + Kartenadresse).
 */
export function TeacherExerciseCards() {
  const [cards, setCards] = useState<ExerciseCard[]>([]);
  const origin = useSyncExternalStore(
    subscribeNothing,
    () => window.location.origin,
    () => "",
  );
  return (
    <ExerciseCardsScreen
      cards={cards}
      origin={origin}
      onAdd={(card) =>
        setCards((list) =>
          list.length >= MAX_EXERCISE_CARDS ||
          list.some((item) => exerciseCardHref(item) === exerciseCardHref(card))
            ? list
            : [...list, card],
        )
      }
      onRemove={(index) =>
        setCards((list) => list.filter((_, position) => position !== index))
      }
      onPrint={() => window.print()}
    />
  );
}
