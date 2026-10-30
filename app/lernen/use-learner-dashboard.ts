"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  DailyPlanItem,
  DailyPlanModule,
} from "../../src/domain/daily-plan";
import type { LearningRecommendation } from "../../src/domain/learning-recommendation";
import { createDailyPlanRepository } from "../../src/storage/daily-plan";
import { readHardwareKeyboardSeen } from "../../src/storage/hardware-keyboard";
import { hasPersonalLearningState } from "../../src/storage/learning-state";
import { createLearningRecommendationRepository } from "../../src/storage/learning-recommendations";
import { PersonalLearningDatabase } from "../../src/storage/personal-learning-events";
import { createStudentClassesRepository } from "../../src/storage/student-classes";
import { countStreak, localDayKey } from "./dashboard-data";

/** Stand der Tagesportion: erledigte und alle Elemente, offene je Modul. */
export type DashboardPlan = {
  done: number;
  total: number;
  openByModule: Record<DailyPlanModule, number>;
  /** Modul des ersten offenen Elements; ohne offenes Element `null`. */
  firstOpenModule: DailyPlanModule | null;
  /** Eigene Übungsroute des ersten offenen Elements (z. B. Klassenaufgabe). */
  firstOpenRoute: string | null;
  /** Alle Elemente der Portion und die Schlüssel der offenen (für die Aufgabenkarten). */
  items: Array<Pick<DailyPlanItem, "key" | "module" | "route">>;
  openKeys: string[];
};

export type DashboardSnapshot = {
  loaded: boolean;
  className: string | null;
  recommendations: LearningRecommendation[];
  plan: DashboardPlan;
  activeDays: string[];
  streak: number;
  /** Ob das Gerät Lernstand hat; `null`, solange unbekannt oder nicht lesbar. */
  hasLearningState: boolean | null;
  difficult: Array<{ label: string; detail: string; route: string }>;
};

const EMPTY: DashboardSnapshot = {
  loaded: false,
  className: null,
  recommendations: [],
  plan: {
    done: 0,
    total: 0,
    openByModule: { vocabulary: 0, german: 0, mathematics: 0 },
    firstOpenModule: null,
    firstOpenRoute: null,
    items: [],
    openKeys: [],
  },
  activeDays: [],
  streak: 0,
  hasLearningState: null,
  difficult: [],
};

/** Lädt Lernstand, Empfehlungen und Klasse für die Lernen-Startseite. */
export function useLearnerDashboard() {
  const database = useMemo(() => new PersonalLearningDatabase(), []);
  const recommendations = useMemo(
    () => createLearningRecommendationRepository(database),
    [database],
  );
  const dailyPlan = useMemo(
    () => createDailyPlanRepository(database),
    [database],
  );
  const classes = useMemo(() => createStudentClassesRepository(), []);
  const [snapshot, setSnapshot] = useState(EMPTY);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const now = new Date();
      const [items, progress, events, cards, words, memberships, hasState] =
        await Promise.all([
          recommendations.list({
            enabledModules: ["vocabulary", "german", "mathematics", "typing"],
            // Die Tastenwelt kommt erst vor, wenn schon eine Tastatur benutzt wurde.
            hardwareKeyboard: readHardwareKeyboardSeen(),
          }),
          dailyPlan.progress(now.toISOString()),
          database.learningEvents.toArray(),
          database.learningBoxCards.toArray(),
          database.learningWordProgress.toArray(),
          classes.list().catch(() => []),
          // Unlesbar heißt „unbekannt“: dann keine Hinweise zum Speicherschutz.
          hasPersonalLearningState(database).catch(() => null),
        ]);
      if (!active) return;
      const activeDays = [
        ...new Set(events.map((event) => localDayKey(event.occurredAt))),
      ];
      setSnapshot({
        loaded: true,
        className: memberships[0]?.className ?? null,
        recommendations: items,
        plan: {
          done: progress.done,
          total: progress.total,
          openByModule: progress.openByModule,
          firstOpenModule: progress.openItems[0]?.module ?? null,
          firstOpenRoute: progress.openItems[0]?.route ?? null,
          items: progress.plan.items.map(({ key, module, route }) => ({
            key,
            module,
            ...(route ? { route } : {}),
          })),
          openKeys: progress.openItems.map((item) => item.key),
        },
        activeDays,
        streak: countStreak(activeDays, now),
        hasLearningState: hasState,
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
          // Gespeicherte Box 1 = zuletzt falsch; eine Rückstufung nach Zeit macht
          // eine Karte nicht „schwierig“.
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
      // Dexie 4 öffnet nach `close()` nur mit `disableAutoOpen: false` wieder
      // von selbst; sonst scheitert der zweite Effektlauf unter StrictMode.
      database.close({ disableAutoOpen: false });
    };
  }, [classes, dailyPlan, database, recommendations]);

  return snapshot;
}
