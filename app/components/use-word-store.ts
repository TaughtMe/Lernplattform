"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LEARNING_WORD_COLLECTIONS } from "../../src/domain/german-learning-content";
import type { LearningWordProgress } from "../../src/domain/learning-word-progress";
import {
  allWordBoxViews,
  type WordBox,
  type WordBoxView,
  type WordBoxWordSource,
} from "../../src/domain/word-box";
import type { WordRoundRecord } from "../../src/domain/word-store-progress";
import { createDailyPlanRepository } from "../../src/storage/daily-plan";
import {
  createLearningWordProgressRepository,
  createWordBoxRepository,
  createWordRoundRepository,
} from "../../src/storage/personal-learning-events";
import { openModuleItems } from "../lernen/plan-today";

export type WordBoxRepository = ReturnType<typeof createWordBoxRepository>;
export type WordRoundRepository = ReturnType<typeof createWordRoundRepository>;
export type LearningWordRepository = ReturnType<
  typeof createLearningWordProgressRepository
>;
export type DailyPlanRepository = ReturnType<typeof createDailyPlanRepository>;
export type WordStoreRepositories = {
  boxes?: WordBoxRepository;
  rounds?: WordRoundRepository;
  progress?: LearningWordRepository;
  plan?: DailyPlanRepository;
};
export type WordStoreStatus = "loading" | "ready" | "unavailable";

/**
 * Tagesportion der Lernwörter (`?heute=1`): Die Wörter der offenen Deutsch-
 * Elemente. `off` heißt, dass die Portion nicht verlangt wurde.
 */
export type WordStorePlan = {
  status: "off" | "loading" | "ready" | "failed";
  words: LearningWordProgress[];
};

/**
 * Lädt Wortboxen, Lernstand und Runden und bietet die Aktionen aus Plan 3.10.
 * Bestwerte und Zähler werden jedes Mal aus den gespeicherten Daten abgeleitet.
 */
export function useWordStore(
  injected?: WordStoreRepositories,
  options: { dailyPlan?: boolean } = {},
) {
  const wantsPlan = options.dailyPlan === true;
  const boxes = useMemo(
    () => injected?.boxes ?? createWordBoxRepository(),
    [injected?.boxes],
  );
  const rounds = useMemo(
    () => injected?.rounds ?? createWordRoundRepository(),
    [injected?.rounds],
  );
  const progress = useMemo(
    () => injected?.progress ?? createLearningWordProgressRepository(),
    [injected?.progress],
  );
  const plan = useMemo(
    () => (wantsPlan ? (injected?.plan ?? createDailyPlanRepository()) : null),
    [injected?.plan, wantsPlan],
  );
  const [todayPlan, setTodayPlan] = useState<WordStorePlan>({
    status: "loading",
    words: [],
  });
  const [status, setStatus] = useState<WordStoreStatus>("loading");
  const [ownBoxes, setOwnBoxes] = useState<WordBox[]>([]);
  const [learning, setLearning] = useState<LearningWordProgress[]>([]);
  const [due, setDue] = useState<LearningWordProgress[]>([]);
  const [savedRounds, setSavedRounds] = useState<WordRoundRecord[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [own, all, dueNow, done] = await Promise.all([
        boxes.list(),
        progress.list(),
        progress.listDue(),
        rounds.list(),
      ]);
      setOwnBoxes(own);
      setLearning(all);
      setDue(dueNow);
      setSavedRounds(done);
      setStatus("ready");
      if (plan) {
        // Ein Fehler hier sperrt nicht den Wortspeicher: freies Üben bleibt möglich.
        try {
          const open = openModuleItems(
            await plan.progress(new Date().toISOString()),
            "german",
          );
          const ids = new Set(open.flatMap((item) => item.objectIds));
          setTodayPlan({
            status: "ready",
            words: all.filter((entry) => ids.has(entry.id)),
          });
        } catch {
          setTodayPlan({ status: "failed", words: [] });
        }
      }
    } catch {
      setStatus("unavailable");
    }
  }, [boxes, rounds, progress, plan]);

  useEffect(() => {
    // Erstes Laden der lokalen Daten; setState folgt erst nach dem Lesen.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten aus IndexedDB laden
    void refresh();
  }, [refresh]);

  const views: WordBoxView[] = useMemo(
    () => allWordBoxViews(ownBoxes, LEARNING_WORD_COLLECTIONS),
    [ownBoxes],
  );

  /** Führt eine Änderung aus und lädt danach neu, auch wenn sie scheitert. */
  const change = useCallback(
    async <T>(action: () => Promise<T>): Promise<T> => {
      try {
        return await action();
      } finally {
        await refresh();
      }
    },
    [refresh],
  );

  return {
    status,
    ownBoxes,
    views,
    progress: learning,
    due,
    /** Wörter der Tagesportion; nur mit `options.dailyPlan`. */
    todayPlan: wantsPlan ? todayPlan : { status: "off" as const, words: [] },
    rounds: savedRounds,
    refresh,
    createBox: (
      title: string,
      words?: readonly string[],
      source?: WordBoxWordSource,
    ) => change(() => boxes.create(title, words, source)),
    renameBox: (id: string, title: string) =>
      change(() => boxes.rename(id, title)),
    addWords: (id: string, words: readonly string[]) =>
      change(() => boxes.addWords(id, words, "eigen")),
    addWordsFrom: (
      id: string,
      words: readonly string[],
      source: WordBoxWordSource,
    ) => change(() => boxes.addWords(id, words, source)),
    renameWord: (id: string, from: string, to: string) =>
      change(() => boxes.renameWord(id, from, to)),
    removeWord: (id: string, word: string) =>
      change(() => boxes.removeWord(id, word)),
    removeBox: (id: string) => change(() => boxes.remove(id)),
    copyCollection: (collectionId: string) =>
      change(() => boxes.copyCollection(collectionId)),
    recordAttempt: progress.recordAttempt,
    saveRound: (round: WordRoundRecord) => change(() => rounds.save(round)),
  };
}
