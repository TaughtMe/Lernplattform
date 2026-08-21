import { vocabularyFingerprint, type VocabularyItemV1 } from "../domain/learning-bundle.ts";
import type { LernBoxService } from "../domain/lernbox-service.ts";
import type { DuellCandidate, DuellWord } from "./duell-content.ts";
import type { DuellWordResult } from "./duell-scoring.ts";

/**
 * Drahtformat einer DuellCandidate für die geräteübergreifende Übertragung
 * über duell_candidate_pools: nur das, was zum Zusammenstellen nötig ist
 * (Wort + niedrigster Schreib-Boxwert) -- nie die lokale IndexedDB-`id`,
 * die auf einem fremden Gerät ohnehin bedeutungslos wäre.
 */
export interface RemoteDuellCandidate {
  prompt: string;
  promptLocale: string;
  answer: string;
  answerLocale: string;
  alternatives: string[];
  minWritingBox: number;
}

export function toRemoteDuellCandidates(candidates: DuellCandidate[]): RemoteDuellCandidate[] {
  return candidates.map(({ item, minWritingBox }) => ({
    prompt: item.prompt.text,
    promptLocale: item.prompt.locale,
    answer: item.answer.text,
    answerLocale: item.answer.locale,
    alternatives: item.answer.alternatives ?? [],
    minWritingBox,
  }));
}

/**
 * Baut aus fremden Wortübersichten wieder DuellCandidate-Objekte -- mit einer
 * frisch erzeugten, rein synthetischen `id` (wird nur innerhalb dieser einen
 * Duellrunde als itemId mitgeführt, niemals gegen die eigene LernBox
 * gematcht -- das passiert überall ausschließlich über den Fingerprint).
 */
export function fromRemoteDuellCandidates(remote: RemoteDuellCandidate[]): DuellCandidate[] {
  const now = new Date(0).toISOString();
  return remote.map((r, index) => ({
    minWritingBox: r.minWritingBox,
    item: {
      kind: "vocabulary",
      id: `remote-${index}-${r.prompt}::${r.answer}`,
      prompt: { text: r.prompt, locale: r.promptLocale },
      answer: { text: r.answer, locale: r.answerLocale, alternatives: r.alternatives },
      tagIds: [],
      createdAt: now,
      updatedAt: now,
    } satisfies VocabularyItemV1,
  }));
}

/**
 * Ein Duell-Runde tippt immer nur in eine Richtung (Prompt → Antwort) —
 * anders als das reguläre, zweirichtungs-Leitner-Training in der LernBox.
 * "Fehler beeinflussen die jeweilige Richtung" (siehe "09 - Duelle") heißt
 * hier: nur diese eine Richtung wird beim Boxaufstieg berücksichtigt.
 */
const DUELL_DIRECTION = "prompt-to-answer" as const;

function fingerprintOfWord(word: Pick<DuellWord, "prompt" | "promptLocale" | "answer" | "answerLocale">): string {
  return vocabularyFingerprint({
    prompt: { text: word.prompt, locale: word.promptLocale },
    answer: { text: word.answer, locale: word.answerLocale },
  });
}

/** Alle eigenen Vokabeln mit dem niedrigsten aktuellen Schreib-Boxwert — Grundlage für "schwierige Wörter" und Wechselduelle. */
export async function buildDuellCandidates(lernBox: LernBoxService): Promise<DuellCandidate[]> {
  const stacks = await lernBox.listStacks();
  const itemLists = await Promise.all(stacks.map((stack) => lernBox.listItems(stack.id)));
  const seen = new Set<string>();
  const candidates: DuellCandidate[] = [];
  for (const items of itemLists) {
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      const progress = await lernBox.getProgress(item.id);
      const minWritingBox = Math.min(progress.writing["prompt-to-answer"].box, progress.writing["answer-to-prompt"].box);
      candidates.push({ item, minWritingBox });
    }
  }
  return candidates;
}

/**
 * Verbucht einen Boxaufstieg für jedes im Duell richtig beantwortete Wort,
 * das die/der Teilnehmer:in bereits in der eigenen LernBox hat — Wörter
 * anderer Teilnehmer:innen ohne eigene Entsprechung bleiben unverändert
 * (siehe adoptDuellWords für die freiwillige Übernahme danach). `recordAnswer`
 * sichert über `lastAdvancedRoundId` bereits "höchstens ein Aufstieg pro
 * Runde" — hier wird die Duell-ID als roundId genutzt, das reicht für
 * "höchstens ein Aufstieg je Vokabel pro Duell" ohne weitere Buchführung.
 */
export async function applyDuellBoxAdvances(
  lernBox: LernBoxService,
  duellId: string,
  words: DuellWord[],
  wordResults: DuellWordResult[],
  ownItems: VocabularyItemV1[],
): Promise<void> {
  const ownFingerprints = new Map(ownItems.map((item) => [vocabularyFingerprint(item), item]));
  const correctByItemId = new Map(wordResults.map((r) => [r.itemId, r.correct]));

  for (const word of words) {
    const ownItem = ownFingerprints.get(fingerprintOfWord(word));
    if (!ownItem) continue;
    const correct = correctByItemId.get(word.itemId) ?? false;
    await lernBox.recordAnswer(ownItem, DUELL_DIRECTION, duellId, { knowledgeCorrect: correct, writingCorrect: correct });
  }
}

/** Wörter aus dem Duell, die diese Person noch nicht in ihrer eigenen LernBox hat — Grundlage für den freiwilligen Übernahme-Schritt. */
export function findAdoptableWords(words: DuellWord[], ownItems: VocabularyItemV1[]): DuellWord[] {
  const ownFingerprints = new Set(ownItems.map((item) => vocabularyFingerprint(item)));
  return words.filter((word) => !ownFingerprints.has(fingerprintOfWord(word)));
}

/** Übernimmt ausgewählte Duell-Wörter freiwillig in einen (bestehenden oder neuen) eigenen Stapel. */
export async function adoptDuellWords(lernBox: LernBoxService, words: DuellWord[], stackId: string): Promise<void> {
  for (const word of words) {
    await lernBox.addVocabularyItem(stackId, word.prompt, word.answer, word.answerLocale);
  }
}
