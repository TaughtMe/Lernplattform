import type { LearningEventV1, LearningProgressV1 } from "../domain/learning-bundle.ts";
import type { LernwortProgressV1 } from "../domain/lernwort.ts";

/**
 * Alle Werte sind kumulativ (Stand seit jeher), nicht auf einen Zeitraum
 * begrenzt — der Wochenanteil ergibt sich erst durch die Differenz zweier
 * Übertragungen (siehe computeWeeklyDelta). Das macht erneutes Zeigen
 * desselben QR-Codes ungefährlich, wie im Entscheidungsprotokoll gefordert.
 */
export interface RankingTotals {
  /** Anzahl LernBox-Ereignisse mit korrekt geschriebener Antwort. */
  correctAnswers: number;
  /** Davon ohne Hilfe und ohne Selbstkorrektur — "sauber" richtig. */
  cleanAnswers: number;
  /** Richtige Antwort für ein Lernobjekt, das zuvor schon einmal falsch war — "früheren Fehler später richtig". */
  comebackAnswers: number;
  /** Lernwörter, die aktuell Merkstufe 5 erreicht haben. */
  graduatedLernwoerter: number;
  /** Summe aller aktuellen Leitner-Boxstufen (Wissen+Schreibung, beide Abfragerichtungen) — Näherung für "Lernstufen aufgestiegen", da keine Boxwechsel-Historie geführt wird. */
  boxLevelSum: number;
  /** Anzahl verschiedener Kalendertage mit mindestens einem LernBox-Ereignis. */
  activeDays: number;
}

export const ZERO_TOTALS: RankingTotals = {
  correctAnswers: 0,
  cleanAnswers: 0,
  comebackAnswers: 0,
  graduatedLernwoerter: 0,
  boxLevelSum: 0,
  activeDays: 0,
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Tageslimit gegen Punktesammeln durch bloße Wiederholung (siehe Entscheidungsprotokoll, Regel "Häuser, Punkte und Motivation") — Startwert, nicht kalibriert. */
export const DAILY_EVENT_CAP = 30;

/**
 * Erwartet die gesamte bisherige Ereignishistorie (nicht nur einen Zeitraum),
 * weil "früheren Fehler später richtig" wissen muss, ob ein Lernobjekt jemals
 * zuvor falsch war — chronologisch sortiert für eine korrekte Auswertung.
 * Pro Kalendertag zählen höchstens DAILY_EVENT_CAP richtige Antworten für
 * Punkte — spätere Wiederholungen am selben Tag bleiben ohne Zusatzpunkte,
 * verändern aber weiterhin, welche Lernobjekte je einmal falsch waren.
 */
export function computeEventTotals(events: LearningEventV1[]): Pick<RankingTotals, "correctAnswers" | "cleanAnswers" | "comebackAnswers" | "activeDays"> {
  const sorted = [...events].sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : a.occurredAt > b.occurredAt ? 1 : 0));
  const everIncorrect = new Set<string>();
  const activeDaySet = new Set<string>();
  const countedPerDay = new Map<string, number>();
  let correctAnswers = 0;
  let cleanAnswers = 0;
  let comebackAnswers = 0;

  for (const event of sorted) {
    const day = dayKey(event.occurredAt);
    activeDaySet.add(day);
    const wasEverIncorrect = everIncorrect.has(event.learningObjectId);
    if (event.assessment.writing === "correct") {
      const countedToday = countedPerDay.get(day) ?? 0;
      if (countedToday < DAILY_EVENT_CAP) {
        countedPerDay.set(day, countedToday + 1);
        correctAnswers += 1;
        if (event.help === "none" && !event.assessment.selfCorrected) cleanAnswers += 1;
        if (wasEverIncorrect) comebackAnswers += 1;
      }
    } else if (event.assessment.writing === "incorrect") {
      everIncorrect.add(event.learningObjectId);
    }
  }

  return { correctAnswers, cleanAnswers, comebackAnswers, activeDays: activeDaySet.size };
}

export function computeGraduatedCount(progress: LernwortProgressV1[]): number {
  return progress.filter((p) => p.stage === 5).length;
}

export function computeBoxLevelSum(progress: LearningProgressV1[]): number {
  let sum = 0;
  for (const p of progress) {
    sum += p.knowledge["prompt-to-answer"].box + p.knowledge["answer-to-prompt"].box;
    sum += p.writing["prompt-to-answer"].box + p.writing["answer-to-prompt"].box;
  }
  return sum;
}

/** Differenz zweier kumulativer Stände — nie negativ, falls sich z. B. Boxstufen durch Rückstufungen verringert haben. */
export function computeWeeklyDelta(current: RankingTotals, baseline: RankingTotals): RankingTotals {
  return {
    correctAnswers: Math.max(0, current.correctAnswers - baseline.correctAnswers),
    cleanAnswers: Math.max(0, current.cleanAnswers - baseline.cleanAnswers),
    comebackAnswers: Math.max(0, current.comebackAnswers - baseline.comebackAnswers),
    graduatedLernwoerter: Math.max(0, current.graduatedLernwoerter - baseline.graduatedLernwoerter),
    boxLevelSum: Math.max(0, current.boxLevelSum - baseline.boxLevelSum),
    activeDays: Math.max(0, current.activeDays - baseline.activeDays),
  };
}

/** Gewichtung ist ein bewusster Startwert, nicht endgültig kalibriert — wie computePoints bei Tastschreiben. Keine Minuspunkte, Genauigkeit zählt stärker als Menge. */
export const POINTS_PER_CORRECT = 1;
export const POINTS_PER_CLEAN_BONUS = 2;
export const POINTS_PER_COMEBACK_BONUS = 3;
export const POINTS_PER_GRADUATED_LERNWORT = 5;
export const DAILY_GOAL_EVENTS = 10;
export const POINTS_PER_GOAL_DAY = 5;

export function computePoints(totals: RankingTotals, goalDaysMet: number = 0): number {
  return (
    totals.correctAnswers * POINTS_PER_CORRECT +
    totals.cleanAnswers * POINTS_PER_CLEAN_BONUS +
    totals.comebackAnswers * POINTS_PER_COMEBACK_BONUS +
    totals.graduatedLernwoerter * POINTS_PER_GRADUATED_LERNWORT +
    goalDaysMet * POINTS_PER_GOAL_DAY
  );
}

/** ISO-8601-Wochenschlüssel wie "2026-W34", Grundlage für die im Entscheidungsprotokoll geforderten Wochenzeiträume. */
export function currentWeekKey(now: Date = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNumber = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

export interface HouseMissionDef {
  id: string;
  title: string;
  description: string;
  target: number;
  select: (totals: RankingTotals) => number;
}

/**
 * Übersetzung der vier Hausmissionen aus "10 - Häuser, Punkte und Motivation"
 * auf tatsächlich berechenbare Werte — als Summe über alle Hausmitglieder,
 * kumulativ (nicht wochenbegrenzt), da Missionen als längerfristige,
 * gemeinsame Ziele gelesen werden. "Lernstufen aufsteigen" wird mangels
 * geführter Boxwechsel-Historie über die Summe aktueller Boxstufen genähert.
 */
export const HOUSE_MISSIONS: HouseMissionDef[] = [
  { id: "fehler-verbessern", title: "100 Fehler gemeinsam verbessern", description: "Früher falsch beantwortete Aufgaben später richtig lösen.", target: 100, select: (t) => t.comebackAnswers },
  { id: "woerter-sicher", title: "50 Wörter sicher schreiben", description: "Lernwörter bis zur höchsten Merkstufe bringen.", target: 50, select: (t) => t.graduatedLernwoerter },
  { id: "lernstufen-aufsteigen", title: "20 Lernstufen aufsteigen", description: "Angenähert über die Summe aktueller Leitner-Boxstufen.", target: 20, select: (t) => t.boxLevelSum },
  { id: "gemeinsam-lernen", title: "An fünf Tagen gemeinsam lernen", description: "Jedes Hausmitglied hat an mindestens fünf verschiedenen Tagen gelernt.", target: 5, select: (t) => t.activeDays },
];

export interface HouseMissionProgress {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
}

/** "gemeinsam-lernen" bewertet den am wenigsten aktiven Tag im Haus (jede:r muss mitziehen), alle anderen Missionen summieren über alle Mitglieder. */
export function evaluateHouseMissions(memberTotals: RankingTotals[]): HouseMissionProgress[] {
  return HOUSE_MISSIONS.map((mission) => {
    const current =
      mission.id === "gemeinsam-lernen"
        ? memberTotals.length === 0 ? 0 : Math.min(...memberTotals.map(mission.select))
        : memberTotals.reduce((sum, totals) => sum + mission.select(totals), 0);
    return { id: mission.id, title: mission.title, description: mission.description, target: mission.target, current, completed: current >= mission.target };
  });
}
