"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  checkMentalMathAnswer,
  generateMentalMathTasks,
  type MentalMathOperation,
  type MentalMathTask,
} from "../../src/domain/mental-math";
import { createPersonalLearningEventRepository } from "../../src/storage/personal-learning-events";

const operationLabels: Record<MentalMathOperation, string> = {
  add: "Plus",
  subtract: "Minus",
  multiply: "Mal",
  divide: "Geteilt",
};

export function MentalMathApp() {
  const repository = useMemo(() => createPersonalLearningEventRepository(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const roundId = useRef("");
  const [operations, setOperations] = useState<MentalMathOperation[]>([
    "add",
    "subtract",
  ]);
  const [maxValue, setMaxValue] = useState(20);
  const [count, setCount] = useState(10);
  const [tasks, setTasks] = useState<MentalMathTask[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | "">("");
  const [mistakes, setMistakes] = useState(0);
  const interactionReady = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const current = tasks[index];
  const complete = tasks.length > 0 && index >= tasks.length;

  useEffect(() => {
    if (current && !complete) inputRef.current?.focus();
  }, [current, complete]);

  function toggleOperation(operation: MentalMathOperation) {
    setOperations((active) =>
      active.includes(operation)
        ? active.length === 1
          ? active
          : active.filter((entry) => entry !== operation)
        : [...active, operation],
    );
  }

  function startRound() {
    roundId.current = crypto.randomUUID();
    setTasks(generateMentalMathTasks({ operations, maxValue, count }));
    setIndex(0);
    setAnswer("");
    setFeedback("");
    setMistakes(0);
  }

  function saveResult(task: MentalMathTask, correct: boolean) {
    void repository.put({
      id: crypto.randomUUID(),
      learningObjectId: task.skillId,
      occurredAt: new Date().toISOString(),
      source: "lesson",
      roundId: roundId.current,
      direction: "prompt-to-answer",
      answerMode: "typed",
      help: "none",
      assessment: {
        knowledge: correct ? "correct" : "incorrect",
        writing: "not-assessed",
        selfCorrected: false,
      },
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current || !answer.trim() || feedback === "correct") return;
    const correct = checkMentalMathAnswer(current, answer);
    saveResult(current, correct);
    if (!correct) {
      setMistakes((value) => value + 1);
      setFeedback("incorrect");
      inputRef.current?.select();
      return;
    }

    setFeedback("correct");
    window.setTimeout(() => {
      setIndex((value) => value + 1);
      setAnswer("");
      setFeedback("");
    }, 500);
  }

  if (!tasks.length) {
    return (
      <MentalMathShell>
        <section className="mental-math-setup" aria-labelledby="math-title">
          <p className="eyebrow">Mathematik · Grundkompetenz</p>
          <h1 id="math-title">Kopfrechnen</h1>
          <p>
            Stelle eine kurze Runde zusammen. Die Aufgabenlogik stammt aus dem
            Kopfrechenbereich des Laufdiktats und bleibt immer im gewählten
            Zahlenraum.
          </p>
          <fieldset>
            <legend>Rechenarten</legend>
            <div className="mental-math-options">
              {(Object.keys(operationLabels) as MentalMathOperation[]).map(
                (operation) => (
                  <button
                    type="button"
                    aria-pressed={operations.includes(operation)}
                    disabled={!interactionReady}
                    key={operation}
                    onClick={() => toggleOperation(operation)}
                  >
                    {operationLabels[operation]}
                  </button>
                ),
              )}
            </div>
          </fieldset>
          <div className="mental-math-settings">
            <label>
              Zahlenraum bis
              <select
                value={maxValue}
                onChange={(event) => setMaxValue(Number(event.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
            <label>
              Aufgaben
              <select
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </label>
          </div>
          <button
            className="button button--primary"
            disabled={!interactionReady}
            onClick={startRound}
          >
            Runde starten
          </button>
        </section>
      </MentalMathShell>
    );
  }

  if (complete) {
    return (
      <MentalMathShell>
        <section
          className="mental-math-complete"
          aria-labelledby="math-complete-title"
        >
          <p className="eyebrow">Runde geschafft</p>
          <h1 id="math-complete-title">Gut gerechnet</h1>
          <p>
            Du hast {tasks.length} Aufgaben bearbeitet.{" "}
            {mistakes === 0
              ? "Alle Antworten waren direkt richtig."
              : `${mistakes} Fehlversuche helfen bei der nächsten passenden Runde.`}
          </p>
          <button className="button button--primary" onClick={startRound}>
            Noch eine Runde
          </button>
        </section>
      </MentalMathShell>
    );
  }

  if (!current) return null;

  return (
    <MentalMathShell>
      <section className="mental-math-round" aria-labelledby="math-task-title">
        <div className="mental-math-progress">
          <span>
            Aufgabe {index + 1} von {tasks.length}
          </span>
          <progress value={index} max={tasks.length} />
        </div>
        <p className="eyebrow">Kopfrechnen</p>
        <h1 id="math-task-title">{current.prompt}</h1>
        <form onSubmit={submit}>
          <label htmlFor="mental-math-answer">Dein Ergebnis</label>
          <input
            ref={inputRef}
            id="mental-math-answer"
            inputMode="decimal"
            autoComplete="off"
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value);
              if (feedback === "incorrect") setFeedback("");
            }}
          />
          <button className="button button--primary" type="submit">
            Prüfen
          </button>
        </form>
        <div
          className={`mental-math-feedback ${feedback}`}
          role="status"
          aria-live="polite"
        >
          {feedback === "correct" ? "✓ Richtig" : null}
          {feedback === "incorrect" ? "Noch nicht – probiere es erneut." : null}
        </div>
      </section>
    </MentalMathShell>
  );
}

function MentalMathShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mental-math-shell">
      <header className="class-topbar">
        <Link href="/frei" className="back-link">
          ← Freies Üben
        </Link>
        <span className="ranking-note">Lernstand bleibt lokal</span>
      </header>
      {children}
    </main>
  );
}
