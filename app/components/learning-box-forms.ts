"use client";

import { useCallback, useState } from "react";
import {
  buildMatchRounds,
  supportsLearningBoxForms,
} from "../../src/domain/learning-box-forms";
import type {
  LearningBoxCard,
  LearningBoxDeck,
} from "../../src/domain/learning-box";
import type { LbForm, LbMain } from "../views/lernbox/lernbox-screen";

type FormState = {
  kind: LbForm;
  deckId: string;
  /** Neue Kennung je Spiel: Die Ansicht baut ihren Zustand neu auf. */
  key: string;
  title: string;
  rounds: ReturnType<typeof buildMatchRounds>;
  finished: boolean;
};

export const FORM_NOTICE_FEW_CARDS =
  "Dafür sind zu wenige verschiedene Karten im Stapel.";

/**
 * Anbindung von Zuordnen (docs/umsetzungsplan-lernbox-lernformen.md, LF-1,
 * LF-8). Zuordnen schreibt nichts: keine Box, keine Fälligkeit, kein
 * Lernereignis. Die mischbaren Fragearten (Schreiben, Mündlich, Auswahl,
 * LF-3) laufen als normale Runde in `learning-box-app.tsx`.
 */
export function useLearningBoxForms({
  cards,
  deckById,
  onNotice,
}: {
  cards: readonly LearningBoxCard[];
  deckById: ReadonlyMap<string, LearningBoxDeck>;
  onNotice: (message: string) => void;
}) {
  const [form, setForm] = useState<FormState | null>(null);

  const begin = useCallback(
    (kind: LbForm, deckId: string): boolean => {
      const deck = deckById.get(deckId);
      const pool = cards.filter((card) => card.deckId === deckId);
      if (!deck || !supportsLearningBoxForms(pool.length)) return false;
      const rounds = buildMatchRounds(pool);
      if (rounds.length === 0) {
        onNotice(FORM_NOTICE_FEW_CARDS);
        return false;
      }
      onNotice("");
      setForm({
        kind,
        deckId,
        key: crypto.randomUUID(),
        title: deck.title,
        rounds,
        finished: false,
      });
      return true;
    },
    [cards, deckById, onNotice],
  );

  const start = useCallback(
    (input: { scope: string; form: LbForm }) => {
      begin(input.form, input.scope);
    },
    [begin],
  );

  /** Zuordnen: neues Spiel mit neu gemischten Karten. */
  const matchAgain = useCallback(() => {
    if (form) begin("match", form.deckId);
  }, [begin, form]);

  const finish = useCallback(() => {
    setForm((current) =>
      current && !current.finished ? { ...current, finished: true } : current,
    );
  }, []);

  const close = useCallback(() => setForm(null), []);

  const main: Extract<LbMain, { kind: "match" }> | null = form
    ? {
        kind: "match",
        match: { title: form.title, gameKey: form.key, rounds: form.rounds },
      }
    : null;

  return {
    /** Läuft eine Lernform (auch ihr Ergebnis)? */
    form,
    /** Läuft eine Lernform noch, sodass Verlassen nachfragen soll? */
    running: form !== null && !form.finished,
    main,
    start,
    matchAgain,
    finish,
    close,
  };
}
