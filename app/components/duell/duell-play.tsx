"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { seededShuffle } from "../../../src/duell/duell-random.ts";
import { checkDuellAnswer, evaluateDuellRound, type DuellAnswerInput, type DuellRoundResult } from "../../../src/duell/duell-scoring.ts";
import type { DuellWord } from "../../../src/duell/duell-content.ts";
import { submitDuellResult } from "../../../src/duell/duell-api.ts";
import type { JoinedDuellIdentity } from "./duell-app.tsx";

type Props = {
  identity: JoinedDuellIdentity;
  content: DuellWord[];
  onDone: (round: DuellRoundResult) => void;
};

/** "Alle bearbeiten dieselben Aufgaben in unterschiedlicher Reihenfolge" (siehe "09 - Duelle") — der Teilnehmertoken ist der Seed, also für jede Person stabil, aber zwischen Personen verschieden. */
export function DuellPlay({ identity, content, onDone }: Props) {
  const order = useMemo(() => seededShuffle(content, identity.participantToken), [content, identity.participantToken]);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [answers, setAnswers] = useState<DuellAnswerInput[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startedAt.current = performance.now();
  }, []);

  useEffect(() => {
    if (feedback === null) inputRef.current?.focus();
  }, [feedback, index]);

  const currentWord = order[index];

  async function finish(allAnswers: DuellAnswerInput[]) {
    setSubmitting(true);
    const totalTimeMs = Math.round(performance.now() - (startedAt.current ?? performance.now()));
    const round = evaluateDuellRound(order, allAnswers, totalTimeMs);
    try {
      await submitDuellResult(identity.duellId, identity.participantToken, round);
    } catch {
      // best-effort — wenn das Absenden fehlschlägt, sieht diese Person ihr Ergebnis später einfach nicht in der Liste; lokal ist die Runde trotzdem ausgewertet
    }
    onDone(round);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!currentWord || feedback !== null || submitting) return;
    const correct = checkDuellAnswer(currentWord, typed);
    const nextAnswers = [...answers, { itemId: currentWord.itemId, typed }];
    setAnswers(nextAnswers);
    setFeedback(correct ? "correct" : "wrong");
    setTyped("");
    window.setTimeout(() => {
      if (index + 1 >= order.length) {
        void finish(nextAnswers);
      } else {
        setFeedback(null);
        setIndex((i) => i + 1);
      }
    }, 600);
  }

  if (order.length === 0) {
    return <p>Für dieses Duell gibt es noch keine Wörter.</p>;
  }

  if (submitting) {
    return <p>Runde wird ausgewertet …</p>;
  }

  return (
    <div className="duell-play">
      <p className="duell-play__progress">{index + 1} / {order.length}</p>
      <form className="duell-play__form" onSubmit={handleSubmit}>
        <p className="duell-play__prompt">{currentWord.prompt}</p>
        <input
          ref={inputRef}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          disabled={feedback !== null}
          autoComplete="off"
          placeholder="Deine Antwort"
        />
        {feedback && (
          <p className={feedback === "correct" ? "duell-play__feedback duell-play__feedback--correct" : "duell-play__feedback duell-play__feedback--wrong"}>
            {feedback === "correct" ? "Richtig!" : `Leider falsch. Richtig wäre: ${currentWord.answer}`}
          </p>
        )}
        <button className="button button--primary" type="submit" disabled={feedback !== null}>Antworten</button>
      </form>
    </div>
  );
}
