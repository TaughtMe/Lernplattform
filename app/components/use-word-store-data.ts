"use client";

import { useEffect, useMemo, useState } from "react";
import type { LearningWordProgress } from "../../src/domain/learning-word-progress";
import type { WordRoundRecord } from "../../src/domain/word-store-progress";
import {
  createLearningWordProgressRepository,
  createWordRoundRepository,
} from "../../src/storage/personal-learning-events";
import type {
  LearningWordRepository,
  WordRoundRepository,
} from "./use-word-store";

export type WordStoreDataState =
  | { status: "loading" }
  | { status: "unavailable" }
  | {
      status: "ready";
      progress: LearningWordProgress[];
      rounds: WordRoundRecord[];
    };

/** Lädt Lernstand und abgeschlossene Runden des Wortspeichers (nur lesen). */
export function useWordStoreData(injected?: {
  progress?: LearningWordRepository;
  rounds?: WordRoundRepository;
}): WordStoreDataState {
  const progressRepository = useMemo(
    () => injected?.progress ?? createLearningWordProgressRepository(),
    [injected?.progress],
  );
  const roundRepository = useMemo(
    () => injected?.rounds ?? createWordRoundRepository(),
    [injected?.rounds],
  );
  const [state, setState] = useState<WordStoreDataState>({
    status: "loading",
  });

  useEffect(() => {
    let active = true;
    Promise.all([progressRepository.list(), roundRepository.list()])
      .then(([progress, rounds]) => {
        if (active) setState({ status: "ready", progress, rounds });
      })
      .catch(() => {
        if (active) setState({ status: "unavailable" });
      });
    return () => {
      active = false;
    };
  }, [progressRepository, roundRepository]);

  return state;
}
