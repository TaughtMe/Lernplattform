"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  MULTIPLICATION_TABLES,
  checkMentalMathAnswer,
  displayMathNumber,
  generateMentalMathTasks,
  parseMentalMathTask,
  type MathGapSlot,
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
const symbols: Record<MentalMathOperation, string> = {
  add: "+",
  subtract: "−",
  multiply: "·",
  divide: ":",
};
type Screen = "setup" | "round" | "complete";

export function MentalMathApp() {
  const repository = useMemo(() => createPersonalLearningEventRepository(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const roundId = useRef("");
  const [screen, setScreen] = useState<Screen>("setup");
  const [operations, setOperations] = useState<MentalMathOperation[]>([
    "add",
    "subtract",
  ]);
  const [minValue, setMinValue] = useState(0);
  const [maxValue, setMaxValue] = useState(20);
  const [count, setCount] = useState(10);
  const [allowNegative, setAllowNegative] = useState(false);
  const [excludeZeroOperand, setExcludeZeroOperand] = useState(false);
  const [excludeZeroResult, setExcludeZeroResult] = useState(false);
  const [tables, setTables] = useState<number[]>([]);
  const [gapMode, setGapMode] = useState(false);
  const [gapPosition, setGapPosition] = useState<MathGapSlot | "mixed">(
    "mixed",
  );
  const [manualMode, setManualMode] = useState(false);
  const [manualSource, setManualSource] = useState(
    "7 + 8\n16 − 9\n6 · 7\n36 : 4",
  );
  const [preparedTasks, setPreparedTasks] = useState<MentalMathTask[]>([]);
  const [tasks, setTasks] = useState<MentalMathTask[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | "">("");
  const [mistakes, setMistakes] = useState(0);
  const [roundErrors, setRoundErrors] = useState<MentalMathTask[]>([]);
  const interactionReady = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const manualTasks = useMemo(
    () =>
      manualSource
        .split(/\r?\n/)
        .map((line, taskIndex) =>
          parseMentalMathTask(
            line,
            taskIndex,
            gapMode
              ? gapPosition === "mixed"
                ? (["left", "right", "result"] as const)[taskIndex % 3]
                : gapPosition
              : undefined,
          ),
        )
        .filter((task): task is MentalMathTask => task !== null),
    [gapMode, gapPosition, manualSource],
  );
  const current = tasks[index];

  useEffect(() => {
    if (screen === "round" && current) inputRef.current?.focus();
  }, [current, screen]);

  function toggleOperation(operation: MentalMathOperation) {
    setOperations((active) =>
      active.includes(operation)
        ? active.length === 1
          ? active
          : active.filter((entry) => entry !== operation)
        : [...active, operation],
    );
  }

  function createTasks(single = false) {
    return generateMentalMathTasks({
      operations,
      minValue,
      maxValue,
      count: single ? 1 : count,
      allowNegativeResults: allowNegative,
      excludeZeroOperand,
      excludeZeroResult,
      multiplicationTables: tables,
      gapMode,
      ...(gapMode && gapPosition !== "mixed"
        ? {
            gapSlots: Array.from(
              { length: single ? 1 : count },
              () => gapPosition,
            ),
          }
        : {}),
    });
  }

  function startRound() {
    const nextTasks = manualMode
      ? manualTasks
      : preparedTasks.length
        ? preparedTasks
        : createTasks();
    if (!nextTasks.length) return;
    roundId.current = crypto.randomUUID();
    setTasks(nextTasks);
    setIndex(0);
    setAnswer("");
    setFeedback("");
    setMistakes(0);
    setRoundErrors([]);
    setScreen("round");
  }

  function startErrorPractice() {
    const errorOperations = Array.from(
      new Set(
        roundErrors
          .map((task) => task.operation)
          .filter(
            (operation): operation is MentalMathOperation =>
              operation !== "mixed-expression",
          ),
      ),
    );
    const nextTasks = errorOperations.length
      ? generateMentalMathTasks({
          operations: errorOperations,
          minValue,
          maxValue,
          count: Math.max(5, roundErrors.length * 2),
          allowNegativeResults: allowNegative,
          excludeZeroOperand,
          excludeZeroResult,
          multiplicationTables: tables,
          gapMode,
          ...(gapMode && gapPosition !== "mixed"
            ? {
                gapSlots: Array.from(
                  { length: Math.max(5, roundErrors.length * 2) },
                  () => gapPosition,
                ),
              }
            : {}),
        })
      : roundErrors;
    setTasks(nextTasks);
    setIndex(0);
    setAnswer("");
    setFeedback("");
    setRoundErrors([]);
    setScreen("round");
  }

  function saveResult(task: MentalMathTask, correct: boolean) {
    void repository.put({
      id: crypto.randomUUID(),
      learningObjectId: `${task.skillId}:range-${maxValue}`,
      occurredAt: new Date().toISOString(),
      source: "lesson",
      learningArea: "mathematics",
      roundId: roundId.current,
      direction: "prompt-to-answer",
      answerMode: "typed",
      help: "none",
      practice: {
        title: "Passende Kopfrechenaufgaben",
        route: "/frei/mathematics",
      },
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
      setRoundErrors((errors) =>
        errors.some((task) => task.id === current.id)
          ? errors
          : [...errors, current],
      );
      setFeedback("incorrect");
      inputRef.current?.select();
      return;
    }
    setFeedback("correct");
    window.setTimeout(() => {
      if (index + 1 >= tasks.length) setScreen("complete");
      else setIndex((value) => value + 1);
      setAnswer("");
      setFeedback("");
    }, 450);
  }

  if (screen === "setup") {
    return (
      <MentalMathShell>
        <section className="mental-math-studio" aria-labelledby="math-title">
          <div className="mental-math-studio__intro">
            <p className="eyebrow">Mathematik · Grundkompetenz</p>
            <h1 id="math-title">Kopfrechnen</h1>
            <p>
              Stelle genau die Aufgaben zusammen, die du üben möchtest. Alle
              Zahlen und Ergebnisse bleiben in deinem gewählten Zahlenraum.
            </p>
          </div>
          <div className="mental-math-studio__layout">
            <section className="mental-math-generator">
              <div className="mental-math-generator__header">
                <div>
                  <p className="eyebrow">Aufgaben erzeugen</p>
                  <h2>Deine Runde</h2>
                </div>
                <button
                  type="button"
                  className="text-button"
                  aria-pressed={manualMode}
                  onClick={() => setManualMode((value) => !value)}
                >
                  {manualMode ? "Zufallsgenerator" : "Eigene Aufgaben"}
                </button>
              </div>
              {manualMode ? (
                <>
                  <label className="mental-math-manual">
                    Eine Aufgabe pro Zeile
                    <textarea
                      value={manualSource}
                      onChange={(event) => setManualSource(event.target.value)}
                      placeholder={"7 + 8\n20 : 4\n\\frac{3}{4} + \\frac{1}{4}"}
                    />
                  </label>
                  <p className="mental-math-validity">
                    {manualTasks.length} gültige Aufgaben · Grundrechenarten,
                    Klammern, Potenzen, Brüche und Wurzeln
                  </p>
                </>
              ) : (
                <>
                  <fieldset>
                    <legend>Rechenarten</legend>
                    <div className="mental-math-options">
                      {(
                        Object.keys(operationLabels) as MentalMathOperation[]
                      ).map((operation) => (
                        <button
                          type="button"
                          aria-pressed={operations.includes(operation)}
                          disabled={!interactionReady}
                          key={operation}
                          onClick={() => toggleOperation(operation)}
                        >
                          <span>{symbols[operation]}</span>
                          {operationLabels[operation]}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <div className="mental-math-settings">
                    <label>
                      Von
                      <input
                        type="number"
                        value={minValue}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          setMinValue(value);
                          if (value > maxValue) setMaxValue(value);
                        }}
                      />
                    </label>
                    <label>
                      Bis
                      <input
                        type="number"
                        value={maxValue}
                        min={1}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          setMaxValue(value);
                          if (value < minValue) setMinValue(value);
                        }}
                      />
                    </label>
                    <label>
                      Anzahl
                      <select
                        value={count}
                        onChange={(event) =>
                          setCount(Number(event.target.value))
                        }
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                      </select>
                    </label>
                  </div>
                  {operations.some(
                    (operation) =>
                      operation === "multiply" || operation === "divide",
                  ) ? (
                    <fieldset className="mental-math-tables">
                      <legend>
                        Einmaleins-Reihen <small>Nichts gewählt = alle</small>
                      </legend>
                      <div>
                        {MULTIPLICATION_TABLES.map((table) => (
                          <button
                            key={table}
                            type="button"
                            aria-pressed={tables.includes(table)}
                            onClick={() =>
                              setTables((active) =>
                                active.includes(table)
                                  ? active.filter((entry) => entry !== table)
                                  : [...active, table].sort(
                                      (left, right) => left - right,
                                    ),
                              )
                            }
                          >
                            {table}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  ) : null}
                  <div className="mental-math-generate-row">
                    <button
                      type="button"
                      className="button button--quiet"
                      onClick={() => setPreparedTasks(createTasks())}
                    >
                      Aufgaben erzeugen
                    </button>
                  </div>
                </>
              )}
            </section>
            <aside className="mental-math-rules">
              <p className="eyebrow">Feineinstellungen</p>
              <h2>Was soll gelten?</h2>
              <Check
                label="Negative Ergebnisse zulassen"
                checked={allowNegative}
                set={setAllowNegative}
              />
              <Check
                label="0 als Rechenzahl vermeiden"
                checked={excludeZeroOperand}
                set={setExcludeZeroOperand}
              />
              <Check
                label="Ergebnis 0 vermeiden"
                checked={excludeZeroResult}
                set={setExcludeZeroResult}
              />
              <Check
                label="Lückenaufgaben"
                checked={gapMode}
                set={setGapMode}
              />
              {gapMode ? (
                <label className="mental-math-gap-position">
                  Lückenposition
                  <select
                    value={gapPosition}
                    onChange={(event) =>
                      setGapPosition(
                        event.target.value as MathGapSlot | "mixed",
                      )
                    }
                  >
                    <option value="mixed">Gemischt</option>
                    <option value="left">Erste Zahl</option>
                    <option value="right">Zweite Zahl</option>
                    <option value="result">Ergebnis</option>
                  </select>
                </label>
              ) : null}
              <div className="mental-math-preview">
                <span>Vorschau</span>
                {(manualMode ? manualTasks : preparedTasks).map((task) => (
                  <div key={task.id}>
                    <strong>{task.prompt}</strong>
                    <small>= {displayMathNumber(task.answer)}</small>
                    {!manualMode ? (
                      <span className="mental-math-preview__actions">
                        <button
                          type="button"
                          aria-label={`${task.prompt} neu würfeln`}
                          onClick={() =>
                            setPreparedTasks((current) =>
                              current.map((entry) =>
                                entry.id === task.id
                                  ? (createTasks(true)[0] ?? entry)
                                  : entry,
                              ),
                            )
                          }
                        >
                          ↻
                        </button>
                        <button
                          type="button"
                          aria-label={`${task.prompt} löschen`}
                          onClick={() =>
                            setPreparedTasks((current) =>
                              current.filter((entry) => entry.id !== task.id),
                            )
                          }
                        >
                          ×
                        </button>
                      </span>
                    ) : null}
                  </div>
                ))}
                {!manualMode && !preparedTasks.length ? (
                  <p>Erzeuge zuerst eine Aufgabenliste oder starte direkt.</p>
                ) : null}
              </div>
              <button
                className="button button--primary"
                disabled={
                  !interactionReady || (manualMode && !manualTasks.length)
                }
                onClick={startRound}
              >
                Runde starten
              </button>
            </aside>
          </div>
        </section>
      </MentalMathShell>
    );
  }

  if (screen === "complete") {
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
              : `${mistakes} Fehlversuche zeigen, was du gleich noch einmal festigen kannst.`}
          </p>
          {roundErrors.length ? (
            <button
              className="button button--primary"
              onClick={startErrorPractice}
            >
              Passende Aufgaben zu meinen Fehlern
            </button>
          ) : null}
          <button
            className="button button--quiet"
            onClick={() => setScreen("setup")}
          >
            Neue Runde zusammenstellen
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

function Check({
  label,
  checked,
  set,
}: {
  label: string;
  checked: boolean;
  set: (value: boolean) => void;
}) {
  return (
    <label className="mental-math-check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => set(event.target.checked)}
      />
      {label}
    </label>
  );
}

function MentalMathShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mental-math-shell">
      <header className="class-topbar">
        {/* Native anchor keeps this client component independently testable. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/frei" className="back-link">
          ← Freies Üben
        </a>
        <span className="ranking-note">Lernstand bleibt lokal</span>
      </header>
      {children}
    </main>
  );
}
