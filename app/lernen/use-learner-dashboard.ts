"use client";

import { useEffect, useMemo, useState } from "react";
import type { LearningRecommendation } from "../../src/domain/learning-recommendation";
import { createLearningRecommendationRepository } from "../../src/storage/learning-recommendations";
import { PersonalLearningDatabase } from "../../src/storage/personal-learning-events";
import { createStudentClassesRepository } from "../../src/storage/student-classes";
import { countStreak, localDayKey } from "./dashboard-data";

export type DashboardSnapshot = {
  loaded: boolean;
  className: string | null;
  recommendations: LearningRecommendation[];
  completedToday: number;
  activeDays: string[];
  streak: number;
  difficult: Array<{ label: string; detail: string; route: string }>;
};

const EMPTY: DashboardSnapshot = {
  loaded: false,
  className: null,
  recommendations: [],
  completedToday: 0,
  activeDays: [],
  streak: 0,
  difficult: [],
};

/** Lädt Lernstand, Empfehlungen und Klasse für die Lernen-Startseite. */
export function useLearnerDashboard() {
  const database = useMemo(() => new PersonalLearningDatabase(), []);
  const recommendations = useMemo(
    () => createLearningRecommendationRepository(database),
    [database],
  );
  const classes = useMemo(() => createStudentClassesRepository(), []);
  const [snapshot, setSnapshot] = useState(EMPTY);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const now = new Date();
      const [items, events, cards, words, memberships] = await Promise.all([
        recommendations.list({
          enabledModules: ["vocabulary", "german", "mathematics", "typing"],
        }),
        database.learningEvents.toArray(),
        database.learningBoxCards.toArray(),
        database.learningWordProgress.toArray(),
        classes.list().catch(() => []),
      ]);
      if (!active) return;
      const today = localDayKey(now);
      const activeDays = [
        ...new Set(events.map((event) => localDayKey(event.occurredAt))),
      ];
      setSnapshot({
        loaded: true,
        className: memberships[0]?.className ?? null,
        recommendations: items,
        completedToday: events.filter(
          (event) => localDayKey(event.occurredAt) === today,
        ).length,
        activeDays,
        streak: countStreak(activeDays, now),
        // Schwierig: Lernwörter mit Fehlern und zuletzt geübte Karten in Box 1.
        difficult: [
          ...words
            .filter((word) => word.incorrectAttempts > 0 && word.box <= 2)
            .sort(
              (left, right) => right.incorrectAttempts - left.incorrectAttempts,
            )
            .map((word) => ({
              label: word.word,
              detail: `${word.incorrectAttempts}×falsch`,
              route: "/frei/german/lernwoerter",
            })),
          ...cards
            .filter((card) => card.box === 1 && card.lastReviewed > 0)
            .sort((left, right) => right.lastReviewed - left.lastReviewed)
            .map((card) => ({
              label: card.question,
              detail: "Box 1",
              route: `/lernbox?stapel=${encodeURIComponent(card.deckId)}`,
            })),
        ].slice(0, 3),
      });
    };
    void load().catch(() => {
      if (active) setSnapshot((current) => ({ ...current, loaded: true }));
    });
    return () => {
      active = false;
      database.close();
    };
  }, [classes, database, recommendations]);

  return snapshot;
}
