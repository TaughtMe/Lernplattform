"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  LEARNING_BUNDLE_VERSION,
  parseLearningBundleV1,
  type LearningEventV1,
} from "../../src/domain/learning-bundle";
import {
  evaluateVocabularyAnswer,
  summarizeLearningProgress,
} from "../../src/domain/learning-session";
import { createPersonalLearningEventRepository } from "../../src/storage/personal-learning-events";

const exampleBundle = parseLearningBundleV1({
  schemaVersion: LEARNING_BUNDLE_VERSION,
  id: "lernraum-school-words",
  revision: 1,
  createdAt: "2026-08-12T10:00:00.000Z",
  source: { kind: "self" },
  vocabulary: [
    {
      kind: "vocabulary",
      id: "school-library",
      prompt: { text: "library", locale: "en" },
      answer: {
        text: "Bibliothek",
        locale: "de",
        alternatives: ["Bücherei"],
      },
      tagIds: ["school"],
      createdAt: "2026-08-12T10:00:00.000Z",
      updatedAt: "2026-08-12T10:00:00.000Z",
    },
  ],
  stacks: [
    {
      id: "school-words",
      title: "Englisch · Wörter in der Schule",
      itemIds: ["school-library"],
      tagIds: ["school"],
    },
  ],
});

function firstOrThrow<T>(values: readonly T[]): T {
  const first = values[0];
  if (!first) throw new Error("Das Beispiel-Lernpaket ist unvollständig.");
  return first;
}

const item = firstOrThrow(exampleBundle.vocabulary);
const stack = firstOrThrow(exampleBundle.stacks);

type Stage = "overview" | "task" | "result";

export function FirstLearningRound() {
  const repository = useMemo(() => createPersonalLearningEventRepository(), []);
  const [stage, setStage] = useState<Stage>("overview");
  const [answer, setAnswer] = useState("");
  const [events, setEvents] = useState<LearningEventV1[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [lastResult, setLastResult] = useState<
    ReturnType<typeof evaluateVocabularyAnswer> | undefined
  >();

  const progress = summarizeLearningProgress(events, item.id);

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

  async function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answer.trim()) {
      setMessage("Bitte gib zuerst eine Antwort ein.");
      return;
    }

    setSaving(true);
    setMessage("");
    const result = evaluateVocabularyAnswer(item, answer);
    const assessment = result.accepted ? "correct" : "incorrect";
    const learningEvent: LearningEventV1 = {
      id: crypto.randomUUID(),
      learningObjectId: item.id,
      occurredAt: new Date().toISOString(),
      source: "lesson",
      roundId: crypto.randomUUID(),
      direction: "prompt-to-answer",
      answerMode: "typed",
      help: "none",
      classContext: {
        classId: "klasse-7b",
        rankingEligible: true,
      },
      assessment: {
        knowledge: assessment,
        writing: assessment,
        selfCorrected: false,
      },
    };

    try {
      await repository.put(learningEvent);
      setEvents((current) => [learningEvent, ...current]);
      setLastResult(result);
      setStage("result");
    } catch {
      setMessage(
        "Die Antwort konnte nicht gespeichert werden. Bitte prüfe, ob dein Browser lokalen Speicher erlaubt.",
      );
    } finally {
      setSaving(false);
    }
  }

  function startRound() {
    setAnswer("");
    setLastResult(undefined);
    setMessage("");
    setStage("task");
  }

  return (
    <section className="learning-round" aria-labelledby="learning-round-title">
      <div className="learning-round__intro">
        <p className="eyebrow">Klasse 7b · Vokabelübung</p>
        <h1 id="learning-round-title">School words</h1>
        <p>
          Öffne ein kleines Lernpaket, löse eine Aufgabe und sieh direkt, wie
          dein Ergebnis auf diesem Gerät gespeichert wird.
        </p>
      </div>

      <div className="learning-round__layout">
        <article className="learning-card">
          {stage === "overview" && (
            <>
              <span className="learning-card__step">1 · Material öffnen</span>
              <h2>{stack.title}</h2>
              <p>Eine kurze Beispielrunde mit einer Vokabel.</p>
              <ul className="learning-meta" aria-label="Angaben zum Lernpaket">
                <li>Englisch → Deutsch</li>
                <li>Tippen</li>
                <li>Lokal gespeichert</li>
              </ul>
              <button
                className="button button--primary"
                onClick={startRound}
                disabled={loading}
              >
                {loading ? "Lernstand wird geladen …" : "Lernrunde starten"}
              </button>
            </>
          )}

          {stage === "task" && (
            <form onSubmit={submitAnswer} noValidate>
              <span className="learning-card__step">
                2 · Aufgabe bearbeiten
              </span>
              <p className="learning-prompt-label">Übersetze ins Deutsche</p>
              <h2 lang={item.prompt.locale}>{item.prompt.text}</h2>
              <label
                className="learning-answer-label"
                htmlFor="learning-answer"
              >
                Deine Antwort
              </label>
              <input
                id="learning-answer"
                className="learning-answer"
                autoComplete="off"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                aria-describedby={message ? "learning-message" : undefined}
              />
              {message && (
                <p
                  className="learning-message learning-message--error"
                  id="learning-message"
                >
                  {message}
                </p>
              )}
              <button className="button button--primary" disabled={saving}>
                {saving ? "Wird gespeichert …" : "Antwort prüfen"}
              </button>
            </form>
          )}

          {stage === "result" && lastResult && (
            <div aria-live="polite">
              <span className="learning-card__step">
                3 · Ergebnis gespeichert
              </span>
              <h2>
                {lastResult.accepted ? "Richtig gelöst" : "Noch nicht richtig"}
              </h2>
              <p
                className={lastResult.accepted ? "result-good" : "result-retry"}
              >
                {lastResult.accepted
                  ? `„${answer}“ wurde als richtige Antwort gespeichert.`
                  : `Die passende Antwort ist „${lastResult.expectedAnswer}“. Dein Versuch wurde gespeichert, damit er später gezielt wiederholt werden kann.`}
              </p>
              <button className="button button--secondary" onClick={startRound}>
                Noch einmal üben
              </button>
            </div>
          )}
        </article>

        <aside className="progress-card" aria-labelledby="progress-title">
          <span className="learning-card__step">4 · Lernstand</span>
          <h2 id="progress-title">Auf diesem Gerät</h2>
          {loading ? (
            <p>Gespeicherter Lernstand wird geladen …</p>
          ) : (
            <dl className="progress-values">
              <div>
                <dt>Versuche</dt>
                <dd>{progress.attempts}</dd>
              </div>
              <div>
                <dt>Richtig</dt>
                <dd>{progress.correct}</dd>
              </div>
              <div>
                <dt>Zu wiederholen</dt>
                <dd>{progress.incorrect}</dd>
              </div>
            </dl>
          )}
          <p className="progress-note">
            Dieser Prototyp sendet den Lernstand nicht an einen Server.
          </p>
        </aside>
      </div>
    </section>
  );
}
