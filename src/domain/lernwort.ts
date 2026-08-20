import { addDays, BOX_INTERVAL_DAYS } from "./leitner.ts";
import type { DirectionProgressV1, EntityId, IsoDateTime } from "./learning-bundle.ts";

/**
 * "07 - Adaptive Merkstrecke": wie viel Vorlage ein Lernwort noch braucht, von
 * "vollständiges Wort abschreiben" (1) bis "verdeckt aus dem Gedächtnis tippen,
 * mehrere Wörter gleichzeitig" (5). Getrennt von der Leitner-Box, die nur
 * bestimmt, *wann* wiederholt wird — ein Wort kann auf der höchsten Merkstufe
 * stehen und wegen eines neuen Fehlers trotzdem kurzfristig fällig sein.
 */
export type MerkstufeV1 = 1 | 2 | 3 | 4 | 5;
export type LernwortBox = DirectionProgressV1["box"];

export interface LernwortProgressV1 {
  learningObjectId: EntityId;
  stage: MerkstufeV1;
  box: LernwortBox;
  dueAt: IsoDateTime;
  lastEventId?: EntityId;
  /** Aufeinanderfolgende Fehler auf der aktuellen Stufe — Grundlage für die Rückstufung. */
  consecutiveMistakes: number;
}

export function initialLernwortProgress(learningObjectId: EntityId, now: IsoDateTime): LernwortProgressV1 {
  return { learningObjectId, stage: 1, box: 1, dueAt: now, consecutiveMistakes: 0 };
}

export function isDue(progress: LernwortProgressV1, now: IsoDateTime): boolean {
  return progress.dueAt <= now;
}

function dueAtForBox(box: LernwortBox, now: IsoDateTime): IsoDateTime {
  return addDays(now, BOX_INTERVAL_DAYS[box]);
}

/**
 * Nach wie vielen Fehlern in Folge eine Merkstufe zurückgestuft wird. Im Plan
 * unter "19 - Entscheidungsprotokoll", Punkt 11 ausdrücklich als offener Punkt
 * genannt ("Regeln für automatische Rückstufung bei Lernwörtern festlegen") —
 * 3 spiegelt den bereits an anderer Stelle verwendeten Standardwert für
 * Fehlversuche (Freies Üben in Laufdiktat) und ist ein bewusster Startwert,
 * kein endgültig kalibrierter.
 */
export const MISTAKE_STAGE_DROP_THRESHOLD = 3;

export interface LernwortResult {
  correct: boolean;
  usedHelp: boolean;
  selfCorrected: boolean;
}

/**
 * "Fehlerfrei und ohne Hilfe führt zur nächsten Merkstufe. Eine falsch
 * abgesendete Lösung oder verwendete Hilfe hält das Wort in der Stufe.
 * Wiederholte Fehler können zu einer niedrigeren Merkstufe führen."
 *
 * Die Leitner-Box folgt derselben Grundregel wie bei Vokabeln: richtig und
 * ohne Hilfe steigt eine Box, Hilfe/Lösung verwendet hält die Box, ein
 * tatsächlicher Fehler fällt auf Box 1 zurück (die Rechtschreibung selbst
 * ist hier die einzige geprüfte Fähigkeit, es gibt keine getrennte
 * "Bedeutung"-Spur wie bei Vokabeln). Der mehrtägige Box-Rhythmus greift erst,
 * sobald ein Wort *bereits* auf Stufe 5 steht (schon einmal im Block bestanden)
 * — der Übergang 4 -> 5 selbst hält das Wort noch sofort fällig, sonst gäbe es
 * nie eine Gelegenheit für die allererste Block-Übung auf Stufe 5. Sonst würde
 * der Box-Rhythmus außerdem das Durchlaufen der Merkstrecke selbst über Tage
 * strecken, statt nur die Wiederholung nach dem Merken zu takten.
 */
export function applyLernwortResult(progress: LernwortProgressV1, result: LernwortResult, now: IsoDateTime): LernwortProgressV1 {
  const wasGraduated = progress.stage === 5;

  if (!result.correct) {
    const consecutiveMistakes = progress.consecutiveMistakes + 1;
    const dropsStage = consecutiveMistakes >= MISTAKE_STAGE_DROP_THRESHOLD && progress.stage > 1;
    const stage = dropsStage ? ((progress.stage - 1) as MerkstufeV1) : progress.stage;
    return {
      ...progress,
      stage,
      consecutiveMistakes: dropsStage ? 0 : consecutiveMistakes,
      box: 1,
      dueAt: now, // box 1 is always due right away, graduated or not
    };
  }

  const canAdvance = !result.usedHelp && !result.selfCorrected;
  if (!canAdvance) {
    return { ...progress, consecutiveMistakes: 0 };
  }

  const stage = progress.stage < 5 ? ((progress.stage + 1) as MerkstufeV1) : 5;
  const box = progress.box < 5 ? ((progress.box + 1) as LernwortBox) : 5;
  const dueAt = wasGraduated ? dueAtForBox(box, now) : now;
  return { ...progress, stage, box, dueAt, consecutiveMistakes: 0 };
}

// --- Merkstufen-Darstellung: reine, deterministische Hilfsfunktionen ---

const fmix32 = (x: number): number => {
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
};

function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministisch nach Buchstaben (nicht Leerzeichen/Satzzeichen) sortierte Positionsauswahl, gleiche seed -> gleiches Ergebnis. */
function pickLetterIndicesToHide(word: string, seed: string, fraction: number): Set<number> {
  const letterIndices: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (/\p{L}/u.test(word[i])) letterIndices.push(i);
  }
  if (letterIndices.length === 0) return new Set();
  const count = Math.min(letterIndices.length, Math.max(1, Math.round(letterIndices.length * fraction)));
  const seedHash = hashStr(seed);
  const ranked = letterIndices
    .map((idx, pos) => ({ idx, score: fmix32(seedHash ^ fmix32(pos)) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map((entry) => entry.idx);
  return new Set(ranked);
}

export interface GapMaskChar {
  char: string;
  hidden: boolean;
}

/** Stufe 2/3: das Wort mit einem Anteil (fraction) verdeckter Buchstaben, als Vorlage zum Ergänzen. */
export function buildGapMask(word: string, seed: string, fraction: number): GapMaskChar[] {
  const hidden = pickLetterIndicesToHide(word, seed, fraction);
  return Array.from(word).map((char, i) => ({ char, hidden: hidden.has(i) }));
}

export const STAGE2_HIDE_FRACTION = 0.25;
export const STAGE3_HIDE_FRACTION = 0.6;

export function buildStage2Mask(word: string, seed: string): GapMaskChar[] {
  return buildGapMask(word, seed, STAGE2_HIDE_FRACTION);
}

export function buildStage3Mask(word: string, seed: string): GapMaskChar[] {
  return buildGapMask(word, seed, STAGE3_HIDE_FRACTION);
}

/** Stufe 4: Längenstriche statt Buchstaben, Leerzeichen bleiben sichtbar. */
export function wordLengthPlaceholder(word: string): string {
  return Array.from(word).map((char) => (char === " " ? " " : "_")).join("");
}

/**
 * Stufe 5, Block-Abfrage ohne feste Reihenfolge: jede getippte Antwort wird
 * gegen die noch nicht zugeordneten Zielwörter geprüft (verbraucht bei Treffer
 * genau ein Vorkommen, damit doppelte Wörter auch doppelt richtig sein müssen).
 * Ergebnis ist pro Zielwort, nicht pro Eingabe — genau das, was
 * applyLernwortResult je Wort braucht.
 */
export function scoreBlockAnswers(targets: string[], typedAnswers: string[]): boolean[] {
  const normalize = (s: string) => s.trim().toLocaleLowerCase();
  const remaining = typedAnswers.map(normalize);
  return targets.map((target) => {
    const idx = remaining.indexOf(normalize(target));
    if (idx === -1) return false;
    remaining.splice(idx, 1);
    return true;
  });
}
