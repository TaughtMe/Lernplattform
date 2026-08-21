import { vocabularyFingerprint, type VocabularyItemV1 } from "../domain/learning-bundle.ts";
import { seededShuffle } from "./duell-random.ts";

/**
 * Vier der sechs in "09 - Duelle" genannten Duellarten — "gemeinsamer
 * Lehrerstapel" und "Lehrerduell" brauchen vom Lehrer veröffentlichte,
 * geteilte Stapel, die es als Konzept noch nicht gibt (das Lehrer-Cockpit
 * ist bewusst air-gapped, ohne Verbindung zu den Supabase-Duellen) — bewusst
 * nicht in dieser ersten Ausbaustufe.
 */
export type DuellArt = "herausforderer-stapel" | "wechselduell" | "schwierige-woerter" | "zufaellige-woerter";

export interface DuellCandidate {
  item: VocabularyItemV1;
  /** Niedrigster aktueller Boxwert der Schreibung über beide Abfragerichtungen — Grundlage für "schwierige Wörter". */
  minWritingBox: number;
}

export interface DuellWord {
  itemId: string;
  prompt: string;
  promptLocale: string;
  answer: string;
  answerLocale: string;
  alternatives: string[];
}

export const DEFAULT_ROUND_SIZE = 12;

function toDuellWord(candidate: DuellCandidate): DuellWord {
  const { item } = candidate;
  return {
    itemId: item.id,
    prompt: item.prompt.text,
    promptLocale: item.prompt.locale,
    answer: item.answer.text,
    answerLocale: item.answer.locale,
    alternatives: item.answer.alternatives ?? [],
  };
}

function dedupByFingerprint(candidates: DuellCandidate[]): DuellCandidate[] {
  const seen = new Set<string>();
  const result: DuellCandidate[] = [];
  for (const candidate of candidates) {
    const fingerprint = vocabularyFingerprint(candidate.item);
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    result.push(candidate);
  }
  return result;
}

/**
 * `participantCandidates[0]` ist immer der/die Ersteller:in (Herausforderer),
 * weitere Einträge sind spätere Beitretende in Beitrittsreihenfolge. `seed`
 * bestimmt nur die Auswortauswahl bei "zufällige Wörter" — die
 * Bearbeitungsreihenfolge jeder einzelnen Person kommt separat aus
 * duell-shuffle-artiger Logik (siehe Aufrufer).
 */
export function assembleDuellContent(
  art: DuellArt,
  participantCandidates: DuellCandidate[][],
  seed: string,
  roundSize: number = DEFAULT_ROUND_SIZE,
): DuellWord[] {
  if (participantCandidates.length === 0 || participantCandidates[0].length === 0) return [];

  switch (art) {
    case "herausforderer-stapel": {
      const pool = dedupByFingerprint(participantCandidates[0]);
      return pool.slice(0, roundSize).map(toDuellWord);
    }
    case "wechselduell": {
      const fromA = dedupByFingerprint(participantCandidates[0]);
      const fromB = dedupByFingerprint(participantCandidates[1] ?? []);
      const half = Math.ceil(roundSize / 2);
      const pickedA = fromA.slice(0, half);
      const pickedAFingerprints = new Set(pickedA.map((c) => vocabularyFingerprint(c.item)));
      const pickedB = fromB.filter((c) => !pickedAFingerprints.has(vocabularyFingerprint(c.item))).slice(0, roundSize - pickedA.length);
      return [...pickedA, ...pickedB].map(toDuellWord);
    }
    case "schwierige-woerter": {
      const pool = dedupByFingerprint(participantCandidates.flat());
      const sorted = [...pool].sort((a, b) => a.minWritingBox - b.minWritingBox);
      return sorted.slice(0, roundSize).map(toDuellWord);
    }
    case "zufaellige-woerter": {
      const pool = dedupByFingerprint(participantCandidates.flat());
      return seededShuffle(pool, seed)
        .slice(0, roundSize)
        .map(toDuellWord);
    }
  }
}
