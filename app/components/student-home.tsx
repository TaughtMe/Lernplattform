"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CLASS_MODULE_LABELS } from "../../src/domain/class-workspace";
import type { LearningRecommendation } from "../../src/domain/learning-recommendation";
import { createLearningRecommendationRepository } from "../../src/storage/learning-recommendations";
import { PersonalLearningDatabase } from "../../src/storage/personal-learning-events";
import { RoomCodeForm } from "./room-code-form";
import { StudentDashboardShell } from "./student-dashboard-shell";
import { StudentIdentitySummary } from "./student-identity-summary";

const DAILY_TARGET = 20;
const BOXES = [1, 2, 3, 4, 5] as const;
const WEEKDAYS = [
  ["Mo", "Montag"],
  ["Di", "Dienstag"],
  ["Mi", "Mittwoch"],
  ["Do", "Donnerstag"],
  ["Fr", "Freitag"],
  ["Sa", "Samstag"],
  ["So", "Sonntag"],
] as const;
const subscribeToHydration = () => () => undefined;

type DashboardSnapshot = {
  recommendations: LearningRecommendation[];
  completedToday: number;
  streak: number;
  activeDays: string[];
  recentErrors: number;
  boxCounts: number[];
  learningBoxTotal: number;
  memoryStage: number;
  missionProgress: number;
};

const EMPTY_SNAPSHOT: DashboardSnapshot = {
  recommendations: [],
  completedToday: 0,
  streak: 0,
  activeDays: [],
  recentErrors: 0,
  boxCounts: [0, 0, 0, 0, 0],
  learningBoxTotal: 0,
  memoryStage: 1,
  missionProgress: 0,
};

function localDayKey(value: string | number | Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function countStreak(activeDays: readonly string[], now = new Date()) {
  const days = new Set(activeDays);
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(localDayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function createCalendarMonth(month: Date, today = new Date()) {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const cellCount = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(
      month.getFullYear(),
      month.getMonth(),
      index - mondayOffset + 1,
    );
    return {
      key: localDayKey(date),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === month.getMonth(),
      isToday: localDayKey(date) === localDayKey(today),
    };
  });
}

function recommendationAction(recommendation: LearningRecommendation) {
  if (recommendation.reason === "error") return "Fehler jetzt üben";
  if (recommendation.reason === "due") return "Runde starten";
  return "Lernweg fortsetzen";
}

export function StudentHome() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const database = useMemo(() => new PersonalLearningDatabase(), []);
  const recommendations = useMemo(
    () => createLearningRecommendationRepository(database),
    [database],
  );
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      const now = new Date();
      const [items, events, cards, words] = await Promise.all([
        recommendations.list({
          enabledModules: ["vocabulary", "german", "mathematics", "typing"],
        }),
        database.learningEvents.toArray(),
        database.learningBoxCards.toArray(),
        database.learningWordProgress.toArray(),
      ]);
      if (!active) return;

      const today = localDayKey(now);
      const activeDays = [
        ...new Set(events.map((event) => localDayKey(event.occurredAt))),
      ];
      const latestWord = [...words].sort((left, right) =>
        right.lastPracticedAt.localeCompare(left.lastPracticedAt),
      )[0];
      const recentCutoff = now.getTime() - 7 * 86_400_000;
      const recentErrors = events.filter(
        (event) =>
          new Date(event.occurredAt).getTime() >= recentCutoff &&
          (event.assessment.knowledge === "incorrect" ||
            event.assessment.writing === "incorrect"),
      ).length;
      const boxCounts = BOXES.map(
        (box) =>
          cards.filter((card) => card.box === box || card.reverseBox === box)
            .length,
      );

      setSnapshot({
        recommendations: items,
        completedToday: events.filter(
          (event) => localDayKey(event.occurredAt) === today,
        ).length,
        streak: countStreak(activeDays, now),
        activeDays,
        recentErrors,
        boxCounts,
        learningBoxTotal: cards.length,
        memoryStage: latestWord?.stage ?? 1,
        missionProgress: Math.min(
          100,
          events.filter(
            (event) =>
              event.assessment.knowledge === "correct" ||
              event.assessment.writing === "correct",
          ).length,
        ),
      });
      setLoading(false);
    };

    void load().catch(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      database.close();
    };
  }, [database, recommendations]);

  const primary = snapshot.recommendations[0];
  const dueCount = snapshot.recommendations
    .filter((item) => item.reason === "due")
    .reduce((sum, item) => sum + item.amount, 0);
  const difficultCount = snapshot.recommendations
    .filter((item) => item.reason === "error")
    .reduce((sum, item) => sum + item.amount, 0);
  const taskAmount = primary?.amount ?? 1;
  const estimatedMinutes = Math.max(4, Math.ceil(taskAmount * 0.45));
  const targetProgress = Math.min(
    100,
    Math.round((snapshot.completedToday / DAILY_TARGET) * 100),
  );
  const maxBoxCount = Math.max(1, ...snapshot.boxCounts);
  const calendarDays = createCalendarMonth(visibleMonth);
  const calendarWeeks = Array.from(
    { length: calendarDays.length / 7 },
    (_, index) => calendarDays.slice(index * 7, index * 7 + 7),
  );
  const monthLabel = new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  const changeVisibleMonth = (offset: number) => {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  return (
    <StudentDashboardShell
      activePath="/lernen"
      summary={
        <StudentIdentitySummary
          status={
          <span className="student-dashboard__streak">
            {snapshot.streak} {snapshot.streak === 1 ? "Tag" : "Tage"} in Folge
          </span>
          }
        />
      }
    >
      <section className="student-dashboard__intro student-dashboard__intro--home">
        <p className="eyebrow" suppressHydrationWarning>
          {new Intl.DateTimeFormat("de-DE", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }).format(new Date())}
        </p>
        <h1>Meine Startseite</h1>
        <p>Deine Runde für heute – klar priorisiert und direkt startbereit.</p>
      </section>

      <div className="student-overview">
        <section
          className="student-overview__daily"
          aria-labelledby="today-title"
        >
          <div className="student-overview__daily-copy">
            <p className="eyebrow">Tagesaufgabe</p>
            <h2 id="today-title">
              <span className="sr-only">Heute üben: </span>
              {loading
                ? "Deine Runde wird vorbereitet …"
                : primary
                  ? `${taskAmount} ${taskAmount === 1 ? "Aufgabe" : "Aufgaben"} · etwa ${estimatedMinutes} Minuten`
                  : "Heute ist alles geschafft"}
            </h2>
            <p>
              {primary?.detail ??
                "Neue Wiederholungen und passende nächste Schritte erscheinen automatisch hier."}
            </p>
            {primary ? (
              <div
                className="student-overview__tags"
                role="list"
                aria-label="Zusammensetzung der Runde"
              >
                <span role="listitem">
                  {CLASS_MODULE_LABELS[primary.module]}
                </span>
                {primary.reason === "error" ? (
                  <span role="listitem">Aus deinem letzten Fehler</span>
                ) : null}
                {snapshot.recentErrors > 0 ? (
                  <span role="listitem">
                    {snapshot.recentErrors} aus früheren Fehlern
                  </span>
                ) : null}
                {dueCount > 0 ? (
                  <span role="listitem">{dueCount} fällig</span>
                ) : null}
                {difficultCount > 0 ? (
                  <span role="listitem">{difficultCount} schwierig</span>
                ) : null}
              </div>
            ) : null}
            {primary ? (
              <Link
                className="button button--primary student-overview__start"
                href={primary.route}
              >
                <span className="sr-only">{primary.title}. </span>
                {recommendationAction(primary)}
              </Link>
            ) : (
              <Link
                className="button student-overview__start"
                href="/lernen/material"
              >
                Mein Material ansehen
              </Link>
            )}
          </div>

          <aside className="student-overview__target" aria-label="Tagesziel">
            <p className="eyebrow">Tagesziel</p>
            <p>
              <strong>{Math.min(snapshot.completedToday, DAILY_TARGET)}</strong>
              <span> von {DAILY_TARGET} Schritten</span>
            </p>
            <div
              className="student-overview__progress"
              aria-label={`${targetProgress} Prozent des Tagesziels`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={targetProgress}
              role="progressbar"
            >
              <span style={{ width: `${targetProgress}%` }} />
            </div>
            <small>
              {snapshot.completedToday >= DAILY_TARGET
                ? "Tagesziel erreicht. Stark gearbeitet."
                : `Noch ${DAILY_TARGET - Math.min(snapshot.completedToday, DAILY_TARGET)} Schritte bis zum Tagesziel.`}
            </small>
          </aside>
        </section>

        <aside
          className="student-overview__streak-card"
          aria-labelledby="streak-title"
        >
          <div>
            <p className="eyebrow">Serie</p>
            <h2 id="streak-title">
              {snapshot.streak} {snapshot.streak === 1 ? "Tag" : "Tage"}
            </h2>
          </div>
          <div className="student-overview__calendar">
            <div className="student-overview__calendar-heading">
              <h3 aria-live="polite">{monthLabel}</h3>
              <div>
                <button
                  aria-label="Vorheriger Monat"
                  disabled={!hydrated}
                  onClick={() => changeVisibleMonth(-1)}
                  type="button"
                >
                  ‹
                </button>
                <button
                  aria-label="Nächster Monat"
                  disabled={!hydrated}
                  onClick={() => changeVisibleMonth(1)}
                  type="button"
                >
                  ›
                </button>
              </div>
            </div>
            <table aria-label={`Lernkalender für ${monthLabel}`}>
              <thead>
                <tr>
                  {WEEKDAYS.map(([shortLabel, fullLabel]) => (
                    <th abbr={fullLabel} key={shortLabel} scope="col">
                      {shortLabel}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calendarWeeks.map((week) => (
                  <tr key={week[0]?.key}>
                    {week.map((day) => {
                      const isActive = snapshot.activeDays.includes(day.key);
                      return (
                        <td
                          className={[
                            isActive ? "is-active" : "",
                            day.isToday ? "is-today" : "",
                            day.isCurrentMonth ? "" : "is-outside",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          key={day.key}
                        >
                          <time
                            aria-label={`${day.day}. ${new Intl.DateTimeFormat(
                              "de-DE",
                              { month: "long", year: "numeric" },
                            ).format(new Date(`${day.key}T12:00:00`))}${
                              isActive ? ", gelernt" : ""
                            }${day.isToday ? ", heute" : ""}`}
                            dateTime={day.key}
                          >
                            {day.day}
                          </time>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <small>Dein Lernstand bleibt ausschließlich auf diesem Gerät.</small>
        </aside>

        <section
          className="student-overview__lesson"
          aria-labelledby="lesson-title"
        >
          <div>
            <p className="eyebrow">Aus deinem Lernen</p>
            <h2 id="lesson-title">
              {snapshot.recentErrors > 0
                ? `${snapshot.recentErrors} unsichere ${snapshot.recentErrors === 1 ? "Antwort" : "Antworten"}`
                : "Kein offener Fehler"}
            </h2>
            <p>
              {snapshot.recentErrors > 0
                ? "Die passenden Wiederholungen liegen in deiner heutigen Auswahl bereit."
                : "Sobald etwas noch wackelt, taucht es automatisch wieder in deiner Runde auf."}
            </p>
          </div>
          <Link
            className="button"
            href={
              snapshot.recentErrors > 0 && primary
                ? primary.route
                : "/lernen/fortschritt"
            }
          >
            {snapshot.recentErrors > 0
              ? "Fehler jetzt üben"
              : "Fortschritt ansehen"}
          </Link>
        </section>

        <section
          className="student-overview__learning-box"
          aria-labelledby="box-title"
        >
          <header>
            <div>
              <p className="eyebrow">Deine LernBox</p>
              <h2 id="box-title">{snapshot.learningBoxTotal} Karten</h2>
            </div>
            <Link href="/lernbox">Alle ansehen →</Link>
          </header>
          <div
            className="student-overview__bars"
            aria-label="Karten nach LernBox-Stufe"
            role="img"
          >
            {snapshot.boxCounts.map((count, index) => (
              <div key={BOXES[index]}>
                <span
                  style={{
                    height: `${Math.max(8, (count / maxBoxCount) * 100)}%`,
                  }}
                />
                <small>{BOXES[index]}</small>
              </div>
            ))}
          </div>
        </section>

        <section
          className="student-overview__support"
          aria-label="Weitere Lernbereiche"
        >
          <article className="student-overview__join">
            <p className="eyebrow">Raum beitreten</p>
            <RoomCodeForm idPrefix="personal-learning-room" mode="room" />
          </article>

          <article>
            <p className="eyebrow">Merkstrecke</p>
            <h2>Stufe {snapshot.memoryStage} von 5</h2>
            <div
              className="student-overview__stages"
              aria-label={`Merkstufe ${snapshot.memoryStage} von 5`}
              role="img"
            >
              {BOXES.map((stage) => (
                <span
                  className={stage <= snapshot.memoryStage ? "is-active" : ""}
                  key={stage}
                />
              ))}
            </div>
            <p>
              Du erhältst genau so viel Hilfe, wie du für den nächsten sicheren
              Abruf brauchst.
            </p>
            <Link href="/frei/german/lernwoerter">Lernwörter öffnen →</Link>
          </article>

          <article>
            <p className="eyebrow">Mein Haus</p>
            <h2>Mission: 100 sichere Antworten</h2>
            <div className="student-overview__mission">
              <span style={{ width: `${snapshot.missionProgress}%` }} />
            </div>
            <strong>{snapshot.missionProgress} / 100</strong>
            <Link href="/lernen/aufgaben">Aufgaben und Leistungs-QR →</Link>
          </article>
        </section>
      </div>
    </StudentDashboardShell>
  );
}
