"use client";

import { useCallback, useRef, useState } from "react";
import {
  buildLearningBoxTest,
  buildMatchRounds,
  learningBoxTestAnswerCounts,
  supportsLearningBoxForms,
  type TestQuestion,
} from "../../src/domain/learning-box-forms";
import {
  processLearningBoxResult,
  type LearningBoxCard,
  type LearningBoxDeck,
  type LearningBoxDirection,
  type LearningBoxSessionDirection,
} from "../../src/domain/learning-box";
import type { createLearningBoxRepository } from "../../src/storage/personal-learning-events";
import type { LbForm, LbMain } from "../views/lernbox/lernbox-screen";

type Repository = Pick<
  ReturnType<typeof createLearningBoxRepository>,
  "getCard" | "putCardAndEvent"
>;

type FormState = {
  kind: LbForm;
  deckId: string;
  /** Richtung aus dem Start-Fenster (nur für den Test, bei „Noch einmal“ unnötig). */
  direction: LearningBoxSessionDirection;
  /** Neue Kennung je Spiel bzw. Test: Die Ansicht baut ihren Zustand neu auf. */
  key: string;
  title: string;
  rounds: ReturnType<typeof buildMatchRounds>;
  questions: TestQuestion[];
  /** Kennung des Tests für die Lernereignisse (LF-6). */
  roundId: string;
  /** Antworten, die für Box und Fälligkeit gezählt haben. */
  counted: number;
  finished: boolean;
};

export const FORM_NOTICE_FEW_CARDS =
  "Dafür sind zu wenige verschiedene Karten im Stapel.";
const FORM_NOTICE_FAILED =
  "Das hat nicht geklappt. Bitte versuche es noch einmal.";

/**
 * Anbindung von Zuordnen und Test (docs/umsetzungsplan-lernbox-lernformen.md,
 * LF-1 bis LF-8). Zuordnen und Auswahlfragen schreiben nichts. Nur die
 * Schreibfrage einer fälligen Karte wirkt, und zwar genau wie der Schreibmodus:
 * `processLearningBoxResult` und `putCardAndEvent` (LF-4); nicht fällige Karten
 * bleiben unberührt (LF-5).
 */
export function useLearningBoxForms({
  cards,
  deckById,
  repository,
  onNotice,
}: {
  cards: readonly LearningBoxCard[];
  deckById: ReadonlyMap<string, LearningBoxDeck>;
  repository: Repository;
  onNotice: (message: string) => void;
}) {
  const [form, setForm] = useState<FormState | null>(null);
  /** Antworten werden nacheinander geschrieben: Jede liest die Karte frisch. */
  const writes = useRef<Promise<void>>(Promise.resolve());
  /** Jede Frage eines Tests wirkt höchstens einmal, auch bei doppeltem Absenden. */
  const answered = useRef(new Set<string>());

  const begin = useCallback(
    (
      kind: LbForm,
      deckId: string,
      direction: LearningBoxSessionDirection,
    ): boolean => {
      const deck = deckById.get(deckId);
      const pool = cards.filter((card) => card.deckId === deckId);
      if (!deck || !supportsLearningBoxForms(pool.length)) return false;
      const rounds = kind === "match" ? buildMatchRounds(pool) : [];
      const questions =
        kind === "test" ? buildLearningBoxTest(pool, { direction }) : [];
      if (kind === "match" ? rounds.length === 0 : questions.length === 0) {
        onNotice(FORM_NOTICE_FEW_CARDS);
        return false;
      }
      onNotice("");
      setForm({
        kind,
        deckId,
        direction,
        key: crypto.randomUUID(),
        title: deck.title,
        rounds,
        questions,
        roundId: crypto.randomUUID(),
        counted: 0,
        finished: false,
      });
      return true;
    },
    [cards, deckById, onNotice],
  );

  const start = useCallback(
    (input: {
      scope: string;
      form: LbForm;
      direction: LearningBoxSessionDirection;
    }) => {
      begin(input.form, input.scope, input.direction);
    },
    [begin],
  );

  /** Zuordnen: neues Spiel mit neu gemischten Karten. */
  const matchAgain = useCallback(() => {
    if (form?.kind === "match") begin("match", form.deckId, form.direction);
  }, [begin, form]);

  const finish = useCallback(() => {
    setForm((current) =>
      current && !current.finished ? { ...current, finished: true } : current,
    );
  }, []);

  /** Wartet, bis alle abgegebenen Testantworten geschrieben sind. */
  const settle = useCallback(() => writes.current, []);

  const close = useCallback(() => setForm(null), []);

  /**
   * Eine Testantwort (LF-3 bis LF-6). Die Karte kommt frisch aus der
   * Datenbank; nur die Schreibfrage einer fälligen Karte ändert etwas.
   */
  const answer = useCallback(
    (question: TestQuestion, correct: boolean) => {
      if (form?.kind !== "test") return;
      const { roundId } = form;
      const marker = `${roundId}:${question.id}`;
      if (answered.current.has(marker)) return;
      answered.current.add(marker);
      writes.current = writes.current.then(async () => {
        try {
          const card = await repository.getCard(question.cardId);
          if (!card) return;
          const now = Date.now();
          if (!learningBoxTestAnswerCounts(question, card, now)) return;
          const direction: LearningBoxDirection = question.direction;
          const updated = processLearningBoxResult(card, {
            correct,
            direction,
            mode: "writing",
            now,
          });
          await repository.putCardAndEvent({
            card: updated,
            correct,
            direction,
            mode: "writing",
            roundId,
          });
          setForm((current) =>
            current?.roundId === roundId
              ? { ...current, counted: current.counted + 1 }
              : current,
          );
        } catch {
          onNotice(FORM_NOTICE_FAILED);
        }
      });
    },
    [form, onNotice, repository],
  );

  let main: Extract<LbMain, { kind: "match" | "test" }> | null = null;
  if (form?.kind === "match") {
    main = {
      kind: "match",
      match: { title: form.title, gameKey: form.key, rounds: form.rounds },
    };
  } else if (form?.kind === "test") {
    main = {
      kind: "test",
      test: {
        title: form.title,
        testKey: form.key,
        questions: form.questions,
        counted: form.counted,
      },
    };
  }

  return {
    /** Läuft eine Lernform (auch ihr Ergebnis)? */
    form,
    /** Läuft eine Lernform noch, sodass Verlassen nachfragen soll? */
    running: form !== null && !form.finished,
    main,
    start,
    matchAgain,
    finish,
    answer,
    settle,
    close,
  };
}
