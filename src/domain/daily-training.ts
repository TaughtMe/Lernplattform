import {
  competenceWeakness,
  type CompetenceProfile,
} from "./competence-profile";
import type {
  DailyPlanItem,
  DailyPlanKind,
  DailyPlanModule,
} from "./daily-plan";

/**
 * Tagestraining mit gewählter Dauer (Umsetzungsplan Welle 3, D2-4).
 *
 * Reine Planung: Aus den offenen Elementen der Tagesportion und dem
 * Kompetenzprofil entsteht eine zeitlich begrenzte Abfolge. Die Schätzungen
 * sind Näherungen (kalibrierbar), keine Messung.
 *
 * Reihenfolge: Fehler vor Wiederholungen vor Neuem (das Archivwort als Bonus
 * zuletzt); innerhalb einer Art zuerst die Elemente aus schwachen
 * Teilbereichen, bei Gleichstand die Reihenfolge der Tagesportion.
 *
 * Ende-Regel: Ein Element wird noch aufgenommen, solange die bisher geschätzte
 * Zeit unter der Dauer liegt. Läuft die Zeit während einer Aufgabe ab, wird sie
 * fertig gemacht; erst dann kommt der Abschluss (`trainingStatus`).
 */

export const TRAINING_MINUTES = [10, 20] as const;
export type TrainingMinutes = (typeof TRAINING_MINUTES)[number];

/**
 * Geschätzte Sekunden je Element der Portion. Ein Element ist eine LernBox-Karte
 * (eine Richtung), ein Lernwort oder eine Rechenfamilie (bis fünf Aufgaben).
 */
export const TRAINING_SECONDS: Readonly<Record<DailyPlanModule, number>> = {
  vocabulary: 20,
  german: 45,
  mathematics: 75,
};

/** Übungsroute je Modul mit `?heute=1`: Das Modul zeigt dann nur die Portion. */
export const TRAINING_MODULE_ROUTES: Readonly<Record<DailyPlanModule, string>> =
  {
    vocabulary: "/lernbox?heute=1",
    german: "/frei/german/lernwoerter?heute=1",
    mathematics: "/frei/mathematics?heute=1",
  };

const KIND_ORDER: Readonly<Record<DailyPlanKind, number>> = {
  error: 0,
  review: 1,
  new: 2,
  archive: 3,
};

/** Schwäche eines Elements ohne bekannten Teilbereich: wie ein neuer Teilbereich. */
const UNKNOWN_WEAKNESS = 1;

export type TrainingStep = {
  item: DailyPlanItem;
  /** Geschätzte Dauer in Sekunden. */
  seconds: number;
  /** Teilbereich, aus dem das Element stammt (der schwächste), falls bekannt. */
  area?: { id: string; label: string } | undefined;
  weakness: number;
};

export type TrainingPlan = {
  minutes: TrainingMinutes;
  /** Gewählte Dauer in Millisekunden. */
  budgetMs: number;
  steps: TrainingStep[];
  /** Geschätzte Gesamtdauer der Schritte in Millisekunden (kann die Dauer um eine Aufgabe übersteigen). */
  estimatedMs: number;
  /** Offene Elemente der Portion, die in dieser Zeit nicht mehr drankommen. */
  leftOut: number;
};

function areaIdsOf(
  item: DailyPlanItem,
  objectAreas: CompetenceProfile["objectAreas"],
): string[] {
  const ids = new Set<string>();
  for (const objectId of item.objectIds) {
    for (const areaId of objectAreas.get(objectId) ?? []) ids.add(areaId);
  }
  // Mathe-Elemente heißen `mathematics:<Familie>`; die Familie ist der Teilbereich.
  if (item.module === "mathematics" && item.key.startsWith("mathematics:")) {
    ids.add(`rechenart:${item.key.slice("mathematics:".length)}`);
  }
  return [...ids];
}

/** Schwächster Teilbereich des Elements. */
function weakestArea(item: DailyPlanItem, profile: CompetenceProfile) {
  let weakest: TrainingStep["area"];
  let weakness = UNKNOWN_WEAKNESS;
  let found = false;
  for (const areaId of areaIdsOf(item, profile.objectAreas)) {
    const entry = profile.entries.find((candidate) => candidate.id === areaId);
    if (!entry) continue;
    const score = competenceWeakness(entry);
    if (!found || score > weakness) {
      found = true;
      weakness = score;
      weakest = { id: entry.id, label: entry.label };
    }
  }
  return { area: weakest, weakness };
}

/** Sortiert und kürzt die offenen Elemente der Portion auf die gewählte Dauer. */
export function planTraining(input: {
  /** Offene Elemente der Tagesportion in ihrer Reihenfolge. */
  items: readonly DailyPlanItem[];
  minutes: TrainingMinutes;
  profile: CompetenceProfile;
}): TrainingPlan {
  const budgetMs = input.minutes * 60_000;
  const ranked = input.items
    .map((item, index) => ({
      item,
      index,
      ...weakestArea(item, input.profile),
    }))
    .sort(
      (left, right) =>
        KIND_ORDER[left.item.kind] - KIND_ORDER[right.item.kind] ||
        right.weakness - left.weakness ||
        left.index - right.index,
    );

  const steps: TrainingStep[] = [];
  let estimatedMs = 0;
  for (const entry of ranked) {
    // Solange noch Zeit bleibt, kommt das nächste Element dran (auch wenn es
    // die Dauer überschreitet: Die laufende Aufgabe wird fertig gemacht).
    if (estimatedMs >= budgetMs) break;
    const seconds = TRAINING_SECONDS[entry.item.module];
    steps.push({
      item: entry.item,
      seconds,
      area: entry.area,
      weakness: entry.weakness,
    });
    estimatedMs += seconds * 1000;
  }
  return {
    minutes: input.minutes,
    budgetMs,
    steps,
    estimatedMs,
    leftOut: ranked.length - steps.length,
  };
}

export type TrainingStatus =
  /** Die Zeit läuft, die nächste Aufgabe kommt. */
  | "running"
  /** Die Zeit ist um, die laufende Aufgabe wird noch fertig gemacht. */
  | "finish-current"
  /** Zeit um oder nichts mehr offen, keine Aufgabe läuft: Abschluss. */
  | "closing";

/**
 * Ende-Regel des Trainings. `activeMs` ist die aktive Zeit (D2-5),
 * `taskRunning` heißt, dass eine Aufgabe begonnen und noch nicht beantwortet
 * ist, `stepsLeft` zählt die noch nicht erledigten Schritte.
 */
export function trainingStatus(input: {
  budgetMs: number;
  activeMs: number;
  taskRunning: boolean;
  stepsLeft: number;
}): TrainingStatus {
  const timeUp = input.activeMs >= input.budgetMs;
  if (input.taskRunning) return timeUp ? "finish-current" : "running";
  return timeUp || input.stepsLeft === 0 ? "closing" : "running";
}

/** Ziel eines Schritts: eigene Route des Elements, sonst das Modul mit der Portion. */
export function trainingStepHref(item: DailyPlanItem): string {
  return item.route ?? TRAINING_MODULE_ROUTES[item.module];
}

/** Rundet die geschätzte Dauer auf ganze Minuten, mindestens eine (für die Anzeige). */
export function trainingMinutesLabel(ms: number): number {
  return Math.max(1, Math.round(ms / 60_000));
}
