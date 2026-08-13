"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { computeRunningDictationStars } from "../../src/domain/running-dictation";
import {
  checkLiveAnswer,
  liveWordKind,
  type LiveSession,
} from "../../src/integrations/laufdiktat/live-session";
import type { LiveProgress } from "../../src/integrations/laufdiktat/room-api";

type Phase = "reveal" | "write" | "wrong" | "correct" | "complete";

type LiveRunningDictationGameProps = {
  code: string;
  studentName: string;
  session: LiveSession;
  connectionWarning: string;
  initialProgress: LiveProgress | null;
  onProgress: (progress: LiveProgress) => void;
};

export function LiveRunningDictationGame({
  code,
  studentName,
  session,
  connectionWarning,
  initialProgress,
  onProgress,
}: LiveRunningDictationGameProps) {
  const restoredIndex = Math.min(
    initialProgress?.currentIndex ?? 0,
    session.words.length - 1,
  );
  const [index, setIndex] = useState(restoredIndex);
  const [phase, setPhase] = useState<Phase>(
    initialProgress?.finished ? "complete" : "reveal",
  );
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState(initialProgress?.attempts ?? 0);
  const [peeks, setPeeks] = useState(initialProgress?.peeks ?? 0);
  const [errors, setErrors] = useState(initialProgress?.errors ?? 0);
  const [wordErrors, setWordErrors] = useState<Record<string, number>>({});
  const [hasWrittenCurrent, setHasWrittenCurrent] = useState(false);
  const startedAt = useRef(0);
  const answerRef = useRef<HTMLInputElement>(null);
  const current = session.words[index];

  useEffect(() => {
    if (phase !== "correct") return;
    const timer = window.setTimeout(() => {
      if (index + 1 >= session.words.length) {
        setPhase("complete");
        onProgress({
          currentIndex: session.words.length,
          peeks,
          attempts,
          errors,
          finished: true,
          durationMs: Date.now() - startedAt.current,
          wordErrors,
        });
        return;
      }
      setIndex((value) => value + 1);
      setAnswer("");
      setHasWrittenCurrent(false);
      setPhase("reveal");
      onProgress({
        currentIndex: index + 1,
        peeks,
        attempts,
        errors,
        finished: false,
        wordErrors,
      });
    }, 550);
    return () => window.clearTimeout(timer);
  }, [
    attempts,
    errors,
    index,
    onProgress,
    peeks,
    phase,
    session.words.length,
    wordErrors,
  ]);

  useEffect(() => {
    if (phase === "write") answerRef.current?.focus();
  }, [phase]);

  if (session.stationMode) {
    return (
      <main className="live-game-page">
        <section className="live-room-state">
          <p className="eyebrow">Raum {code} · Stationsmodus</p>
          <h1>Du bist angemeldet, {studentName}.</h1>
          <p>
            Die Stationszuordnung folgt als eigener Integrationsschritt. Bleib
            in diesem Raum, damit deine Anmeldung erhalten bleibt.
          </p>
        </section>
      </main>
    );
  }

  if (phase === "complete") {
    const stars = computeRunningDictationStars(errors, session.words.length);
    return (
      <main className="live-game-page">
        <section className="live-game-complete" aria-live="polite">
          <p className="eyebrow">Raum {code} · Runde abgeschlossen</p>
          <h1>Geschafft, {studentName}!</h1>
          {session.showStars ? (
            <div
              className="running-stars"
              aria-label={`${stars} von 5 Sternen`}
            >
              <span>{"★".repeat(stars)}</span>
              <i>{"★".repeat(5 - stars)}</i>
            </div>
          ) : null}
          <p>
            {session.words.length} Aufgaben · {errors} Fehlversuche
          </p>
          <p>Dein Ergebnis wurde an diese Unterrichtsrunde zurückgegeben.</p>
        </section>
      </main>
    );
  }

  if (!current) return null;
  const activeWord = current;

  const kind = liveWordKind(activeWord);
  const prompt = activeWord.prompt ?? activeWord.targetWord;

  function startWriting() {
    if (startedAt.current === 0) startedAt.current = Date.now();
    if (hasWrittenCurrent) setPeeks((value) => value + 1);
    setHasWrittenCurrent(true);
    setPhase("write");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answer.trim()) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (checkLiveAnswer(activeWord, answer)) {
      setPhase("correct");
      return;
    }

    const key =
      kind === "vocabulary"
        ? `${activeWord.prompt ?? ""} → ${activeWord.targetWord}`
        : prompt;
    const nextErrors = errors + 1;
    const nextWordErrors = {
      ...wordErrors,
      [key]: (wordErrors[key] ?? 0) + 1,
    };
    setErrors(nextErrors);
    setWordErrors(nextWordErrors);
    onProgress({
      currentIndex: index,
      peeks,
      attempts: nextAttempts,
      errors: nextErrors,
      finished: false,
      wordErrors: nextWordErrors,
    });

    if (session.gameMode === "TEST") {
      setPhase("correct");
    } else {
      setPhase("wrong");
    }
  }

  return (
    <main className="live-game-page">
      <header className="live-game-topbar">
        <div>
          <span>Raum {code}</span>
          <strong>{studentName}</strong>
        </div>
        <div aria-label={`Aufgabe ${index + 1} von ${session.words.length}`}>
          <span>Aufgabe</span>
          <strong>
            {index + 1} / {session.words.length}
          </strong>
        </div>
      </header>

      {connectionWarning ? (
        <p className="live-game-warning" role="status">
          {connectionWarning}
        </p>
      ) : null}

      <section className="live-game-task" aria-live="polite">
        {phase === "reveal" ? (
          <>
            <p className="eyebrow">Ansehen und merken</p>
            <h1>{prompt}</h1>
            <button className="button button--primary" onClick={startWriting}>
              Verstanden – jetzt schreiben
            </button>
          </>
        ) : null}

        {phase === "write" ? (
          <form onSubmit={submit}>
            <p className="eyebrow">Aus dem Gedächtnis</p>
            <h1>
              {kind === "vocabulary" || kind === "math"
                ? prompt
                : "Was hast du dir gemerkt?"}
            </h1>
            <label htmlFor="live-game-answer">Deine Antwort</label>
            <input
              ref={answerRef}
              id="live-game-answer"
              inputMode={kind === "math" ? "decimal" : "text"}
              autoComplete="off"
              spellCheck={false}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
            />
            <div className="live-game-actions">
              <button
                type="button"
                className="text-button"
                onClick={() => setPhase("reveal")}
              >
                Noch einmal ansehen
              </button>
              <button className="button button--primary">Prüfen</button>
            </div>
          </form>
        ) : null}

        {phase === "wrong" ? (
          <div className="live-game-feedback is-wrong">
            <span aria-hidden="true">×</span>
            <p className="eyebrow">Noch nicht richtig</p>
            <h1>Versuch es noch einmal.</h1>
            <button
              className="button button--primary"
              onClick={() => {
                setAnswer("");
                setPhase("write");
              }}
            >
              Weiter üben
            </button>
          </div>
        ) : null}

        {phase === "correct" ? (
          <div className="live-game-feedback is-correct">
            <span aria-hidden="true">✓</span>
            <p>Richtig</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
