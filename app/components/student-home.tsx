"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CLASS_MODULE_LABELS } from "../../src/domain/class-workspace";
import type { LearningRecommendation } from "../../src/domain/learning-recommendation";
import { createLearningRecommendationRepository } from "../../src/storage/learning-recommendations";
import { PersonalLearningDatabase } from "../../src/storage/personal-learning-events";
import { StudentDashboardShell } from "./student-dashboard-shell";
import { StudentIdentitySummary } from "./student-identity-summary";

const DAILY_TARGET = 20;
const BOXES = [1, 2, 3, 4, 5] as const;

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
  const database = useMemo(() => new PersonalLearningDatabase(), []);
  const recommendations = useMemo(
    () => createLearningRecommendationRepository(database),
    [database],
  );
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);

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
  const memoryProgress = Math.round(
    (snapshot.memoryStage / BOXES.length) * 100,
  );

  return (
    <StudentDashboardShell
      activePath="/lernen"
      summary={<StudentIdentitySummary />}
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
        <p>Deine Runde für heute: klar priorisiert und direkt startbereit.</p>
      </section>

      <div className="student-overview">
        <section
          className="student-overview__daily"
          aria-labelledby="today-title"
        >
          <div className="student-overview__daily-copy">
            <p className="eyebrow">Tagesaufgabe</p>
            <h2 id="today-title">Heute üben</h2>
            {loading ? (
              <div className="student-dashboard__skeleton" aria-hidden="true" />
            ) : (
              <p className="student-overview__task-summary">
                {primary
                  ? `${taskAmount} ${taskAmount === 1 ? "Aufgabe" : "Aufgaben"}, etwa ${estimatedMinutes} Minuten`
                  : "Heute ist alles geschafft"}
              </p>
            )}
            <p>
              {primary?.detail ??
                "Neue Wiederholungen und passende nächste Schritte erscheinen hier, sobald du lernst."}
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
                className="button button--primary student-overview__start"
                href="/lernen/material"
              >
                Frei üben
              </Link>
            )}
          </div>
        </section>

        <aside
          className="student-overview__context"
          aria-label="Dein Lernüberblick"
        >
          <div className="student-overview__context-line">
            <p className="eyebrow">Serie</p>
            <strong>
              {snapshot.streak > 0
                ? `${snapshot.streak} ${snapshot.streak === 1 ? "Tag" : "Tage"} in Folge`
                : "Noch keine Serie"}
            </strong>
          </div>
          <div className="student-overview__context-line">
            <p className="eyebrow">Tagesziel</p>
            <strong>
              {snapshot.completedToday >= DAILY_TARGET
                ? "Erreicht"
                : `${Math.max(1, DAILY_TARGET - Math.min(snapshot.completedToday, DAILY_TARGET))} Schritte offen`}
            </strong>
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
          </div>
          <div className="student-overview__context-line">
            <p className="eyebrow">Lernstand</p>
            <strong>
              {snapshot.learningBoxTotal > 0
                ? "LernBox ist bereit"
                : "Dein Lernweg beginnt mit der ersten Karte"}
            </strong>
            <div
              className="student-overview__progress"
              aria-label={`${memoryProgress} Prozent der Merkstrecke`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={memoryProgress}
              role="progressbar"
            >
              <span style={{ width: `${memoryProgress}%` }} />
            </div>
            <div className="student-overview__context-links">
              <Link href="/lernen/fortschritt">Fortschritt ansehen</Link>
              <Link href="/lernbox">LernBox öffnen</Link>
              <Link href="/frei/german/lernwoerter">Lernwörter öffnen</Link>
            </div>
          </div>
          <p className="student-overview__local-note">
            Dein Lernstand bleibt ausschließlich auf diesem Gerät.
          </p>
        </aside>
      </div>
    </StudentDashboardShell>
  );
}
