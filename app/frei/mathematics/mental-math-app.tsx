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
  generateMentalMathTasks,
  parseMentalMathTask,
  shuffleMathTasks,
  type MathGapSlot,
  type MentalMathOperation,
  type MentalMathTask,
} from "../../../src/domain/mental-math";
import {
  classifyMentalMathError,
  mentalMathHint,
  mentalMathSolutionSteps,
} from "../../../src/domain/mental-math-feedback";
import { createDailyPlanRepository } from "../../../src/storage/daily-plan";
import {
  createMathAttempt,
  createMathPracticeRepository,
} from "../../../src/storage/math-practice";
import { PersonalLearningDatabase } from "../../../src/storage/personal-learning-events";
import {
  buildMathReviewRound,
  mathOptionsSchema,
  mathReviews,
  mathRoundReviews,
  type MathReview,
  type MathPracticeTask,
} from "../../../src/domain/math-practice";
import type { LearningEventV1 } from "../../../src/domain/learning-bundle";
import {
  PLAN_DONE_NOTICE,
  PLAN_FAILED_NOTICE,
  openModuleItems,
  wantsDailyPlan,
} from "../../lernen/plan-today";
import { Icon } from "../../ui/icons";
import {
  Button,
  ButtonLink,
  Card,
  Notice,
  ProgressBar,
  Toggle,
} from "../../ui/primitives";

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

/**
 * Art und Anzahl der erzeugten Runde in einem Satz, z. B. „12 Aufgaben · Plus
 * und Minus bis 100 · Lücken“. Die Vorschau verrät keine Lösung (Audit C-013).
 */
function describeRound(settings: {
  count: number;
  operations: readonly MentalMathOperation[];
  minValue: number;
  maxValue: number;
  tables: readonly number[];
  gapMode: boolean;
}) {
  const names = (Object.keys(operationLabels) as MentalMathOperation[])
    .filter((operation) => settings.operations.includes(operation))
    .map((operation) => operationLabels[operation]);
  const kinds =
    names.length > 1
      ? `${names.slice(0, -1).join(", ")} und ${names.at(-1)}`
      : (names[0] ?? "");
  const usesTables = settings.operations.some(
    (operation) => operation === "multiply" || operation === "divide",
  );
  const tables = settings.tables.join(", ");
  return [
    `${settings.count} ${settings.count === 1 ? "Aufgabe" : "Aufgaben"}`,
    `${kinds} ${settings.minValue > 0 ? `von ${settings.minValue} ` : ""}bis ${settings.maxValue}`,
    ...(usesTables && settings.tables.length
      ? [`${settings.tables.length === 1 ? "Reihe" : "Reihen"} ${tables}`]
      : []),
    ...(settings.gapMode ? ["Lücken"] : []),
  ].join(" · ");
}

/**
 * Posten der Tagesportion: je offenem Mathe-Element der am längsten fällige
 * Posten seiner Familie. Was inzwischen nicht mehr fällig ist, zählt nicht.
 * `buildMathReviewRound` nimmt höchstens fünf Posten; der Rest folgt in der
 * nächsten Runde.
 */
function todaysReviews(
  progress: Parameters<typeof openModuleItems>[0],
  reviews: readonly MathReview[],
  now: string,
) {
  // `mathReviews` ist nach Fälligkeit sortiert: der erste Treffer ist der älteste.
  return openModuleItems(progress, "mathematics").flatMap((item) => {
    const review = reviews.find(
      (entry) => item.objectIds.includes(entry.id) && entry.dueAt <= now,
    );
    return review ? [review] : [];
  });
}

/**
 * `random` ist der Zufall für neue Aufgaben und die Reihenfolge der Runde;
 * Tests geben einen festen Zufall vor.
 */
export function MentalMathApp({
  random = Math.random,
}: { random?: () => number } = {}) {
  const database = useMemo(() => new PersonalLearningDatabase(), []);
  const repository = useMemo(
    () => createMathPracticeRepository(database),
    [database],
  );
  const dailyPlan = useMemo(
    () => createDailyPlanRepository(database),
    [database],
  );
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
  /** Hinweis der Tagesportion: nichts mehr offen (gut) oder nicht ladbar. */
  const [planNotice, setPlanNotice] = useState<{
    text: string;
    tone: "good" | "bad";
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const localEvents = useRef<LearningEventV1[]>([]);
  const pending = useRef<LearningEventV1 | null>(null);
  const attempt = useRef(0);
  const corrected = useRef(false);
  const [helpCount, setHelpCount] = useState(0);
  const [help, setHelp] = useState(false);
  // Hinweis nach dem ersten Fehlversuch an dieser Aufgabe (D-008); der zweite
  // Fehlversuch zeigt den Lösungsweg. Gewertet wird weiter der erste Versuch.
  const [hint, setHint] = useState("");
  const wrongTries = useRef(0);
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
        if (!lesson) {
          // ?heute=1 (Startseite „Weiterlernen“): die Portion dieses Moduls.
          if (wantsDailyPlan(params)) {
            const now = new Date().toISOString();
            dailyPlan
              .progress(now)
              .then((progress) => {
                if (!active) return;
                const selected = todaysReviews(progress, all, now);
                if (selected.length) beginRound(buildMathReviewRound(selected));
                else setPlanNotice({ text: PLAN_DONE_NOTICE, tone: "good" });
              })
              .catch(() => {
                if (active)
                  setPlanNotice({ text: PLAN_FAILED_NOTICE, tone: "bad" });
              });
          }
          return;
        }
        const lessonEvents = events.filter(
          (event) => event.roundId === lesson && event.math,
        );
        // „Mehr üben“ nimmt alle Aufgaben der Runde, „Fehler“ nur die
        // fehlerhaften; saubere Aufgaben sind sonst kein Wiederholungsposten.
        const selected =
          params.get("mode") === "errors"
            ? mathReviews(lessonEvents).filter((review) => review.errors > 0)
            : mathRoundReviews(lessonEvents);
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
  }, [dailyPlan, repository]);

  function beginRound(next: MathPracticeTask[]) {
    if (!next.length) return;
    roundId.current = crypto.randomUUID();
    attempt.current = 0;
    corrected.current = false;
    pending.current = null;
    wrongTries.current = 0;
    setHint("");
    setHelp(false);
    setTasks(next);
    setIndex(0);
    setAnswer("");
    setFeedback("");
    setMistakes(0);
    setHelpCount(0);
    setNotice("");
    setPlanNotice(null);
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

  function createTasks() {
    return generateMentalMathTasks(
      {
        operations,
        minValue,
        maxValue,
        count,
        allowNegativeResults: allowNegative,
        excludeZeroOperand,
        excludeZeroResult,
        multiplicationTables: tables,
        gapMode,
        ...(gapMode && gapPosition !== "mixed"
          ? {
              gapSlots: Array.from({ length: count }, () => gapPosition),
            }
          : {}),
      },
      random,
    );
  }

  /** Erzeugt die Aufgaben der Vorschau neu (nur Anzahl und Art sind sichtbar). */
  function prepareTasks() {
    try {
      mathOptionsSchema.parse({ operations, minValue, maxValue, count });
      setPreparedTasks(createTasks());
      setPreparedSettings(settingsKey);
      setNotice("");
    } catch {
      setNotice("Bitte wähle einen gültigen Zahlenraum.");
    }
  }

  function startRound() {
    try {
      mathOptionsSchema.parse({ operations, minValue, maxValue, count });
      // Die Runde mischt die Reihenfolge der erzeugten Aufgaben neu; eigene
      // Aufgaben bleiben in der Reihenfolge, in der sie eingegeben wurden.
      beginRound(
        manualMode
          ? manualTasks.slice(0, 50)
          : shuffleMathTasks(
              matchingPreparedTasks.length
                ? matchingPreparedTasks
                : createTasks(),
              random,
            ),
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

  /** Lösungsweg zeigen: zählt wie bisher als Hilfe, die Aufgabe bleibt zur Wiederholung. */
  function showSolution() {
    pending.current = null;
    if (!help) setHelpCount((value) => value + 1);
    setHelp(true);
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
        wrongTries.current += 1;
        setMistakes((value) => value + 1);
        setFeedback("incorrect");
        if (wrongTries.current === 1)
          setHint(
            mentalMathHint(current, classifyMentalMathError(current, answer)),
          );
        else if (!help) showSolution();
        inputRef.current?.select();
      } else {
        setFeedback("correct");
        nextTimer.current = window.setTimeout(() => {
          if (index + 1 >= tasks.length) setScreen("complete");
          else setIndex((value) => value + 1);
          setAnswer("");
          setFeedback("");
          setHelp(false);
          setHint("");
          wrongTries.current = 0;
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
    const preview = manualMode ? manualTasks : matchingPreparedTasks;
    return (
      <section
        className="ui-page ui-stack ui-math"
        aria-labelledby="math-title"
      >
        <div className="ui-stack" style={{ ["--gap" as string]: "4px" }}>
          <p className="ui-eyebrow">Mathematik · Grundkompetenz</p>
          <h1 id="math-title" className="ui-h-page">
            Kopfrechnen
          </h1>
          <p className="ui-small ui-muted">
            Stelle genau die Aufgaben zusammen, die du üben möchtest. Alle
            Zahlen und Ergebnisse bleiben in deinem gewählten Zahlenraum.
          </p>
        </div>

        <Card
          look="dark"
          className="ui-stack ui-on-dark"
          aria-labelledby="math-review-title"
        >
          <h2 id="math-review-title" className="ui-h-section">
            Heute üben
          </h2>
          {loadState === "loading" ? (
            <p className="ui-small" role="status">
              Deine Aufgaben werden geladen.
            </p>
          ) : null}
          {loadState === "error" ? (
            <p className="ui-notice ui-notice--bad" role="alert">
              Deine gespeicherten Aufgaben konnten nicht geladen werden. Bitte
              lade die Seite erneut.
            </p>
          ) : null}
          {loadState === "ready" ? (
            <>
              {planNotice ? (
                // Auf der dunklen Karte bleibt der gute Hinweis schlichter Text.
                <p
                  className={
                    planNotice.tone === "bad"
                      ? "ui-notice ui-notice--bad"
                      : "ui-small"
                  }
                  role="status"
                >
                  {planNotice.text}
                </p>
              ) : null}
              <p className="ui-small">
                {due.length
                  ? due.length === 1
                    ? "Eine Aufgabe wartet auf dich."
                    : `${due.length} Aufgaben warten auf dich.`
                  : reviews.length
                    ? "Für heute ist alles geübt. Deine Aufgaben kommen später wieder."
                    : "Hier erscheinen deine Fehler und Wiederholungen."}
              </p>
              {due.length ? (
                <Button variant="gold" onClick={startErrorPractice}>
                  Meine Fehler und Wiederholungen üben
                </Button>
              ) : null}
              <p className="ui-tiny ui-muted">
                Deine Antworten bleiben auf diesem Gerät. Nutze auf gemeinsam
                genutzten Geräten ein eigenes Browserprofil.
              </p>
            </>
          ) : null}
          {notice ? (
            <p className="ui-notice ui-notice--bad" role="alert">
              {notice}
            </p>
          ) : null}
        </Card>

        <div className="ui-math__layout">
          <Card
            look="pop"
            className="ui-stack"
            aria-labelledby="math-round-title"
          >
            <div className="ui-between">
              <div>
                <p className="ui-eyebrow">Aufgaben erzeugen</p>
                <h2 id="math-round-title" className="ui-h-section">
                  Deine Runde
                </h2>
              </div>
              <Button
                variant="link"
                aria-pressed={manualMode}
                onClick={() => setManualMode((value) => !value)}
              >
                {manualMode ? "Zufallsgenerator" : "Eigene Aufgaben"}
              </Button>
            </div>
            {manualMode ? (
              <>
                <label
                  className="ui-stack ui-label"
                  style={{ ["--gap" as string]: "6px" }}
                >
                  Eine Aufgabe pro Zeile
                  <textarea
                    className="ui-textarea"
                    rows={8}
                    value={manualSource}
                    onChange={(event) => setManualSource(event.target.value)}
                    placeholder={"7 + 8\n20 : 4\n\\frac{3}{4} + \\frac{1}{4}"}
                  />
                </label>
                <p className="ui-small ui-muted">
                  {manualTasks.length} gültige Aufgaben · Grundrechenarten,
                  Klammern, Potenzen, Brüche und Wurzeln
                </p>
              </>
            ) : (
              <>
                <fieldset className="ui-math__fieldset">
                  <legend className="ui-label">Rechenarten</legend>
                  <div
                    className="ui-grid-auto"
                    style={{
                      ["--min" as string]: "120px",
                      ["--gap" as string]: "8px",
                    }}
                  >
                    {(
                      Object.keys(operationLabels) as MentalMathOperation[]
                    ).map((operation) => (
                      <button
                        type="button"
                        className="ui-select-card ui-math__op"
                        aria-pressed={operations.includes(operation)}
                        disabled={!interactionReady}
                        key={operation}
                        onClick={() => toggleOperation(operation)}
                      >
                        <span className="ui-math__symbol" aria-hidden="true">
                          {symbols[operation]}
                        </span>
                        {operationLabels[operation]}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="ui-grid3">
                  <label
                    className="ui-stack ui-label"
                    style={{ ["--gap" as string]: "6px" }}
                  >
                    Von
                    <input
                      className="ui-input"
                      type="number"
                      value={minValue}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setMinValue(value);
                        if (value > maxValue) setMaxValue(value);
                      }}
                    />
                  </label>
                  <label
                    className="ui-stack ui-label"
                    style={{ ["--gap" as string]: "6px" }}
                  >
                    Bis
                    <input
                      className="ui-input"
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
                  <label
                    className="ui-stack ui-label"
                    style={{ ["--gap" as string]: "6px" }}
                  >
                    Anzahl
                    <select
                      className="ui-input"
                      value={count}
                      onChange={(event) => setCount(Number(event.target.value))}
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
                  <fieldset className="ui-math__fieldset">
                    <legend className="ui-label">
                      Einmaleins-Reihen{" "}
                      <span className="ui-muted">· nichts gewählt = alle</span>
                    </legend>
                    <div
                      className="ui-row ui-wrap"
                      style={{ ["--gap" as string]: "6px" }}
                    >
                      {MULTIPLICATION_TABLES.map((table) => (
                        <button
                          key={table}
                          type="button"
                          className="ui-chip ui-math__table"
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
                <Button variant="soft" onClick={prepareTasks}>
                  <Icon name="sparkles" size={18} />
                  Aufgaben erzeugen
                </Button>
              </>
            )}
          </Card>

          <Card
            look="soft"
            className="ui-stack"
            aria-labelledby="math-rules-title"
          >
            <p className="ui-eyebrow">Feineinstellungen</p>
            <h2 id="math-rules-title" className="ui-h-section">
              Was soll gelten?
            </h2>
            <Toggle
              label="Negative Ergebnisse zulassen"
              checked={allowNegative}
              onChange={setAllowNegative}
            />
            <Toggle
              label="0 als Rechenzahl vermeiden"
              checked={excludeZeroOperand}
              onChange={setExcludeZeroOperand}
            />
            <Toggle
              label="Ergebnis 0 vermeiden"
              checked={excludeZeroResult}
              onChange={setExcludeZeroResult}
            />
            <Toggle
              label="Lückenaufgaben"
              checked={gapMode}
              onChange={setGapMode}
            />
            {gapMode ? (
              <label
                className="ui-stack ui-label"
                style={{ ["--gap" as string]: "6px" }}
              >
                Lückenposition
                <select
                  className="ui-input"
                  value={gapPosition}
                  onChange={(event) =>
                    setGapPosition(event.target.value as MathGapSlot | "mixed")
                  }
                >
                  <option value="mixed">Gemischt</option>
                  <option value="left">Erste Zahl</option>
                  <option value="right">Zweite Zahl</option>
                  <option value="result">Ergebnis</option>
                </select>
              </label>
            ) : null}
            <span className="ui-label">Vorschau</span>
            {manualMode ? (
              preview.length ? (
                // Eigene Aufgaben hat die Person selbst geschrieben; Ergebnisse
                // zeigt die Vorschau trotzdem nicht.
                <ol className="ui-list ui-math__preview">
                  {preview.map((task) => (
                    <li key={task.id}>
                      <strong className="ui-grow">{task.prompt}</strong>
                    </li>
                  ))}
                </ol>
              ) : null
            ) : matchingPreparedTasks.length ? (
              <div className="ui-stack" style={{ ["--gap" as string]: "8px" }}>
                <p className="ui-small" role="status">
                  {describeRound({
                    count: matchingPreparedTasks.length,
                    operations,
                    minValue,
                    maxValue,
                    tables,
                    gapMode,
                  })}
                </p>
                <p className="ui-tiny ui-muted">
                  Die Aufgaben siehst du erst in der Runde, in gemischter
                  Reihenfolge.
                </p>
                <Button variant="ghost" size="sm" onClick={prepareTasks}>
                  <Icon name="refresh" size={16} />
                  Andere Aufgaben
                </Button>
              </div>
            ) : (
              <p className="ui-small ui-muted">
                Erzeuge zuerst eine Aufgabenliste oder starte direkt.
              </p>
            )}
            <Button
              size="lg"
              variant="green"
              disabled={
                !interactionReady ||
                loadState === "loading" ||
                (manualMode && !manualTasks.length)
              }
              onClick={startRound}
            >
              Runde starten
            </Button>
          </Card>
        </div>
      </section>
    );
  }

  if (screen === "complete") {
    return (
      <section className="ui-page" aria-labelledby="math-complete-title">
        <div className="ui-game__done">
          <span className="ui-game__done-ring">
            <Icon name="trophy" size={56} />
          </span>
          <p className="ui-eyebrow">Runde geschafft</p>
          <h1 id="math-complete-title" className="ui-h-fun">
            Gut gerechnet
          </h1>
          <p className="ui-small">
            Du hast {tasks.length} Aufgaben bearbeitet.{" "}
            {helpCount > 0
              ? "Du hast mit Lösungshilfe geübt. Diese Aufgaben bleiben zur Wiederholung."
              : mistakes === 0
                ? "Alle Antworten waren direkt richtig."
                : `${mistakes} Fehlversuche zeigen, was du gleich noch einmal festigen kannst.`}
          </p>
          {due.length ? (
            <Button block onClick={startErrorPractice}>
              Passende Aufgaben zu meinen Fehlern
            </Button>
          ) : null}
          <p className="ui-tiny ui-muted">
            Eine Korrektur allein reicht noch nicht. Sichere Antworten werden
            später wiederholt.
          </p>
          <div className="ui-grid2">
            <Button variant="ghost" onClick={() => setScreen("setup")}>
              Neue Runde zusammenstellen
            </Button>
            <ButtonLink variant="ghost" href="/">
              Für heute fertig
            </ButtonLink>
          </div>
        </div>
      </section>
    );
  }

  if (!current) return null;
  const solutionSteps = help ? mentalMathSolutionSteps(current) : [];
  return (
    <section className="ui-page ui-stack" aria-labelledby="math-task-title">
      <div className="ui-stack" style={{ ["--gap" as string]: "6px" }}>
        <span className="ui-small ui-muted">
          Aufgabe {index + 1} von {tasks.length}
        </span>
        <ProgressBar
          value={index}
          max={tasks.length}
          label="Fortschritt der Runde"
        />
      </div>
      <div className="ui-game__card ui-math__card">
        <p className="ui-eyebrow">Kopfrechnen</p>
        <h1 id="math-task-title" className="ui-game__prompt ui-math__task">
          {current.prompt}
        </h1>
        <form className="ui-math__answer" onSubmit={submit}>
          <label htmlFor="mental-math-answer" className="ui-sr-only">
            Dein Ergebnis
          </label>
          <input
            className={`ui-field${feedback === "correct" ? " ui-field--ok" : feedback === "incorrect" ? " ui-field--bad" : ""}`}
            disabled={saving}
            maxLength={2000}
            ref={inputRef}
            id="mental-math-answer"
            inputMode="decimal"
            autoComplete="off"
            placeholder="Ergebnis"
            value={answer}
            onChange={(event) => {
              pending.current = null;
              setAnswer(event.target.value);
              if (feedback === "incorrect") setFeedback("");
            }}
          />
          <Button type="submit" size="lg" disabled={saving}>
            Prüfen
          </Button>
        </form>
        <p
          className={`ui-math__feedback${feedback ? ` is-${feedback}` : ""}`}
          role="status"
          aria-live="polite"
        >
          {feedback === "correct" ? (
            <>
              <Icon name="check" size={20} /> Richtig
            </>
          ) : null}
          {feedback === "incorrect" ? "Noch nicht." : null}
        </p>
        {notice ? (
          <p className="ui-notice ui-notice--bad" role="alert">
            {notice}
          </p>
        ) : null}
        <div className="ui-math__help" role="status" aria-live="polite">
          {hint && !help ? (
            <p className="ui-small">
              <strong>Tipp:</strong> {hint}
            </p>
          ) : null}
          {help ? (
            <Notice>
              <p>
                <strong>So geht es:</strong>
              </p>
              <ol className="ui-math__steps">
                {solutionSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p>Rechne die nächste Aufgabe wieder ohne Hilfe.</p>
            </Notice>
          ) : null}
        </div>
        <div className="ui-row ui-wrap">
          <Button
            variant="ghost"
            size="sm"
            disabled={saving || feedback === "correct"}
            onClick={showSolution}
          >
            Lösungsweg zeigen
          </Button>
          <Button
            variant="link"
            disabled={saving}
            onClick={() => {
              window.clearTimeout(nextTimer.current);
              setScreen("setup");
            }}
          >
            Runde beenden
          </Button>
        </div>
      </div>
    </section>
  );
}
