"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import Link from "next/link";
import { ArrowLeftIcon, CheckIcon, RefreshIcon, TrashIcon } from "./ui-icons";
import {
  MULTIPLICATION_TABLES,
  displayMathNumber,
  generateMentalMathTasks,
  parseMentalMathTask,
  type MathGapSlot,
  type MentalMathOperation,
  type MentalMathTask,
} from "../../src/domain/mental-math";
import {
  createMathAttempt,
  createMathPracticeRepository,
} from "../../src/storage/math-practice";
import {
  buildMathReviewRound,
  mathOptionsSchema,
  mathReviews,
  type MathReview,
  type MathPracticeTask,
} from "../../src/domain/math-practice";
import type { LearningEventV1 } from "../../src/domain/learning-bundle";

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
  const repository = useMemo(() => createMathPracticeRepository(), []);
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
  const [preparedSettings, setPreparedSettings] = useState("");
  const settingsKey = JSON.stringify([
    operations,
    minValue,
    maxValue,
    count,
    allowNegative,
    excludeZeroOperand,
    excludeZeroResult,
    tables,
    gapMode,
    gapPosition,
  ]);
  const matchingPreparedTasks =
    preparedSettings === settingsKey ? preparedTasks : [];
  const [tasks, setTasks] = useState<MathPracticeTask[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | "">("");
  const [mistakes, setMistakes] = useState(0);
  const [reviews, setReviews] = useState<MathReview[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const localEvents = useRef<LearningEventV1[]>([]);
  const pending = useRef<LearningEventV1 | null>(null);
  const attempt = useRef(0);
  const corrected = useRef(false);
  const [helpCount, setHelpCount] = useState(0);
  const [help, setHelp] = useState(false);
  const nextTimer = useRef(0);
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
  const due = reviews.filter(
    (review) => review.dueAt <= new Date().toISOString(),
  );

  useEffect(() => {
    let active = true;
    repository
      .list()
      .then((events) => {
        if (!active) return;
        localEvents.current = events;
        const all = mathReviews(events);
        setReviews(all);
        setLoadState("ready");
        const params = new URLSearchParams(window.location.search);
        const lesson = params.get("round");
        if (!lesson) return;
        const lessonEvents = events.filter(
          (event) => event.roundId === lesson && event.math,
        );
        const selected = mathReviews(lessonEvents).filter(
          (review) => params.get("mode") !== "errors" || review.errors > 0,
        );
        if (selected.length)
          beginRound(
            buildMathReviewRound(
              selected,
              Math.random,
              params.get("mode") !== "more",
            ),
          );
        else
          setNotice(
            "Für diese Runde sind hier keine Aufgaben gespeichert. Du kannst eine eigene Runde starten.",
          );
      })
      .catch(() => {
        if (active) setLoadState("error");
      });
    return () => {
      active = false;
      window.clearTimeout(nextTimer.current);
    };
  }, [repository]);

  function beginRound(next: MathPracticeTask[]) {
    if (!next.length) return;
    roundId.current = crypto.randomUUID();
    attempt.current = 0;
    corrected.current = false;
    pending.current = null;
    setHelp(false);
    setTasks(next);
    setIndex(0);
    setAnswer("");
    setFeedback("");
    setMistakes(0);
    setHelpCount(0);
    setNotice("");
    setScreen("round");
  }

  useEffect(() => {
    if (screen === "round" && current && !saving) inputRef.current?.focus();
  }, [current, screen, saving]);

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
    try {
      mathOptionsSchema.parse({ operations, minValue, maxValue, count });
      beginRound(
        manualMode
          ? manualTasks.slice(0, 50)
          : matchingPreparedTasks.length
            ? matchingPreparedTasks
            : createTasks(),
      );
    } catch {
      setNotice(
        "Keine passenden Aufgaben. Bitte prüfe Zahlenraum, Rechenarten und Nullregeln.",
      );
    }
  }

  function startErrorPractice() {
    beginRound(buildMathReviewRound(due));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current || !answer.trim() || feedback === "correct" || busy.current)
      return;
    busy.current = true;
    setSaving(true);
    setNotice("");
    try {
      pending.current ??= await createMathAttempt({
        task: current,
        ...(!current.practiceKey && !manualMode
          ? {
              options: {
                operations,
                minValue,
                maxValue,
                count,
                allowNegativeResults: allowNegative,
                excludeZeroOperand,
                excludeZeroResult,
                multiplicationTables: tables,
                gapMode,
              },
            }
          : {}),
        answer,
        roundId: roundId.current,
        attemptId: String(attempt.current),
        selfCorrected: corrected.current,
        usedHelp: help,
      });
      await repository.put(pending.current);
      const correct = pending.current.assessment.knowledge === "correct";
      localEvents.current = [
        ...localEvents.current.filter(
          (event) => event.id !== pending.current!.id,
        ),
        pending.current,
      ];
      setReviews(mathReviews(localEvents.current));
      pending.current = null;
      attempt.current += 1;
      if (!correct) {
        corrected.current = true;
        setMistakes((value) => value + 1);
        setFeedback("incorrect");
        inputRef.current?.select();
      } else {
        setFeedback("correct");
        nextTimer.current = window.setTimeout(() => {
          if (index + 1 >= tasks.length) setScreen("complete");
          else setIndex((value) => value + 1);
          setAnswer("");
          setFeedback("");
          setHelp(false);
          corrected.current = false;
        }, 450);
      }
    } catch {
      setNotice(
        "Nicht gespeichert. Deine Eingabe bleibt erhalten. Bitte erneut prüfen.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
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
          <section
            className="math-review-panel"
            aria-labelledby="math-review-title"
          >
            <h2 id="math-review-title">Heute üben</h2>
            {loadState === "loading" ? (
              <p role="status">Deine Aufgaben werden geladen.</p>
            ) : null}
            {loadState === "error" ? (
              <p role="alert">
                Deine gespeicherten Aufgaben konnten nicht geladen werden. Bitte
                lade die Seite erneut.
              </p>
            ) : null}
            {loadState === "ready" ? (
              <>
                <p>
                  {due.length
                    ? due.length === 1
                      ? "Eine Aufgabe wartet auf dich."
                      : `${due.length} Aufgaben warten auf dich.`
                    : reviews.length
                      ? "Für heute ist alles geübt. Deine Aufgaben kommen später wieder."
                      : "Hier erscheinen deine Fehler und Wiederholungen."}
                </p>
                {due.length ? (
                  <button
                    className="button button--primary"
                    onClick={startErrorPractice}
                  >
                    Meine Fehler und Wiederholungen üben
                  </button>
                ) : null}
                <p>
                  Deine Antworten bleiben auf diesem Gerät. Nutze auf gemeinsam
                  genutzten Geräten ein eigenes Browserprofil.
                </p>
              </>
            ) : null}
            {notice ? <p role="alert">{notice}</p> : null}
          </section>
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
                      onClick={() => {
                        try {
                          mathOptionsSchema.parse({
                            operations,
                            minValue,
                            maxValue,
                            count,
                          });
                          setPreparedTasks(createTasks());
                          setPreparedSettings(settingsKey);
                          setNotice("");
                        } catch {
                          setNotice("Bitte wähle einen gültigen Zahlenraum.");
                        }
                      }}
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
                {(manualMode ? manualTasks : matchingPreparedTasks).map(
                  (task) => (
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
                            <RefreshIcon aria-hidden="true" />
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
                            <TrashIcon aria-hidden="true" />
                          </button>
                        </span>
                      ) : null}
                    </div>
                  ),
                )}
                {!manualMode && !matchingPreparedTasks.length ? (
                  <p>Erzeuge zuerst eine Aufgabenliste oder starte direkt.</p>
                ) : null}
              </div>
              <button
                className="button button--primary"
                disabled={
                  !interactionReady ||
                  loadState === "loading" ||
                  (manualMode && !manualTasks.length)
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
            {helpCount > 0
              ? "Du hast mit Lösungshilfe geübt. Diese Aufgaben bleiben zur Wiederholung."
              : mistakes === 0
                ? "Alle Antworten waren direkt richtig."
                : `${mistakes} Fehlversuche zeigen, was du gleich noch einmal festigen kannst.`}
          </p>
          {due.length ? (
            <button
              className="button button--primary"
              onClick={startErrorPractice}
            >
              Passende Aufgaben zu meinen Fehlern
            </button>
          ) : null}
          <p>
            Eine Korrektur allein reicht noch nicht. Sichere Antworten werden
            später wiederholt.
          </p>
          <button
            className="button button--quiet"
            onClick={() => setScreen("setup")}
          >
            Neue Runde zusammenstellen
          </button>
          <Link className="button button--quiet" href="/">
            Für heute fertig
          </Link>
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
            disabled={saving}
            maxLength={2000}
            ref={inputRef}
            id="mental-math-answer"
            inputMode="decimal"
            autoComplete="off"
            value={answer}
            onChange={(event) => {
              pending.current = null;
              setAnswer(event.target.value);
              if (feedback === "incorrect") setFeedback("");
            }}
          />
          <button
            className="button button--primary"
            type="submit"
            disabled={saving}
          >
            Prüfen
          </button>
        </form>
        {notice ? <p role="alert">{notice}</p> : null}
        <button
          className="button button--quiet"
          disabled={saving || feedback === "correct"}
          onClick={() => {
            pending.current = null;
            if (!help) setHelpCount((value) => value + 1);
            setHelp(true);
          }}
        >
          Lösung ansehen
        </button>
        {help ? (
          <p role="status">
            Die Lösung ist {displayMathNumber(current.answer)}. Rechne die
            nächste Aufgabe wieder ohne Hilfe.
          </p>
        ) : null}
        <button
          className="text-button"
          disabled={saving}
          onClick={() => {
            window.clearTimeout(nextTimer.current);
            setScreen("setup");
          }}
        >
          Runde beenden
        </button>
        <div
          className={`mental-math-feedback ${feedback}`}
          role="status"
          aria-live="polite"
        >
          {feedback === "correct" ? (
            <>
              <CheckIcon aria-hidden="true" /> Richtig
            </>
          ) : null}
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
        <a href="/" className="back-link">
          <ArrowLeftIcon aria-hidden="true" /> Startseite
        </a>
        <span className="ranking-note">Lernstand bleibt lokal</span>
      </header>
      {children}
    </main>
  );
}
