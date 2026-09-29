"use client";

import { useSyncExternalStore } from "react";
import {
  learnerProfileSchema,
  type LearnerProfile,
} from "../../src/domain/learner-profile";
import { learnerProfileRepository } from "../../src/storage/learner-profile";

/** Aktuelles Tierprofil; auf dem Server und vor dem Laden null. */
export function useLearnerProfile(): LearnerProfile | null {
  const snapshot = useSyncExternalStore(
    learnerProfileRepository.subscribe,
    learnerProfileRepository.snapshot,
    () => null,
  );
  if (!snapshot) return null;
  return learnerProfileSchema.safeParse(JSON.parse(snapshot)).data ?? null;
}
