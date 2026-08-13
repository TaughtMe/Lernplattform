"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { computeRunningDictationStars } from "../../src/domain/running-dictation";
import {
  checkLiveAnswer,
  liveWordKind,
  type LiveSession,
} from "../../src/integrations/laufdiktat/live-session";
import type { LiveProgress } from "../../src/integrations/laufdiktat/room-api";
import { LiveStationGame } from "./live-station-game";

type Phase = "reveal" | "write" | "wrong" | "correct" | "complete";
type AttackType = "ink" | "flicker";

type LiveRunningDictationGameProps = {
  code: string;
  studentName: string;
  session: LiveSession;
  connectionWarning: string;
  initialProgress: LiveProgress | null;
  onProgress: (progress: LiveProgress) => void;
  onLoadProgress?: (studentKey: string) => Promise<LiveProgress | null>;
  roster?: Record<string, number>;
  incomingAttack?: { id: number; type: AttackType; from: string } | null;
  onSendAttack?: (to: string, type: AttackType) => boolean;
};

export function LiveRunningDictationGame({
  code,
  studentName,
  session,
  connectionWarning,
  initialProgress,
  onProgress,
  onLoadProgress,
  roster = {},
  incomingAttack,
  onSendAttack,
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
  const [charge, setCharge] = useState(0);
  const [shield, setShield] = useState(false);
  const [picker, setPicker] = useState<AttackType | null>(null);
  const [activeAttack, setActiveAttack] = useState<AttackType | null>(null);
  const [battleMessage, setBattleMessage] = useState("");
  const startedAt = useRef(0);
  const lastAttackId = useRef(0);
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

  useEffect(() => {
    if (!incomingAttack || session.gameMode !== "BATTLE") return;
    if (lastAttackId.current === incomingAttack.id) return;
    lastAttackId.current = incomingAttack.id;
    let endTimer = 0;
    const startTimer = window.setTimeout(() => {
      if (shield) {
        setShield(false);
        setBattleMessage(`Angriff von ${incomingAttack.from} geblockt.`);
        return;
      }
      setActiveAttack(incomingAttack.type);
      setBattleMessage(
        incomingAttack.type === "ink"
          ? `Tintenangriff von ${incomingAttack.from}`
          : `Flimmerangriff von ${incomingAttack.from}`,
      );
      endTimer = window.setTimeout(() => {
        setActiveAttack(null);
        setBattleMessage("");
      }, 15_000);
    }, 0);
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(endTimer);
    };
  }, [incomingAttack, session.gameMode, shield]);

  if (session.stationMode) {
    return onLoadProgress ? (
      <LiveStationGame
        code={code}
        session={session}
        connectionWarning={connectionWarning}
        onProgress={onProgress}
        onLoadProgress={onLoadProgress}
      />
    ) : null;
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
      if (session.gameMode === "BATTLE") {
        const othersAhead = Object.entries(roster).filter(
          ([name, otherIndex]) => name !== studentName && otherIndex > index,
        ).length;
        setCharge((value) =>
          Math.min(100, value + (othersAhead >= 1 ? 34 : 25)),
        );
      }
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
    <main
      className={`live-game-page${activeAttack === "flicker" ? " is-flickering" : ""}`}
    >
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

      {session.gameMode === "BATTLE" ? (
        <section className="live-battle" aria-label="Battle-Aktionen">
          <div className="live-battle__charge">
            <span>Battle-Ladung</span>
            <progress max="100" value={charge}>
              {charge}%
            </progress>
            <strong>{charge}%</strong>
          </div>
          <div className="live-battle__actions">
            {session.battleOptions.ink ? (
              <button disabled={charge < 100} onClick={() => setPicker("ink")}>
                Tinte
              </button>
            ) : null}
            {session.battleOptions.flicker ? (
              <button
                disabled={charge < 100}
                onClick={() => setPicker("flicker")}
              >
                Flimmern
              </button>
            ) : null}
            <button
              disabled={charge < 100}
              aria-pressed={shield}
              onClick={() => {
                setShield(true);
                setCharge(0);
                setPicker(null);
                setBattleMessage("Schild aktiviert.");
              }}
            >
              Schild
            </button>
          </div>
          {picker ? (
            <div className="live-battle__targets">
              <strong>Wen möchtest du treffen?</strong>
              {Object.entries(roster)
                .filter(([name]) => name !== studentName)
                .sort(
                  ([, left], [, right]) =>
                    Math.abs(left - index) - Math.abs(right - index),
                )
                .slice(0, 3)
                .map(([name]) => (
                  <button
                    key={name}
                    onClick={() => {
                      if (onSendAttack?.(name, picker)) {
                        setCharge(0);
                        setPicker(null);
                        setBattleMessage(`Angriff auf ${name} gestartet.`);
                      }
                    }}
                  >
                    {name}
                  </button>
                ))}
              {!Object.keys(roster).some((name) => name !== studentName) ? (
                <p>Noch kein Mitspieler als Ziel sichtbar.</p>
              ) : null}
              <button className="text-button" onClick={() => setPicker(null)}>
                Abbrechen
              </button>
            </div>
          ) : null}
          {battleMessage ? <p role="status">{battleMessage}</p> : null}
        </section>
      ) : null}

      {activeAttack === "ink" ? (
        <div className="live-battle__ink" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
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
