"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  LEARNING_BUNDLE_VERSION,
  parseLearningBundleV1,
  type LearningDirection,
  type LearningEventV1,
  type VocabularyItemV1,
} from "../../src/domain/learning-bundle";
import {
  evaluateVocabularyAnswerForDirection,
  getVocabularyPrompt,
  summarizeLearningProgress,
  type VocabularyAnswerResult,
} from "../../src/domain/learning-session";
import { deriveLeitnerProgress } from "../../src/domain/leitner-schedule";
import {
  selectDueVocabularyItems,
  type VocabularySessionMode,
} from "../../src/domain/vocabulary-session";
import { createPersonalLearningEventRepository } from "../../src/storage/personal-learning-events";
import { Button, Card } from "../ui/primitives";
import { LeitnerTrack } from "./leitner-track";

const CREATED_AT = "2026-08-12T10:00:00.000Z";

const exampleBundle = parseLearningBundleV1({
  schemaVersion: LEARNING_BUNDLE_VERSION,
  id: "lernraum-school-words",
  revision: 2,
  createdAt: CREATED_AT,
  source: { kind: "teacher", id: "klasse-7b" },
  vocabulary: [
    vocabulary("school-library", "library", "Bibliothek", ["Bücherei"]),
    vocabulary("school-classroom", "classroom", "Klassenzimmer"),
    vocabulary("school-timetable", "timetable", "Stundenplan"),
    vocabulary("school-homework", "homework", "Hausaufgaben"),
    vocabulary("school-break", "break", "Pause"),
  ],
  stacks: [
    {
      id: "school-words",
      title: "Englisch · Wörter in der Schule",
      itemIds: [
        "school-library",
        "school-classroom",
        "school-timetable",
        "school-homework",
        "school-break",
      ],
      tagIds: ["school"],
    },
  ],
});

function vocabulary(
  id: string,
  prompt: string,
  answer: string,
  alternatives?: string[],
) {
  return {
    kind: "vocabulary" as const,
    id,
    prompt: { text: prompt, locale: "en" },
    answer: { text: answer, locale: "de", alternatives },
    tagIds: ["school"],
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

function firstOrThrow<T>(values: readonly T[]): T {
  const first = values[0];
  if (!first) throw new Error("Das Beispiel-Lernpaket ist unvollständig.");
  return first;
}

const stack = firstOrThrow(exampleBundle.stacks);

type Stage = "overview" | "task" | "feedback" | "complete";
type SessionStats = { correct: number; wrong: number };

const directionLabels: Record<LearningDirection, string> = {
  "prompt-to-answer": "Englisch → Deutsch",
  "answer-to-prompt": "Deutsch → Englisch",
};

export function FirstLearningRound() {
  const repository = useMemo(() => createPersonalLearningEventRepository(), []);
  const [stage, setStage] = useState<Stage>("overview");
  const [mode, setMode] = useState<VocabularySessionMode>("writing");
  const [direction, setDirection] =
    useState<LearningDirection>("prompt-to-answer");
  const [answer, setAnswer] = useState("");
  const [events, setEvents] = useState<LearningEventV1[]>([]);
  const [sessionItems, setSessionItems] = useState<VocabularyItemV1[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [roundId, setRoundId] = useState("");
  const [stats, setStats] = useState<SessionStats>({ correct: 0, wrong: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState("");
  const [lastResult, setLastResult] = useState<VocabularyAnswerResult>();

  const dueItems = selectDueVocabularyItems({
    items: exampleBundle.vocabulary,
    events,
    direction,
    mode,
    now: new Date().toISOString(),
    limit: 10,
  });
  const currentItem = sessionItems[currentIndex];
  const displayItem = currentItem ?? exampleBundle.vocabulary[0];
  if (!displayItem)
    throw new Error("Das Beispiel-Lernpaket enthält keine Karten.");
  const prompt = getVocabularyPrompt(displayItem, direction);
  const progress = summarizeLearningProgress(events, displayItem.id);
  const leitnerProgress = deriveLeitnerProgress({
    events,
    learningObjectId: displayItem.id,
    direction,
    availableAt: displayItem.createdAt,
  });
  const nextDueAt =
    leitnerProgress.knowledge.dueAt < leitnerProgress.writing.dueAt
      ? leitnerProgress.knowledge.dueAt
      : leitnerProgress.writing.dueAt;

  useEffect(() => {
    let active = true;
    repository
      .list()
      .then((storedEvents) => {
        if (active) setEvents(storedEvents);
      })
      .catch(() => {
        if (active) {
          setMessage(
            "Dein bisheriger Lernstand konnte auf diesem Gerät nicht geladen werden.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [repository]);

  function startRound() {
    const selected = selectDueVocabularyItems({
      items: exampleBundle.vocabulary,
      events,
      direction,
      mode,
      now: new Date().toISOString(),
      limit: 10,
    });
    setSessionItems(selected);
    setCurrentIndex(0);
    setRoundId(crypto.randomUUID());
    setStats({ correct: 0, wrong: 0 });
    setAnswer("");
    setLastResult(undefined);
    setRevealed(false);
    setMessage("");
    setStage(selected.length > 0 ? "task" : "complete");
  }

  async function storeResult(input: {
    knowledge: "correct" | "incorrect";
    writing: "correct" | "incorrect" | "not-assessed";
    answerMode: "typed" | "self-check";
  }) {
    if (!currentItem || saving) return;
    setSaving(true);
    setMessage("");
    const learningEvent: LearningEventV1 = {
      id: crypto.randomUUID(),
      learningObjectId: currentItem.id,
      occurredAt: new Date().toISOString(),
      source: "lesson",
      learningArea: "vocabulary",
      roundId,
      direction,
      answerMode: input.answerMode,
      help: input.answerMode === "self-check" ? "solution" : "none",
      practice: {
        title: "School words wiederholen",
        route: "/klasse/7b/aufgaben/vokabeln",
      },
      classContext: {
        classId: "klasse-7b",
        rankingEligible: true,
      },
      assessment: {
        knowledge: input.knowledge,
        writing: input.writing,
        selfCorrected: false,
      },
    };

    try {
      await repository.put(learningEvent);
      setEvents((current) => [learningEvent, ...current]);
      setStats((current) => ({
        correct: current.correct + (input.knowledge === "correct" ? 1 : 0),
        wrong: current.wrong + (input.knowledge === "incorrect" ? 1 : 0),
      }));
      setStage("feedback");
    } catch {
      setMessage(
        "Das Ergebnis konnte nicht gespeichert werden. Bitte prüfe, ob dein Browser lokalen Speicher erlaubt.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentItem || !answer.trim()) {
      setMessage("Bitte gib zuerst eine Antwort ein.");
      return;
    }

    const result = evaluateVocabularyAnswerForDirection(
      currentItem,
      answer,
      direction,
    );
    setLastResult(result);
    await storeResult({
      knowledge: result.accepted ? "correct" : "incorrect",
      writing: result.accepted ? "correct" : "incorrect",
      answerMode: "typed",
    });
  }

  async function assessRevealed(correct: boolean) {
    setLastResult({
      accepted: correct,
      expectedAnswer: prompt.expected.text,
    });
    await storeResult({
      knowledge: correct ? "correct" : "incorrect",
      writing: "not-assessed",
      answerMode: "self-check",
    });
  }

  function nextCard() {
    if (currentIndex + 1 >= sessionItems.length) {
      setStage("complete");
      return;
    }
    setCurrentIndex((current) => current + 1);
    setAnswer("");
    setLastResult(undefined);
    setRevealed(false);
    setMessage("");
    setStage("task");
  }

  return (
    <section
      className="ui-page ui-stack"
      aria-labelledby="learning-round-title"
    >
      <div className="ui-stack" style={{ ["--gap" as string]: "4px" }}>
        <p className="ui-eyebrow">Klasse 7b · Vokabelübung</p>
        <h1 id="learning-round-title" className="ui-h-page">
          School words
        </h1>
        <p className="ui-small ui-muted">
          Lerne einen ganzen Stapel in beide Richtungen. Fällige Karten werden
          automatisch ausgewählt und nach dem Leitner-Prinzip wiederholt.
        </p>
      </div>

      <div className="ui-cols ui-cols--wide-left">
        <div className="ui-card ui-card--pop ui-card--pad ui-stack">
          {stage === "overview" ? (
            <SessionOverview
              dueCount={dueItems.length}
              direction={direction}
              loading={loading}
              mode={mode}
              onDirectionChange={(value) => setDirection(value)}
              onModeChange={(value) => setMode(value)}
              onStart={startRound}
            />
          ) : null}

          {stage === "task" && currentItem ? (
            <div className="ui-stack">
              <SessionProgress
                current={currentIndex + 1}
                total={sessionItems.length}
                direction={direction}
                mode={mode}
              />
              <p className="ui-eyebrow">
                {mode === "writing" ? "Übersetze" : "Karteikarte"}
              </p>
              <h2 className="ui-h-fun" lang={prompt.question.locale}>
                {prompt.question.text}
              </h2>

              {mode === "writing" ? (
                <form className="ui-stack" onSubmit={submitAnswer} noValidate>
                  <label className="ui-labeled" htmlFor="learning-answer">
                    Deine Antwort
                  </label>
                  <input
                    id="learning-answer"
                    className="ui-field"
                    autoComplete="off"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    aria-describedby={message ? "learning-message" : undefined}
                  />
                  <Button type="submit" disabled={saving}>
                    {saving ? "Wird gespeichert …" : "Antwort prüfen"}
                  </Button>
                </form>
              ) : revealed ? (
                <div className="ui-stack" aria-live="polite">
                  <span className="ui-label">Antwort</span>
                  <strong className="ui-h-fun" lang={prompt.expected.locale}>
                    {prompt.expected.text}
                  </strong>
                  <p className="ui-small ui-muted">
                    Konntest du die Antwort selbstständig abrufen?
                  </p>
                  <div className="ui-grid2">
                    <Button
                      variant="bad"
                      onClick={() => void assessRevealed(false)}
                      disabled={saving}
                    >
                      Noch üben
                    </Button>
                    <Button
                      variant="green"
                      onClick={() => void assessRevealed(true)}
                      disabled={saving}
                    >
                      Gewusst
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setRevealed(true)}>
                  Antwort aufdecken
                </Button>
              )}

              {message ? (
                <p className="ui-notice ui-notice--bad" id="learning-message">
                  {message}
                </p>
              ) : null}
            </div>
          ) : null}

          {stage === "feedback" && lastResult ? (
            <div className="ui-stack" aria-live="polite">
              <SessionProgress
                current={currentIndex + 1}
                total={sessionItems.length}
                direction={direction}
                mode={mode}
              />
              <p className="ui-eyebrow">Ergebnis gespeichert</p>
              <h2 className="ui-h-fun">
                {lastResult.accepted ? "Richtig gelöst" : "Noch nicht richtig"}
              </h2>
              <p
                className={`ui-notice ${lastResult.accepted ? "ui-notice--good" : "ui-notice--bad"}`}
              >
                {lastResult.accepted
                  ? "Die Karte wandert nach den Lernregeln weiter."
                  : `Die passende Antwort ist „${lastResult.expectedAnswer}“. Die Karte wird gezielt wiederholt.`}
              </p>
              <Button variant="green" onClick={nextCard}>
                {currentIndex + 1 < sessionItems.length
                  ? "Nächste Karte"
                  : "Runde abschließen"}
              </Button>
            </div>
          ) : null}

          {stage === "complete" ? (
            <div className="ui-stack" aria-live="polite">
              <p className="ui-eyebrow">Runde abgeschlossen</p>
              <h2 className="ui-h-fun">
                {sessionItems.length > 0 ? "Gut gearbeitet" : "Alles erledigt"}
              </h2>
              <p className="ui-small">
                {sessionItems.length > 0
                  ? `${stats.correct} gewusst · ${stats.wrong} noch zu üben`
                  : "Für diese Auswahl ist im Moment keine Karte fällig."}
              </p>
              <div className="ui-grid2">
                <Button onClick={startRound}>Fällige Karten neu laden</Button>
                <Button variant="ghost" onClick={() => setStage("overview")}>
                  Auswahl ändern
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <Card look="soft" className="ui-stack" aria-labelledby="progress-title">
          <p className="ui-eyebrow">Lernstand</p>
          <h2 id="progress-title" className="ui-h-section">
            Deine Lernbox
          </h2>
          <p className="ui-small">
            Aktuelle Karte: <strong>{displayItem.prompt.text}</strong>
          </p>
          {loading ? (
            <p className="ui-small ui-muted">
              Gespeicherter Lernstand wird geladen …
            </p>
          ) : (
            <>
              <p className="ui-small ui-muted">
                Bedeutung und Schreiben entwickeln sich getrennt. Ein Fehler
                setzt nur den betroffenen Lernstand zurück.
              </p>
              <LeitnerTrack
                label="Bedeutung"
                currentBox={leitnerProgress.knowledge.box}
              />
              <LeitnerTrack
                label="Schreiben"
                currentBox={leitnerProgress.writing.box}
              />
              <dl className="ui-stats">
                <div>
                  <dt>Versuche</dt>
                  <dd>
                    <strong>{progress.attempts}</strong>
                  </dd>
                </div>
                <div>
                  <dt>Nächste Wiederholung</dt>
                  <dd>
                    <strong>
                      {nextDueAt <= new Date().toISOString()
                        ? "jetzt"
                        : new Intl.DateTimeFormat("de-DE", {
                            day: "2-digit",
                            month: "2-digit",
                          }).format(new Date(nextDueAt))}
                    </strong>
                  </dd>
                </div>
              </dl>
            </>
          )}
          <p className="ui-tiny ui-muted">
            Der Lernstand bleibt auf diesem Gerät und wird nicht an einen Server
            gesendet.
          </p>
        </Card>
      </div>
    </section>
  );
}

function SessionOverview({
  dueCount,
  direction,
  loading,
  mode,
  onDirectionChange,
  onModeChange,
  onStart,
}: {
  dueCount: number;
  direction: LearningDirection;
  loading: boolean;
  mode: VocabularySessionMode;
  onDirectionChange: (value: LearningDirection) => void;
  onModeChange: (value: VocabularySessionMode) => void;
  onStart: () => void;
}) {
  return (
    <div className="ui-stack">
      <p className="ui-eyebrow">Lernrunde vorbereiten</p>
      <h2 className="ui-h-section">{stack.title}</h2>
      <p className="ui-small ui-muted">
        Wähle, wie du die heute fälligen Karten bearbeiten möchtest.
      </p>

      <fieldset className="ui-checks">
        <legend>Lernmodus</legend>
        <div className="ui-grid2">
          <button
            type="button"
            className="ui-select-card"
            aria-pressed={mode === "writing"}
            onClick={() => onModeChange("writing")}
            disabled={loading}
          >
            <strong>Schreiben</strong>
            <span className="ui-small ui-muted">Antwort selbst eintippen</span>
          </button>
          <button
            type="button"
            className="ui-select-card"
            aria-pressed={mode === "self-check"}
            onClick={() => onModeChange("self-check")}
            disabled={loading}
          >
            <strong>Karteikarten</strong>
            <span className="ui-small ui-muted">
              Aufdecken und selbst bewerten
            </span>
          </button>
        </div>
      </fieldset>

      <fieldset className="ui-checks">
        <legend>Richtung</legend>
        <div className="ui-seg">
          {(Object.keys(directionLabels) as LearningDirection[]).map(
            (value) => (
              <button
                type="button"
                key={value}
                aria-pressed={direction === value}
                onClick={() => onDirectionChange(value)}
                disabled={loading}
              >
                {directionLabels[value]}
              </button>
            ),
          )}
        </div>
      </fieldset>

      <div className="ui-between ui-wrap">
        <span className="ui-small">
          <strong>{dueCount}</strong> von {exampleBundle.vocabulary.length}{" "}
          Karten fällig
        </span>
        <Button onClick={onStart} disabled={loading}>
          {loading ? "Lernstand wird geladen …" : "Lernrunde starten"}
        </Button>
      </div>
    </div>
  );
}

function SessionProgress({
  current,
  total,
  direction,
  mode,
}: {
  current: number;
  total: number;
  direction: LearningDirection;
  mode: VocabularySessionMode;
}) {
  return (
    <div
      className="ui-stack"
      style={{ ["--gap" as string]: "6px" }}
      aria-label={`Karte ${current} von ${total}`}
      role="group"
    >
      <div className="ui-between">
        <span className="ui-small ui-muted">
          {mode === "writing" ? "Schreiben" : "Karteikarten"} ·{" "}
          {directionLabels[direction]}
        </span>
        <strong className="ui-small">
          {current} / {total}
        </strong>
      </div>
      <div className="ui-bar" aria-hidden="true">
        <span style={{ width: `${(current / total) * 100}%` }} />
      </div>
    </div>
  );
}
