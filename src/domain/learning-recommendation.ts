import type { ClassModule } from "./class-workspace";

export type LearningRecommendationReason = "error" | "due" | "next-step";

export interface LearningRecommendationCandidate {
  id: string;
  module: ClassModule;
  title: string;
  detail: string;
  route: string;
  reason: LearningRecommendationReason;
  amount: number;
  occurredAt?: string;
  dueAt?: string;
}

export interface LearningRecommendation extends LearningRecommendationCandidate {
  priority: number;
}

const reasonPriority: Record<LearningRecommendationReason, number> = {
  error: 300,
  due: 200,
  "next-step": 100,
};

function recencyBonus(candidate: LearningRecommendationCandidate, now: string) {
  const reference = candidate.occurredAt ?? candidate.dueAt;
  if (!reference) return 0;
  const ageInDays = Math.max(
    0,
    (new Date(now).getTime() - new Date(reference).getTime()) / 86_400_000,
  );
  return Math.max(0, 20 - Math.floor(ageInDays));
}

/**
 * Die Tagesauswahl bleibt überschaubar: pro aktivem Modul erscheint höchstens
 * ein nächster Schritt. Fehler stehen vor Fälligkeiten, Fälligkeiten vor einem
 * neuen Lernschritt; innerhalb derselben Stufe zählt Aktualität.
 */
export function prioritizeLearningRecommendations(input: {
  candidates: readonly LearningRecommendationCandidate[];
  enabledModules: readonly ClassModule[];
  now: string;
  limit?: number;
}): LearningRecommendation[] {
  const enabled = new Set(input.enabledModules);
  const ranked = input.candidates
    .filter(
      (candidate) => enabled.has(candidate.module) && candidate.amount > 0,
    )
    .map((candidate) => ({
      ...candidate,
      priority:
        reasonPriority[candidate.reason] + recencyBonus(candidate, input.now),
    }))
    .sort(
      (left, right) =>
        right.priority - left.priority ||
        left.title.localeCompare(right.title, "de"),
    );

  const selected: LearningRecommendation[] = [];
  const selectedModules = new Set<ClassModule>();
  for (const recommendation of ranked) {
    if (selectedModules.has(recommendation.module)) continue;
    selected.push(recommendation);
    selectedModules.add(recommendation.module);
    if (selected.length >= (input.limit ?? 4)) break;
  }
  return selected;
}
