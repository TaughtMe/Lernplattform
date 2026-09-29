"use client";

import { StudentPage } from "../../ui/shell/student-page";
import { AnimalImage } from "../../ui/animal";
import { Icon } from "../../ui/icons";
import { useLearnerProfile } from "../../ui/use-learner-profile";
import {
  aggregateProblemChars,
  buildTypingStations,
  stationStates,
} from "../../../src/tastschreiben/stations";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  NUMPAD_LESSONS,
  TYPING_LESSONS,
  isNumpadLessonUnlocked,
  isTypingLessonUnlocked,
  type LessonDef,
} from "../../../src/tastschreiben/curriculum";
import { generateTypingPracticeText } from "../../../src/tastschreiben/text-generator";
import type { TypingLessonProgress } from "../../../src/tastschreiben/typing-progress";
import type { TypingStats } from "../../../src/tastschreiben/typing-stats";
import { createTypingProgressRepository } from "../../../src/storage/personal-learning-events";
import { FallingWordsGame } from "./falling-words-game";
import { TypingCompanion } from "./typing-companion";
import { TypingPractice } from "./typing-practice";

type View =
  | { mode: "overview" }
  | { mode: "practice"; lesson: LessonDef; roundId: string }
  | { mode: "result"; lesson: LessonDef; stats: TypingStats }
  | { mode: "game" };

export function TypingApp() {
  const repository = useMemo(() => createTypingProgressRepository(), []);
  const [progress, setProgress] = useState<
    Record<string, TypingLessonProgress>
  >({});
  const [view, setView] = useState<View>({ mode: "overview" });
  const [loading, setLoading] = useState(true);
  const profile = useLearnerProfile();

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
  const completedCount = TYPING_LESSONS.filter((lesson) =>
    completed.has(lesson.id),
  ).length;
  const gameUnlocked = completedCount >= 3;

  const stations = useMemo(() => buildTypingStations(), []);
  const states = stationStates(stations, completed);
  const currentState = states.find((item) => item.state === "current");
  const [openStation, setOpenStation] = useState<string | null>(null);
  const shownStation =
    states.find((item) => item.station.id === openStation) ?? currentState;
  const unsure = aggregateProblemChars(Object.values(progress)).filter((item) =>
    item.char.trim(),
  );
  const extraLesson: LessonDef | null = unsure.length
    ? {
        id: "tasten-extra",
        title: "Tasten-Extra",
        description: "Die Tasten, die zuletzt am häufigsten danebengingen.",
        kind: "drill",
        newKeys: unsure.map((item) => item.char),
        practiceKeys: [...unsure.map((item) => item.char), " "],
      }
    : null;
  const stationNumber = (lesson: LessonDef) =>
    states.findIndex((item) =>
      item.station.lessons.some((entry) => entry.id === lesson.id),
    ) + 1;

  return (
    <StudentPage activePath="/frei/typing">
      {view.mode === "overview" && (
        <div className="ui-tw">
          <section className="ui-stack" aria-labelledby="typing-title">
            <div>
              <h1 id="typing-title" className="ui-h-page">
                Tastenwelt
              </h1>
              <p className="ui-small ui-muted">
                Zehn Stationen von der Grundstellung bis zum freien Abschreiben
                · erst genau, dann schnell
              </p>
            </div>

            {loading ? (
              <p className="ui-muted">Dein Lernstand wird geladen …</p>
            ) : (
              <>
                <ol
                  className="ui-card ui-card--pop ui-dots ui-tw__map"
                  aria-label="Lernweg"
                >
                  {states.map(({ station, state, done }, index) => (
                    <li
                      key={station.id}
                      className={`ui-tw__station is-${state}`}
                      style={{
                        ["--hue" as string]: String((index * 36 + 10) % 360),
                      }}
                    >
                      {state === "current" && profile?.animal ? (
                        <AnimalImage
                          animal={profile.animal}
                          size={54}
                          className="ui-tw__buddy ui-bob"
                        />
                      ) : null}
                      <button
                        type="button"
                        className="ui-tw__node"
                        aria-pressed={shownStation?.station.id === station.id}
                        aria-label={`Station ${index + 1}: ${station.title}, ${done} von ${station.lessons.length} geschafft`}
                        onClick={() => setOpenStation(station.id)}
                      >
                        {state === "done" ? (
                          <Icon name="check" size={22} />
                        ) : (
                          index + 1
                        )}
                      </button>
                      <strong>{station.title}</strong>
                      <span className="ui-tiny ui-muted">
                        {done} / {station.lessons.length}
                      </span>
                    </li>
                  ))}
                </ol>

                {shownStation ? (
                  <section
                    className="ui-card ui-card--pad ui-stack"
                    aria-labelledby="station-lessons"
                  >
                    <h2 id="station-lessons" className="ui-h-section">
                      Station {states.indexOf(shownStation) + 1} ·{" "}
                      {shownStation.station.title}
                    </h2>
                    <ol className="ui-list ui-tw__lessons">
                      {shownStation.station.lessons.map((lesson) => {
                        const unlocked = isTypingLessonUnlocked(
                          lesson.id,
                          completed,
                        );
                        const item = progress[lesson.id];
                        return (
                          <li
                            key={lesson.id}
                            className={unlocked ? "" : "is-locked"}
                          >
                            <div className="ui-grow">
                              <strong>{lesson.title}</strong>
                              <p className="ui-small ui-muted">
                                {lesson.description}
                              </p>
                              {item ? (
                                <small className="ui-tiny ui-muted">
                                  Beste Genauigkeit: {item.bestAccuracy}% ·{" "}
                                  {item.attempts}{" "}
                                  {item.attempts === 1 ? "Runde" : "Runden"}
                                </small>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              className={`ui-btn ui-btn--sm ${item?.completed ? "ui-btn--ghost" : "ui-btn--primary"}`}
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
                  </section>
                ) : null}

                <details className="ui-card ui-card--pad ui-tw__numpad">
                  <summary className="ui-h-section">
                    Ziffernblock · optionaler Zusatzweg ({NUMPAD_LESSONS.length}{" "}
                    Übungen)
                  </summary>
                  <ol className="ui-list ui-tw__lessons">
                    {NUMPAD_LESSONS.map((lesson, index) => {
                      const unlocked = isNumpadLessonUnlocked(
                        lesson.id,
                        completed,
                      );
                      const item = progress[lesson.id];
                      return (
                        <li
                          key={lesson.id}
                          className={unlocked ? "" : "is-locked"}
                        >
                          <span className="ui-pill">N{index + 1}</span>
                          <div className="ui-grow">
                            <strong>{lesson.title}</strong>
                            <p className="ui-small ui-muted">
                              {lesson.description}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="ui-btn ui-btn--sm ui-btn--ghost"
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
                </details>
              </>
            )}
          </section>

          <aside className="ui-stack ui-tw__side">
            <section className="ui-card ui-card--dark ui-card--pad ui-stack">
              <div className="ui-between">
                <span className="ui-eyebrow ui-muted">Heute</span>
                <span className="ui-tiny ui-muted">
                  {completedCount} / {TYPING_LESSONS.length} Lektionen
                </span>
              </div>
              <p className="ui-h-section">
                {currentState?.next
                  ? currentState.next.title
                  : "Alle Stationen geschafft"}
              </p>
              <div className="ui-tw__segments" aria-hidden="true">
                {states.map(({ station, state }) => (
                  <span key={station.id} className={`is-${state}`} />
                ))}
              </div>
              {currentState?.next ? (
                <button
                  type="button"
                  className="ui-btn ui-btn--gold ui-btn--block"
                  onClick={() => startLesson(currentState.next!)}
                >
                  Weiter mit Station {states.indexOf(currentState) + 1}
                </button>
              ) : null}
            </section>

            <section className="ui-card ui-card--pad ui-stack">
              <h2 className="ui-h-section">Unsichere Tasten</h2>
              {unsure.length ? (
                <>
                  <div className="ui-row ui-wrap" style={{ gap: 6 }}>
                    {unsure.map((item) => (
                      <span
                        key={item.char}
                        className="ui-tw__key"
                        style={{
                          ["--heat" as string]: String(
                            Math.min(1, item.errors / (unsure[0]?.errors || 1)),
                          ),
                        }}
                        title={`${item.errors} Fehler`}
                      >
                        {item.char}
                      </span>
                    ))}
                  </div>
                  <p className="ui-small ui-muted">
                    Diese Tasten gingen zuletzt am häufigsten daneben. Das
                    Tasten-Extra übt genau sie.
                  </p>
                  {extraLesson ? (
                    <button
                      type="button"
                      className="ui-btn ui-btn--bad ui-btn--block"
                      onClick={() => startLesson(extraLesson)}
                    >
                      Tasten-Extra
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="ui-small ui-muted">
                  Noch keine Auffälligkeiten. Nach den ersten Runden erscheinen
                  hier die Tasten, die öfter danebengehen.
                </p>
              )}
            </section>

            <section
              className="ui-card ui-card--pad ui-stack"
              aria-labelledby="game-title"
            >
              <h2 id="game-title" className="ui-h-section">
                Buchstabenregen
              </h2>
              <p className="ui-small ui-muted">
                Kurze Spielpause mit bereits gelernten Tasten. Nach drei
                Lernschritten freigeschaltet.
              </p>
              <button
                type="button"
                className="ui-btn ui-btn--green ui-btn--sm"
                disabled={!gameUnlocked}
                onClick={() => setView({ mode: "game" })}
              >
                {gameUnlocked ? "Spielen" : "Nach Schritt 3"}
              </button>
            </section>
          </aside>
        </div>
      )}

      {view.mode === "practice" && (
        <div className="ui-tw-play">
          <header className="ui-row">
            <button
              type="button"
              className="ui-icon-btn ui-icon-btn--square"
              aria-label="Übung beenden"
              onClick={() => setView({ mode: "overview" })}
            >
              <Icon name="back" size={18} />
            </button>
            <div className="ui-grow">
              <h1 className="ui-h-section">
                Tastenwelt
                {stationNumber(view.lesson) > 0
                  ? ` · Station ${stationNumber(view.lesson)}`
                  : ""}
              </h1>
              <p className="ui-small ui-muted">
                {view.lesson.title} · erst genau, dann schnell
              </p>
            </div>
          </header>
          <div className="ui-tw-play__stage">
            <section className="ui-card ui-card--raised ui-tw-play__card">
              <span className="ui-eyebrow">Tippe ab</span>
              <TypingPractice
                key={view.roundId}
                text={generateTypingPracticeText(view.lesson, view.roundId)}
                activeChars={view.lesson.practiceKeys ?? view.lesson.newKeys}
                keyboardLayout={view.lesson.keyboard ?? "main"}
                onFinish={(stats) =>
                  finishLesson(view.lesson, view.roundId, stats)
                }
              />
            </section>
            <aside className="ui-tw-play__coach" aria-hidden="true">
              <p className="ui-tw-play__bubble">
                {view.lesson.description} Ruhig und genau – Tempo kommt von
                allein.
              </p>
              {profile?.animal ? (
                <AnimalImage
                  animal={profile.animal}
                  size={110}
                  className="ui-bob"
                />
              ) : (
                <TypingCompanion
                  compact
                  completed={completedCount}
                  total={TYPING_LESSONS.length}
                />
              )}
            </aside>
          </div>
          <button
            type="button"
            className="ui-btn ui-btn--link"
            onClick={() => setView({ mode: "overview" })}
          >
            Übung beenden
          </button>
        </div>
      )}

      {view.mode === "result" && (
        <section className="ui-card ui-card--raised ui-tw-result">
          <TypingCompanion
            compact
            mood={view.stats.accuracy >= 90 ? "celebrate" : "encourage"}
            completed={completedCount}
            total={TYPING_LESSONS.length}
          />
          <p className="ui-eyebrow">Runde abgeschlossen</p>
          <h1 className="ui-h-fun">{view.stats.accuracy}% genau</h1>
          <p className="ui-muted">
            {view.stats.accuracy >= 90
              ? "Die Lektion ist sicher genug für den nächsten Schritt."
              : "Bleib noch bei dieser Lektion. Ruhiges, genaues Tippen bringt dich weiter."}
          </p>
          <div className="ui-grid3 ui-tw-result__metrics">
            <article>
              <strong>{view.stats.accuracy}%</strong>
              <span className="ui-tiny ui-muted">Genauigkeit</span>
            </article>
            <article>
              <strong>{view.stats.corrections}</strong>
              <span className="ui-tiny ui-muted">Korrekturen</span>
            </article>
            <article>
              <strong>{view.stats.wpm}</strong>
              <span className="ui-tiny ui-muted">Wörter/min · Info</span>
            </article>
          </div>
          {view.stats.problemChars.length > 0 && (
            <p className="ui-small">
              Noch unsicher:{" "}
              <strong>
                {view.stats.problemChars
                  .map((item) => (item.char === " " ? "Leertaste" : item.char))
                  .join(", ")}
              </strong>
            </p>
          )}
          <div className="ui-row ui-wrap" style={{ justifyContent: "center" }}>
            <button
              type="button"
              className="ui-btn ui-btn--ghost"
              onClick={() => startLesson(view.lesson)}
            >
              Noch einmal
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--primary"
              onClick={() => setView({ mode: "overview" })}
            >
              Zur Übersicht
            </button>
          </div>
        </section>
      )}

      {view.mode === "game" && (
        <div className="ui-tw-play">
          <FallingWordsGame
            completedLessonIds={completed}
            onExit={() => setView({ mode: "overview" })}
          />
        </div>
      )}
    </StudentPage>
  );
}
