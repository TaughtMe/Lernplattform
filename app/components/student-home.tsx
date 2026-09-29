"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CLASS_MODULE_LABELS } from "../../src/domain/class-workspace";
import type { LearningRecommendation } from "../../src/domain/learning-recommendation";
import { createLearningRecommendationRepository } from "../../src/storage/learning-recommendations";
import { PersonalLearningDatabase } from "../../src/storage/personal-learning-events";
import { StudentDashboardShell } from "./student-dashboard-shell";
import { learnerDisplayName } from "../../src/domain/learner-profile";
import { useAreaVisible } from "../release/release-context";
import { AnimalImage } from "../ui/animal";
import { Icon } from "../ui/icons";
import { ProgressBar, ProgressRing } from "../ui/primitives";
import { useLearnerProfile } from "../ui/use-learner-profile";

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
  difficult: Array<{
    label: string;
    kind: "LernBox" | "Lernwort";
    route: string;
  }>;
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
  difficult: [],
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

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;
const WEEKDAY_NAMES = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
] as const;

/** Montag bis Sonntag der aktuellen Woche. */
export function currentWeek(today = new Date()) {
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return WEEKDAYS.map((short, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      key: localDayKey(date),
      short,
      label: WEEKDAY_NAMES[index]!,
      isToday: localDayKey(date) === localDayKey(today),
    };
  });
}

export function StudentHome() {
  const database = useMemo(() => new PersonalLearningDatabase(), []);
  const recommendations = useMemo(
    () => createLearningRecommendationRepository(database),
    [database],
  );
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const profile = useLearnerProfile();
  // Serie und Abzeichen nur mit freigegebener Motivation (Entscheidung 47).
  const motivation = useAreaVisible("motivation");
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
        // Schwierig: zuletzt geübte Karten in Box 1 und Lernwörter mit Fehlern.
        difficult: [
          ...cards
            .filter((card) => card.box === 1 && card.lastReviewed > 0)
            .sort((left, right) => right.lastReviewed - left.lastReviewed)
            .map((card) => ({
              label: card.question,
              kind: "LernBox" as const,
              route: `/lernbox?stapel=${encodeURIComponent(card.deckId)}`,
            })),
          ...words
            .filter((word) => word.incorrectAttempts > 0 && word.box <= 2)
            .sort((left, right) =>
              right.lastPracticedAt.localeCompare(left.lastPracticedAt),
            )
            .map((word) => ({
              label: word.word,
              kind: "Lernwort" as const,
              route: "/frei/german/lernwoerter",
            })),
        ].slice(0, 3),
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

  const weekDays = currentWeek(new Date());
  const activeThisWeek = weekDays.filter((day) =>
    snapshot.activeDays.includes(day.key),
  ).length;
  const openToday = Math.max(0, DAILY_TARGET - snapshot.completedToday);

  return (
    <StudentDashboardShell activePath="/lernen">
      <div className="ui-dash">
        <section className="ui-dash__main" aria-labelledby="home-title">
          <div className="ui-between ui-dash__head">
            <div>
              <p className="ui-small ui-muted" suppressHydrationWarning>
                {new Intl.DateTimeFormat("de-DE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }).format(new Date())}
              </p>
              <h1 id="home-title" className="ui-h-page">
                Meine Startseite
              </h1>
            </div>
          </div>

          <div className="ui-dash__stage">
            <div
              className="ui-animal-stage ui-dash__ring"
              role="img"
              aria-label={`${snapshot.completedToday} von ${DAILY_TARGET} Schritten heute`}
            >
              <ProgressRing
                value={snapshot.completedToday}
                max={DAILY_TARGET}
                size={230}
                stroke={10}
              />
              <span className="ui-animal-disc ui-dash__disc">
                <AnimalImage animal={profile?.animal ?? null} size={150} />
              </span>
              {motivation && snapshot.streak > 0 ? (
                <span className="ui-streak-badge">
                  <Icon name="bolt" size={14} /> {snapshot.streak}{" "}
                  {snapshot.streak === 1 ? "Tag" : "Tage"}
                </span>
              ) : null}
            </div>
            <p className="ui-h-fun ui-dash__name">
              {profile ? learnerDisplayName(profile) : "Dein Lernraum"}
            </p>
            <p className="ui-muted ui-center">
              {snapshot.completedToday >= DAILY_TARGET
                ? "Tagesziel erreicht – alles Weitere ist ein Extra."
                : `${snapshot.completedToday} von ${DAILY_TARGET} Schritten heute · noch ${openToday}`}
            </p>
          </div>

          <section
            className="ui-card ui-card--pad ui-stack ui-dash__today"
            aria-labelledby="today-title"
          >
            <div className="ui-between">
              <h2 id="today-title" className="ui-h-section">
                Heute üben
              </h2>
              {primary ? (
                <span className="ui-pill ui-pill--accent">
                  {CLASS_MODULE_LABELS[primary.module]}
                </span>
              ) : null}
            </div>
            {loading ? (
              <div className="ui-bar" aria-hidden="true" />
            ) : (
              <p className="ui-muted">
                {primary
                  ? `${taskAmount} ${taskAmount === 1 ? "Aufgabe" : "Aufgaben"}, etwa ${estimatedMinutes} Minuten. ${primary.detail}`
                  : "Heute ist alles geschafft. Neue Wiederholungen erscheinen hier, sobald du lernst."}
              </p>
            )}
            {primary ? (
              <div
                className="ui-row ui-wrap"
                role="list"
                aria-label="Zusammensetzung der Runde"
              >
                {primary.reason === "error" ? (
                  <span className="ui-pill ui-pill--bad" role="listitem">
                    Aus deinem letzten Fehler
                  </span>
                ) : null}
                {dueCount > 0 ? (
                  <span className="ui-pill" role="listitem">
                    {dueCount} fällig
                  </span>
                ) : null}
                {difficultCount > 0 ? (
                  <span className="ui-pill" role="listitem">
                    {difficultCount} schwierig
                  </span>
                ) : null}
              </div>
            ) : null}
            <Link
              className="ui-btn ui-btn--dark ui-btn--lg ui-btn--block"
              href={primary?.route ?? "/lernen/material"}
            >
              {primary ? (
                <span className="ui-sr-only">{primary.title}. </span>
              ) : null}
              <Icon name="arrow" size={18} /> Weiterlernen
            </Link>
          </section>
        </section>

        <aside className="ui-dash__side" aria-label="Dein Lernüberblick">
          <section className="ui-card ui-card--soft ui-card--pad ui-stack">
            <div className="ui-between">
              <h2 className="ui-h-section">Diese Woche</h2>
              <span className="ui-small ui-muted">
                {activeThisWeek} von 7 Tagen
              </span>
            </div>
            <ol className="ui-dash__week" aria-label="Aktive Tage dieser Woche">
              {weekDays.map((day) => {
                const active = snapshot.activeDays.includes(day.key);
                return (
                  <li
                    key={day.key}
                    className={`${active ? "is-done" : ""}${day.isToday ? " is-today" : ""}`}
                    aria-label={`${day.label}: ${active ? "geübt" : "nicht geübt"}`}
                  >
                    {day.short}
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="ui-card ui-card--soft ui-card--pad ui-stack">
            <div className="ui-between">
              <h2 className="ui-h-section">Heute fällig</h2>
              <span className="ui-h-section ui-dash__count">
                {dueCount + difficultCount}
              </span>
            </div>
            <ProgressBar
              value={snapshot.completedToday}
              max={Math.max(
                1,
                snapshot.completedToday + dueCount + difficultCount,
              )}
              label="Heute erledigt"
            />
            <p className="ui-small ui-muted">
              {dueCount + difficultCount > 0
                ? "Wiederholungen aus deinen Lernbereichen, Fehler zuerst."
                : "Nichts fällig. Du kannst frei üben."}
            </p>
          </section>

          <section className="ui-card ui-card--soft ui-card--pad ui-stack">
            <h2 className="ui-h-section">Schwierige Wörter</h2>
            {snapshot.difficult.length ? (
              <>
                <ul className="ui-dash__difficult">
                  {snapshot.difficult.map((item) => (
                    <li key={`${item.kind}-${item.label}`}>
                      <strong className="ui-truncate">{item.label}</strong>
                      <span className="ui-pill">{item.kind}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  className="ui-btn ui-btn--ghost ui-btn--sm"
                  href={snapshot.difficult[0]!.route}
                >
                  Nur diese üben
                </Link>
              </>
            ) : (
              <p className="ui-small ui-muted">
                {snapshot.recentErrors > 0
                  ? `${snapshot.recentErrors} Fehler in den letzten 7 Tagen – sie kommen in „Heute üben“ wieder.`
                  : "Noch keine schwierigen Wörter. Fehler aus Übungen erscheinen hier."}
              </p>
            )}
          </section>

          <section className="ui-stack" aria-label="Alle Lernbereiche">
            <h2 className="ui-label">Alle Lernbereiche</h2>
            <div className="ui-grid2">
              <Link
                className="ui-card ui-card--pad ui-dash__area"
                href="/lernbox"
              >
                <Icon name="cards" size={20} />
                <strong>LernBox</strong>
                <small className="ui-tiny ui-muted">
                  {snapshot.learningBoxTotal
                    ? `${snapshot.learningBoxTotal} Karten`
                    : "Karten anlegen"}
                </small>
              </Link>
              <Link
                className="ui-card ui-card--pad ui-dash__area"
                href="/lernen/material"
              >
                <Icon name="learn" size={20} />
                <strong>Lernwerkstatt</strong>
                <small className="ui-tiny ui-muted">alle Übungen</small>
              </Link>
            </div>
          </section>

          <p className="ui-tiny ui-muted">
            Dein Lernstand bleibt ausschließlich auf diesem Gerät.
          </p>
        </aside>
      </div>
    </StudentDashboardShell>
  );
}
