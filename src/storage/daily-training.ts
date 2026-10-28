import type { CompetenceProfile } from "../domain/competence-profile";
import type { DailyPlanItem } from "../domain/daily-plan";
import { createCompetenceProfileRepository } from "./competence-profile";
import { createDailyPlanRepository } from "./daily-plan";
import { PersonalLearningDatabase } from "./personal-learning-events";

export type DailyTrainingSource = {
  /** Offene Elemente der Tagesportion, in der Reihenfolge der Portion. */
  openItems: DailyPlanItem[];
  done: number;
  total: number;
  profile: CompetenceProfile;
};

/**
 * Liest für das Tagestraining (D2-4) die offenen Elemente der Tagesportion und
 * das Kompetenzprofil. Geplant wird in `planTraining`. Wie auf der
 * Startseite legt der erste Aufruf des Tages die Portion an; sonst wird nichts
 * geschrieben.
 */
export function createDailyTrainingRepository(
  database = new PersonalLearningDatabase(),
) {
  const plan = createDailyPlanRepository(database);
  const competence = createCompetenceProfileRepository(database);
  return {
    load: async (now = new Date()): Promise<DailyTrainingSource> => {
      const [progress, profile] = await Promise.all([
        plan.progress(now.toISOString()),
        competence.load(now.getTime()),
      ]);
      return {
        openItems: progress.openItems,
        done: progress.done,
        total: progress.total,
        profile,
      };
    },
  };
}
