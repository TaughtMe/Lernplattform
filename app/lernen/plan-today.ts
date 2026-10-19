import type {
  DailyPlanItem,
  DailyPlanModule,
} from "../../src/domain/daily-plan";

/** Hinweis der Module, wenn von der Tagesportion nichts mehr offen ist. */
export const PLAN_DONE_NOTICE =
  "Dein Teil für heute ist geschafft. Du kannst frei weiterüben.";

/** Hinweis, wenn die Portion nicht geladen werden konnte; freies Üben geht trotzdem. */
export const PLAN_FAILED_NOTICE =
  "Deine Tagesportion konnte nicht geladen werden. Du kannst trotzdem frei üben.";

/** Die Startseite verlinkt mit `?heute=1` auf die Portion eines Moduls. */
export function wantsDailyPlan(search: string | URLSearchParams) {
  return new URLSearchParams(search).get("heute") === "1";
}

/**
 * Offene Elemente der Portion, die das Modul selbst übt. Elemente mit eigener
 * Route (Klassenaufgaben) führt die Startseite direkt dorthin.
 */
export function openModuleItems(
  progress: { openItems: readonly DailyPlanItem[] },
  module: DailyPlanModule,
): DailyPlanItem[] {
  return progress.openItems.filter(
    (item) => item.module === module && !item.route,
  );
}
