"use client";

import { useState, type FormEvent } from "react";
import type { DueLernwort } from "../../../src/domain/lernwort-service.ts";
import type { LernwortResult } from "../../../src/domain/lernwort.ts";
import { buildStage2Mask, buildStage3Mask, wordLengthPlaceholder } from "../../../src/domain/lernwort.ts";

type Props = {
  queue: DueLernwort[];
  onAnswer: (entry: DueLernwort, result: LernwortResult) => void;
  onFinish: () => void;
};

const MAX_ATTEMPTS = 3;

export function WordPractice({ queue, onAnswer, onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const entry = queue[index];

  if (!entry) {
    return (
      <div className="practice-card">
        <p>Für jetzt ist nichts mehr fällig. Gut gemacht!</p>
        <button className="button button--primary" type="button" onClick={onFinish}>Zurück zur Übersicht</button>
      </div>
    );
  }

  return (
    <LernwortCard
      key={entry.item.id}
      entry={entry}
      total={queue.length}
      position={index + 1}
      onResult={(result) => {
        onAnswer(entry, result);
        setIndex((i) => i + 1);
      }}
    />
  );
}

function LernwortCard({
  entry,
  total,
  position,
  onResult,
}: {
  entry: DueLernwort;
  total: number;
  position: number;
  onResult: (result: LernwortResult) => void;
}) {
  const { item, progress } = entry;
  const stage = progress.stage;
  const maskSeed = `${item.id}:${progress.dueAt}`;

  const [phase, setPhase] = useState<"idle" | "revealed" | "writing">(stage === 4 ? "idle" : "writing");
  const [inputValue, setInputValue] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  function reveal() {
    setPhase("revealed");
  }

  function hideAndWrite() {
    setPhase("writing");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const correct = inputValue.trim() === item.targetWord;
    setFeedback(correct ? "correct" : "wrong");
    setTimeout(() => setFeedback(null), 350);

    if (correct) {
      onResult({ correct: true, usedHelp: false, selfCorrected: attempts > 0 });
      return;
    }

    const nextAttempts = attempts + 1;
    if (nextAttempts >= MAX_ATTEMPTS) {
      onResult({ correct: false, usedHelp: false, selfCorrected: false });
      return;
    }
    setAttempts(nextAttempts);
    setInputValue("");
  }

  const reference =
    stage === 1
      ? item.targetWord
      : stage === 2
        ? maskedText(buildStage2Mask(item.targetWord, maskSeed))
        : stage === 3
          ? maskedText(buildStage3Mask(item.targetWord, maskSeed))
          : wordLengthPlaceholder(item.targetWord);

  const stageLabel: Record<number, string> = {
    1: "Stufe 1 · abschreiben",
    2: "Stufe 2 · Lücken ergänzen",
    3: "Stufe 3 · viele Lücken ergänzen",
    4: "Stufe 4 · aus dem Gedächtnis tippen",
  };

  return (
    <div className={`practice-card${feedback ? ` practice-card--${feedback}` : ""}`}>
      <p className="practice-card__progress">
        Wort {position} von {total} · {entry.list.title} · {stageLabel[stage] ?? `Stufe ${stage}`}
      </p>

      {phase === "idle" && (
        <>
          <p className="game-card__hint">Bereit? Schau dir das Wort kurz an, dann wird es wieder versteckt.</p>
          <button className="button button--primary" type="button" onClick={reveal}>Wort ansehen</button>
        </>
      )}

      {phase === "revealed" && (
        <>
          <p className="practice-card__question lernwort-card__word">{item.targetWord}</p>
          <button className="button button--secondary" type="button" onClick={hideAndWrite}>Verdecken &amp; schreiben</button>
        </>
      )}

      {phase === "writing" && (
        <form onSubmit={submit} className="game-card__form">
          <p className="practice-card__question lernwort-card__word lernwort-card__word--reference">{reference}</p>
          {attempts > 0 && <p className="lernwort-card__retry">Nicht ganz — versuch es noch einmal.</p>}
          <input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            aria-label="Wort eingeben"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button className="button button--primary" type="submit">Prüfen</button>
        </form>
      )}
    </div>
  );
}

function maskedText(mask: { char: string; hidden: boolean }[]): string {
  return mask.map((c) => (c.hidden ? "_" : c.char)).join("");
}
