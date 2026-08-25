"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TYPING_LESSONS,
  availableKeysThrough,
  isTypingLessonUnlocked,
  type LessonDef,
} from "../../../src/tastschreiben/curriculum";
import { generateTypingPracticeText } from "../../../src/tastschreiben/text-generator";
import type { TypingLessonProgress } from "../../../src/tastschreiben/typing-progress";
import type { TypingStats } from "../../../src/tastschreiben/typing-stats";
import { createTypingProgressRepository } from "../../../src/storage/personal-learning-events";
import { TypingPractice } from "./typing-practice";

type View =
  | { mode: "overview" }
  | { mode: "practice"; lesson: LessonDef; roundId: string }
  | { mode: "result"; lesson: LessonDef; stats: TypingStats };

export function TypingApp() {
  const repository = useMemo(() => createTypingProgressRepository(), []);
  const [progress, setProgress] = useState<
    Record<string, TypingLessonProgress>
  >({});
  const [view, setView] = useState<View>({ mode: "overview" });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    repository
      .list()
      .then((entries) =>
        setProgress(
          Object.fromEntries(entries.map((entry) => [entry.id, entry])),
        ),
      )
      .finally(() => setLoading(false));
  }, [repository]);

  useEffect(() => refresh(), [refresh]);

  function startLesson(lesson: LessonDef) {
    setView({ mode: "practice", lesson, roundId: crypto.randomUUID() });
  }

  function finishLesson(
    lesson: LessonDef,
    roundId: string,
    stats: TypingStats,
  ) {
    repository.recordAttempt(lesson.id, stats, roundId).then(() => {
      refresh();
      setView({ mode: "result", lesson, stats });
    });
  }

  const completed = new Set(
    Object.values(progress)
      .filter((entry) => entry.completed)
      .map((entry) => entry.id),
  );

  return (
    <main className="typing-shell">
      <header className="running-topbar">
        <Link href="/frei" className="back-link">
          ← Freies Üben
        </Link>
        <div>
          <strong>Tipptraining</strong>
          <span>Genauigkeit vor Tempo</span>
        </div>
        <Link href="/" className="back-link">
          Lernraum
        </Link>
      </header>

      {view.mode === "overview" && (
        <section className="typing-overview" aria-labelledby="typing-title">
          <div className="student-welcome">
            <p className="eyebrow">Tastschreiben</p>
            <h1 id="typing-title">Schritt für Schritt sicher tippen</h1>
            <p>
              Beginne mit der Grundstellung. Unsichere Tasten werden nach jeder
              Runde sichtbar; Geschwindigkeit bleibt eine Zusatzinformation.
            </p>
          </div>
          {loading ? (
            <p>Dein Lernstand wird geladen …</p>
          ) : (
            <ol className="typing-lessons">
              {TYPING_LESSONS.map((lesson, index) => {
                const unlocked = isTypingLessonUnlocked(lesson.id, completed);
                const item = progress[lesson.id];
                return (
                  <li
                    className={unlocked ? undefined : "is-locked"}
                    key={lesson.id}
                  >
                    <span className="typing-lessons__number">{index + 1}</span>
                    <div>
                      <strong>{lesson.title}</strong>
                      <p>{lesson.description}</p>
                      {item && (
                        <small>
                          Beste Genauigkeit: {item.bestAccuracy}% ·{" "}
                          {item.attempts}{" "}
                          {item.attempts === 1 ? "Runde" : "Runden"}
                        </small>
                      )}
                    </div>
                    <button
                      className="button button--primary"
                      disabled={!unlocked}
                      onClick={() => startLesson(lesson)}
                    >
                      {item?.completed
                        ? "Weiter üben"
                        : unlocked
                          ? "Starten"
                          : "Noch gesperrt"}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      )}

      {view.mode === "practice" && (
        <section className="typing-round">
          <p className="eyebrow">{view.lesson.title}</p>
          <h1>Tippe ruhig und genau.</h1>
          <p>{view.lesson.description}</p>
          <TypingPractice
            key={view.roundId}
            text={generateTypingPracticeText(view.lesson, view.roundId)}
            activeChars={availableKeysThrough(view.lesson.id)}
            onFinish={(stats) => finishLesson(view.lesson, view.roundId, stats)}
          />
          <button
            className="text-button"
            onClick={() => setView({ mode: "overview" })}
          >
            Übung beenden
          </button>
        </section>
      )}

      {view.mode === "result" && (
        <section className="typing-result">
          <p className="eyebrow">Runde abgeschlossen</p>
          <h1>{view.stats.accuracy}% genau</h1>
          <p>
            {view.stats.accuracy >= 90
              ? "Die Lektion ist sicher genug für den nächsten Schritt."
              : "Bleib noch bei dieser Lektion. Ruhiges, genaues Tippen bringt dich weiter."}
          </p>
          <div className="typing-result__metrics">
            <article>
              <strong>{view.stats.accuracy}%</strong>
              <span>Genauigkeit</span>
            </article>
            <article>
              <strong>{view.stats.corrections}</strong>
              <span>Korrekturen</span>
            </article>
            <article>
              <strong>{view.stats.wpm}</strong>
              <span>Wörter/min · Info</span>
            </article>
          </div>
          {view.stats.problemChars.length > 0 && (
            <p>
              Noch unsicher:{" "}
              <strong>
                {view.stats.problemChars
                  .map((item) => (item.char === " " ? "Leertaste" : item.char))
                  .join(", ")}
              </strong>
            </p>
          )}
          <div className="typing-result__actions">
            <button
              className="button button--secondary"
              onClick={() => startLesson(view.lesson)}
            >
              Noch einmal
            </button>
            <button
              className="button button--primary"
              onClick={() => setView({ mode: "overview" })}
            >
              Zur Übersicht
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
