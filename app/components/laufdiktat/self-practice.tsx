"use client";

import { useRef, useState, type FormEvent } from "react";
import { checkAnswer } from "../../../src/laufdiktat/check-answer.ts";
import { computeStars } from "../../../src/laufdiktat/scoring.ts";
import { generateMathLines, parseMathLine, type MathOp } from "../../../src/laufdiktat/math-tasks.ts";
import { initialAdaptiveState, nextAdaptiveState, generateAdaptiveTask, type AdaptiveMathState } from "../../../src/laufdiktat/adaptive-math.ts";
import type { WordItem } from "../../../src/laufdiktat/types.ts";

type Mode = "adaptive" | "manual";
type CountMode = "fixed" | "unlimited";
type Phase = "setup" | "practice" | "summary";

const MATH_OPS: Array<{ op: MathOp; label: string }> = [
  { op: "+", label: "+" },
  { op: "-", label: "−" },
  { op: "*", label: "·" },
  { op: "/", label: ":" },
];

const FIXED_COUNT_OPTIONS = [10, 20, 30];

function manualTask(ops: MathOp[], minValue: number, maxValue: number): WordItem {
  const [line] = generateMathLines({
    ops,
    minValue,
    maxValue,
    count: 1,
    allowNegativeResults: false,
    excludeZeroOperand: false,
    excludeZeroResult: false,
    multiplicationTables: [],
  });
  const word = parseMathLine(line);
  if (!word) throw new Error("manualTask: generated an unparsable line");
  return word;
}

export function SelfPractice() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<Mode>("adaptive");
  const [manualOps, setManualOps] = useState<MathOp[]>(["+", "-"]);
  const [manualMin, setManualMin] = useState(0);
  const [manualMax, setManualMax] = useState(20);
  const [countMode, setCountMode] = useState<CountMode>("fixed");
  const [fixedCount, setFixedCount] = useState(10);

  const adaptiveStateRef = useRef<AdaptiveMathState>(initialAdaptiveState());
  const [displayLevel, setDisplayLevel] = useState(1);

  const [currentTask, setCurrentTask] = useState<WordItem | null>(null);
  const [taskNumber, setTaskNumber] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function toggleManualOp(op: MathOp) {
    setManualOps((prev) => (prev.includes(op) ? prev.filter((o) => o !== op) : [...prev, op]));
  }

  function nextTask() {
    const task = mode === "adaptive" ? generateAdaptiveTask(adaptiveStateRef.current) : manualTask(manualOps, manualMin, manualMax);
    setCurrentTask(task);
    setInputValue("");
    setTimeout(() => inputRef.current?.focus(), 10);
  }

  function start() {
    adaptiveStateRef.current = initialAdaptiveState();
    setDisplayLevel(1);
    setTaskNumber(1);
    setAnsweredCount(0);
    setCorrectCount(0);
    setPhase("practice");
    nextTask();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!currentTask) return;
    const correct = checkAnswer(currentTask, inputValue);
    setFeedback(correct ? "correct" : "wrong");
    setTimeout(() => setFeedback(null), 350);
    setAnsweredCount((n) => n + 1);
    if (correct) setCorrectCount((c) => c + 1);

    if (mode === "adaptive") {
      adaptiveStateRef.current = nextAdaptiveState(adaptiveStateRef.current, correct);
      setDisplayLevel(adaptiveStateRef.current.level + 1);
    }

    if (countMode === "fixed" && taskNumber >= fixedCount) {
      setPhase("summary");
      return;
    }
    setTaskNumber((n) => n + 1);
    nextTask();
  }

  function reset() {
    setPhase("setup");
    setCurrentTask(null);
  }

  if (phase === "setup") {
    return (
      <div className="self-practice">
        <fieldset>
          <legend>Aufgaben</legend>
          <label className="self-practice__radio">
            <input type="radio" name="mode" checked={mode === "adaptive"} onChange={() => setMode("adaptive")} />
            Automatisch, passend zu deinem Können
          </label>
          <label className="self-practice__radio">
            <input type="radio" name="mode" checked={mode === "manual"} onChange={() => setMode("manual")} />
            Eigene Aufgaben erstellen
          </label>
        </fieldset>

        {mode === "manual" && (
          <fieldset>
            <legend>Einstellungen</legend>
            <div className="dashboard-app__op-picker">
              {MATH_OPS.map(({ op, label }) => (
                <label key={op}>
                  <input type="checkbox" checked={manualOps.includes(op)} onChange={() => toggleManualOp(op)} />
                  {label}
                </label>
              ))}
            </div>
            <label className="dashboard-app__field">
              Von
              <input type="number" value={manualMin} onChange={(e) => setManualMin(Number(e.target.value))} />
            </label>
            <label className="dashboard-app__field">
              Bis
              <input type="number" value={manualMax} onChange={(e) => setManualMax(Number(e.target.value))} />
            </label>
          </fieldset>
        )}

        <fieldset>
          <legend>Anzahl</legend>
          <div className="self-practice__count-picker">
            {FIXED_COUNT_OPTIONS.map((n) => (
              <label key={n} className="self-practice__radio">
                <input type="radio" name="countMode" checked={countMode === "fixed" && fixedCount === n} onChange={() => { setCountMode("fixed"); setFixedCount(n); }} />
                {n}
              </label>
            ))}
            <label className="self-practice__radio">
              <input type="radio" name="countMode" checked={countMode === "unlimited"} onChange={() => setCountMode("unlimited")} />
              Unbegrenzt
            </label>
          </div>
        </fieldset>

        <button className="button button--primary" type="button" onClick={start} disabled={mode === "manual" && manualOps.length === 0}>
          Los geht&apos;s
        </button>
      </div>
    );
  }

  if (phase === "summary") {
    const total = countMode === "fixed" ? fixedCount : answeredCount;
    const errors = total - correctCount;
    return (
      <div className="game-card">
        <p className="game-card__stars" aria-label={`${computeStars(errors, total)} von 5 Sternen`}>
          {"★".repeat(computeStars(errors, total))}{"☆".repeat(5 - computeStars(errors, total))}
        </p>
        <p>{correctCount} von {total} richtig</p>
        <button className="button button--primary" type="button" onClick={reset}>Nochmal</button>
      </div>
    );
  }

  return (
    <div className={`game-card${feedback ? ` game-card--${feedback}` : ""}`}>
      <p className="game-card__progress">
        {countMode === "fixed" ? `Aufgabe ${taskNumber} von ${fixedCount}` : `Aufgabe ${taskNumber}`}
        {mode === "adaptive" && ` · Stufe ${displayLevel}`}
      </p>
      {currentTask && (
        <form onSubmit={handleSubmit} className="game-card__form">
          <p className="game-card__word">{currentTask.prompt}</p>
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            inputMode="decimal"
            autoComplete="off"
            aria-label="Deine Antwort"
          />
          <button className="button button--primary" type="submit">Prüfen</button>
        </form>
      )}
      <button className="button button--quiet game-card__leave" type="button" onClick={() => setPhase("summary")}>Beenden</button>
    </div>
  );
}
