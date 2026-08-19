"use client";

import { useState } from "react";
import type { AnswerResult, DueEntry } from "../../../src/domain/lernbox-service";

type Props = {
  queue: DueEntry[];
  onAnswer: (entry: DueEntry, result: AnswerResult) => void;
  onFinish: () => void;
};

type Step = "question" | "knowledge" | "writing";

export function PracticeSession({ queue, onAnswer, onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<Step>("question");
  const [usedHelp, setUsedHelp] = useState(false);

  const entry = queue[index];
  if (!entry) {
    return (
      <div className="practice-card">
        <p>Für jetzt ist nichts mehr fällig. Gut gemacht!</p>
        <button className="button button--primary" type="button" onClick={onFinish}>Zurück zur Übersicht</button>
      </div>
    );
  }

  const question = entry.direction === "prompt-to-answer" ? entry.item.prompt.text : entry.item.answer.text;
  const solution = entry.direction === "prompt-to-answer" ? entry.item.answer.text : entry.item.prompt.text;

  function submit(knowledgeCorrect: boolean, writingCorrect: boolean) {
    onAnswer(entry, { knowledgeCorrect, writingCorrect, help: usedHelp ? "hint" : "none" });
    setStep("question");
    setUsedHelp(false);
    setIndex((current) => current + 1);
  }

  return (
    <div className="practice-card">
      <p className="practice-card__progress">Karte {index + 1} von {queue.length} · {entry.stack.title}</p>
      <p className="practice-card__question">{question}</p>

      {step === "question" && (
        <>
          <label className="practice-card__help">
            <input type="checkbox" checked={usedHelp} onChange={(event) => setUsedHelp(event.target.checked)} />
            Ich brauche einen Hinweis
          </label>
          <button className="button button--primary" type="button" onClick={() => setStep("knowledge")}>Antwort aufdecken</button>
        </>
      )}

      {step !== "question" && <p className="practice-card__solution">{solution}</p>}

      {step === "knowledge" && (
        <>
          <p className="practice-card__ask">Wusstest du die Bedeutung?</p>
          <div className="practice-card__actions">
            <button className="button button--quiet" type="button" onClick={() => submit(false, false)}>Nein</button>
            <button className="button button--secondary" type="button" onClick={() => setStep("writing")}>Ja</button>
          </div>
        </>
      )}

      {step === "writing" && (
        <>
          <p className="practice-card__ask">Konntest du es auch richtig schreiben?</p>
          <div className="practice-card__actions">
            <button className="button button--quiet" type="button" onClick={() => submit(true, false)}>Nein</button>
            <button className="button button--primary" type="button" onClick={() => submit(true, true)}>Ja</button>
          </div>
        </>
      )}
    </div>
  );
}
