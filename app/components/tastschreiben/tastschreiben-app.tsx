"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createTypingService, TIME_ATTACK_ID, FALLING_WORDS_GAME_ID, type LessonProgressV1, type TypingService } from "../../../src/tastschreiben/typing-service.ts";
import { LESSONS, isLessonUnlocked, type LessonDef } from "../../../src/tastschreiben/curriculum.ts";
import { generatePracticeText, generateTimeAttackText, generateWeakKeyDrill } from "../../../src/tastschreiben/text-generator.ts";
import type { TypingStats } from "../../../src/tastschreiben/typing-stats.ts";
import { createIndexedDbRepositoryFactory } from "../../../src/storage/indexeddb-repository.ts";
import { recentMetricPoints, type ChartPoint } from "../../../src/tastschreiben/progress-chart-data.ts";
import { evaluateAchievements } from "../../../src/tastschreiben/achievements.ts";
import { computeMedal, type MedalTier } from "../../../src/tastschreiben/medals.ts";
import { useIsClient } from "../use-is-client.ts";
import { TypingPractice } from "./typing-practice.tsx";
import { FallingWordsGame } from "./falling-words-game.tsx";
import { SoundToggle } from "./sound-toggle.tsx";
import { ProgressChart } from "./progress-chart.tsx";
import { AchievementsPanel } from "./achievements-panel.tsx";

type View =
  | { mode: "overview" }
  | { mode: "lesson"; lesson: LessonDef; roundSeed: string }
  | { mode: "time-attack"; roundSeed: string }
  | { mode: "weak-keys"; roundSeed: string }
  | { mode: "result"; title: string; stats: TypingStats; points: number; onRetry: () => void }
  | { mode: "game" };

const TIME_ATTACK_MS = 60000;
const WEAK_KEYS_ID = "schwache-tasten";
const WEAK_KEYS_DRILL_LENGTH = 60;

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
  const [weakKeys, setWeakKeys] = useState<Array<{ char: string; errors: number }>>([]);
  const [wpmPoints, setWpmPoints] = useState<ChartPoint[]>([]);
  const [accuracyPoints, setAccuracyPoints] = useState<ChartPoint[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [medal, setMedal] = useState<MedalTier>("none");
  const [totalPoints, setTotalPoints] = useState(0);
  const [view, setView] = useState<View>({ mode: "overview" });

  const refreshProgress = useCallback((svc: TypingService) => {
    svc.listProgress().then((all) => setProgress(Object.fromEntries(all.map((p) => [p.id, p]))));
    svc.getWeakKeys().then(setWeakKeys);
    svc.getHistory().then((history) => {
      setWpmPoints(recentMetricPoints(history, "wpm"));
      setAccuracyPoints(recentMetricPoints(history, "accuracy"));
    });
    svc.getProgressSnapshot().then((snapshot) => {
      setUnlockedAchievements(
        evaluateAchievements({
          lessons: snapshot.lessonProgress,
          totalLessons: snapshot.totalLessons,
          bestGameScore: snapshot.bestGameScore,
          bestGameStreak: snapshot.bestGameStreak,
          bestTimeAttackWpm: snapshot.bestTimeAttackWpm,
        }),
      );
      setMedal(computeMedal(snapshot.lessonProgress, snapshot.totalLessons));
      setTotalPoints(snapshot.totalPoints);
    });
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
  const practiceableWeakKeys = weakKeys.filter((k) => k.char !== " ");

  function startLesson(lesson: LessonDef) {
    setView({ mode: "lesson", lesson, roundSeed: newRoundSeed(lesson.id) });
  }

  function finishRound(lessonId: string, stats: TypingStats, title: string, onRetry: () => void) {
    service!
      .recordAttempt(lessonId, stats)
      .then(() => service!.getHistory(lessonId))
      .then((history) => {
        refreshProgress(service!);
        const points = history[history.length - 1]?.points ?? 0;
        setView({ mode: "result", title, stats, points, onRetry });
      });
  }

  function handleFinish(lesson: LessonDef, stats: TypingStats) {
    finishRound(lesson.id, stats, `${lesson.title} — Ergebnis`, () => startLesson(lesson));
  }

  function startTimeAttack() {
    setView({ mode: "time-attack", roundSeed: newRoundSeed(TIME_ATTACK_ID) });
  }

  function handleTimeAttackFinish(stats: TypingStats) {
    finishRound(TIME_ATTACK_ID, stats, "Zeitrennen — Ergebnis", startTimeAttack);
  }

  function startWeakKeysPractice() {
    setView({ mode: "weak-keys", roundSeed: newRoundSeed(WEAK_KEYS_ID) });
  }

  function handleWeakKeysFinish(stats: TypingStats) {
    finishRound(WEAK_KEYS_ID, stats, "Fehlertasten-Training — Ergebnis", startWeakKeysPractice);
  }

  return (
    <div className="tastschreiben-app">
      <div className="tastschreiben-app__toolbar">
        <SoundToggle />
      </div>
      {view.mode === "overview" && (
        <>
          <AchievementsPanel unlocked={unlockedAchievements} medal={medal} totalPoints={totalPoints} />
          {(wpmPoints.length > 0 || accuracyPoints.length > 0) && <ProgressChart wpmPoints={wpmPoints} accuracyPoints={accuracyPoints} />}
          <div className="tastschreiben-app__game-entry">
            <div>
              <strong>Buchstabenregen</strong>
              <p>Wörter fallen von oben — tippe sie, bevor sie unten ankommen. Passt sich automatisch an, was du schon gelernt hast.</p>
            </div>
            <button className="button button--secondary" type="button" onClick={() => setView({ mode: "game" })}>
              🎮 Spielen
            </button>
          </div>
          <div className="tastschreiben-app__game-entry">
            <div>
              <strong>Zeitrennen</strong>
              <p>60 Sekunden, so viele Wörter wie möglich — Genauigkeit zählt am meisten.</p>
            </div>
            <button className="button button--secondary" type="button" onClick={startTimeAttack}>
              ⏱️ Starten
            </button>
          </div>
          {practiceableWeakKeys.length > 0 && (
            <div className="tastschreiben-app__game-entry">
              <div>
                <strong>Fehlertasten-Training</strong>
                <p>Gezieltes Üben genau der Tasten, bei denen bisher die meisten Fehler passiert sind: {practiceableWeakKeys.map((k) => k.char).join(" ")}</p>
              </div>
              <button className="button button--secondary" type="button" onClick={startWeakKeysPractice}>
                🎯 Üben
              </button>
            </div>
          )}
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

      {view.mode === "time-attack" && (
        <div className="lesson-practice">
          <div className="lesson-practice__heading">
            <h2>Zeitrennen</h2>
            <p>60 Sekunden, so viele Wörter wie möglich — Genauigkeit zählt am meisten.</p>
          </div>
          <TypingPractice key={view.roundSeed} text={generateTimeAttackText(view.roundSeed)} timeLimitMs={TIME_ATTACK_MS} onFinish={handleTimeAttackFinish} />
          <button className="button button--quiet" type="button" onClick={() => setView({ mode: "overview" })}>
            Abbrechen
          </button>
        </div>
      )}

      {view.mode === "weak-keys" && (
        <div className="lesson-practice">
          <div className="lesson-practice__heading">
            <h2>Fehlertasten-Training</h2>
            <p>Nur die Tasten, bei denen bisher die meisten Fehler passiert sind.</p>
          </div>
          <TypingPractice
            key={view.roundSeed}
            text={generateWeakKeyDrill(practiceableWeakKeys.map((k) => k.char), WEAK_KEYS_DRILL_LENGTH, view.roundSeed)}
            onFinish={handleWeakKeysFinish}
          />
          <button className="button button--quiet" type="button" onClick={() => setView({ mode: "overview" })}>
            Abbrechen
          </button>
        </div>
      )}

      {view.mode === "result" && (
        <div className="lesson-result">
          <h2>{view.title}</h2>
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
          <p className="lesson-result__points">+{view.points} Punkte</p>
          {view.stats.problemChars.length > 0 && (
            <p className="lesson-result__problem-keys">
              Noch unsicher: {view.stats.problemChars.map((p) => (p.char === " " ? "␣" : p.char)).join(", ")}
            </p>
          )}
          <div className="lesson-result__actions">
            <button className="button button--secondary" type="button" onClick={view.onRetry}>
              Nochmal üben
            </button>
            <button className="button button--primary" type="button" onClick={() => setView({ mode: "overview" })}>
              Zur Übersicht
            </button>
          </div>
        </div>
      )}

      {view.mode === "game" && (
        <FallingWordsGame
          completedLessonIds={completedIds}
          onExit={() => setView({ mode: "overview" })}
          onGameOver={(score, bestStreak) => {
            service!.recordGameScore(FALLING_WORDS_GAME_ID, score, bestStreak).then(() => refreshProgress(service!));
          }}
        />
      )}
    </div>
  );
}
