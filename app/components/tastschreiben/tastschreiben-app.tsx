"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createTypingService, type LessonProgressV1, type TypingService } from "../../../src/tastschreiben/typing-service.ts";
import { LESSONS, isLessonUnlocked, type LessonDef } from "../../../src/tastschreiben/curriculum.ts";
import { generatePracticeText } from "../../../src/tastschreiben/text-generator.ts";
import type { TypingStats } from "../../../src/tastschreiben/typing-stats.ts";
import { createIndexedDbRepositoryFactory } from "../../../src/storage/indexeddb-repository.ts";
import { useIsClient } from "../use-is-client.ts";
import { TypingPractice } from "./typing-practice.tsx";
import { FallingWordsGame } from "./falling-words-game.tsx";

type View =
  | { mode: "overview" }
  | { mode: "lesson"; lesson: LessonDef; roundSeed: string }
  | { mode: "result"; lesson: LessonDef; stats: TypingStats }
  | { mode: "game" };

function newRoundSeed(lessonId: string): string {
  return `${lessonId}:${Date.now()}:${Math.random()}`;
}

export function TastschreibenApp() {
  const isClient = useIsClient();
  const service = useMemo<TypingService | null>(
    () => (isClient ? createTypingService(createIndexedDbRepositoryFactory()) : null),
    [isClient],
  );

  const [progress, setProgress] = useState<Record<string, LessonProgressV1>>({});
  const [view, setView] = useState<View>({ mode: "overview" });

  const refreshProgress = useCallback((svc: TypingService) => {
    svc.listProgress().then((all) => setProgress(Object.fromEntries(all.map((p) => [p.id, p]))));
  }, []);

  useEffect(() => {
    if (service) refreshProgress(service);
  }, [service, refreshProgress]);

  if (!service) {
    return (
      <div className="tastschreiben-app">
        <p>Lade deinen Lernstand …</p>
      </div>
    );
  }

  const completedIds = new Set(Object.values(progress).filter((p) => p.completed).map((p) => p.id));

  function startLesson(lesson: LessonDef) {
    setView({ mode: "lesson", lesson, roundSeed: newRoundSeed(lesson.id) });
  }

  function handleFinish(lesson: LessonDef, stats: TypingStats) {
    service!.recordAttempt(lesson.id, stats).then(() => {
      refreshProgress(service!);
      setView({ mode: "result", lesson, stats });
    });
  }

  return (
    <div className="tastschreiben-app">
      {view.mode === "overview" && (
        <>
          <div className="tastschreiben-app__game-entry">
            <div>
              <strong>Buchstabenregen</strong>
              <p>Wörter fallen von oben — tippe sie, bevor sie unten ankommen. Passt sich automatisch an, was du schon gelernt hast.</p>
            </div>
            <button className="button button--secondary" type="button" onClick={() => setView({ mode: "game" })}>
              🎮 Spielen
            </button>
          </div>
          <ul className="lesson-list">
            {LESSONS.map((lesson) => {
            const unlocked = isLessonUnlocked(lesson.id, completedIds);
            const p = progress[lesson.id];
            return (
              <li key={lesson.id} className={`lesson-list__item${unlocked ? "" : " lesson-list__item--locked"}`}>
                <div className="lesson-list__info">
                  <span className="lesson-list__title">
                    {lesson.title}
                    {p?.completed && <span className="lesson-list__badge lesson-list__badge--done">bestanden</span>}
                  </span>
                  <span className="lesson-list__description">{lesson.description}</span>
                  {p && p.attempts > 0 && (
                    <span className="lesson-list__stats">
                      Beste Runde: {p.bestWpm} Wörter/min · {p.bestAccuracy}% genau
                    </span>
                  )}
                </div>
                <button className="button button--primary" type="button" onClick={() => startLesson(lesson)} disabled={!unlocked}>
                  {unlocked ? "Üben" : "Gesperrt"}
                </button>
              </li>
            );
            })}
          </ul>
        </>
      )}

      {view.mode === "lesson" && (
        <div className="lesson-practice">
          <div className="lesson-practice__heading">
            <h2>{view.lesson.title}</h2>
            <p>{view.lesson.description}</p>
          </div>
          <TypingPractice key={view.roundSeed} text={generatePracticeText(view.lesson, view.roundSeed)} onFinish={(stats) => handleFinish(view.lesson, stats)} />
          <button className="button button--quiet" type="button" onClick={() => setView({ mode: "overview" })}>
            Abbrechen
          </button>
        </div>
      )}

      {view.mode === "result" && (
        <div className="lesson-result">
          <h2>{view.lesson.title} — Ergebnis</h2>
          <div className="lesson-result__stats">
            <div>
              <strong>{view.stats.wpm}</strong>
              <span>Wörter/min</span>
            </div>
            <div>
              <strong>{view.stats.accuracy}%</strong>
              <span>Genauigkeit</span>
            </div>
            <div>
              <strong>{view.stats.corrections}</strong>
              <span>Korrekturen</span>
            </div>
          </div>
          {view.stats.problemChars.length > 0 && (
            <p className="lesson-result__problem-keys">
              Noch unsicher: {view.stats.problemChars.map((p) => (p.char === " " ? "␣" : p.char)).join(", ")}
            </p>
          )}
          <div className="lesson-result__actions">
            <button className="button button--secondary" type="button" onClick={() => startLesson(view.lesson)}>
              Nochmal üben
            </button>
            <button className="button button--primary" type="button" onClick={() => setView({ mode: "overview" })}>
              Zur Übersicht
            </button>
          </div>
        </div>
      )}

      {view.mode === "game" && <FallingWordsGame completedLessonIds={completedIds} onExit={() => setView({ mode: "overview" })} />}
    </div>
  );
}
