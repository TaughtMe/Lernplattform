"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  DEFAULT_VOCABULARY_LOCALES,
  parseVocabularyTable,
  type VocabularyDirection,
  type VocabularyLocales,
  type VocabularyPair,
} from "../../../../src/domain/running-dictation";
import type { VocabularyTransferChoice } from "../../../../src/integrations/laufdiktat/live-session";
import type { TeacherContentMode } from "../../../../src/integrations/laufdiktat/teacher-session";
import { createTeacherProfileRepository } from "../../../../src/storage/teacher-class-settings";
import {
  emptyVocabularyPair,
  serializeVocabularyPairs,
} from "../lib/vocabulary-pairs";

type VocabularyContentInput = {
  setSources: Dispatch<SetStateAction<Record<TeacherContentMode, string>>>;
};

/**
 * Vokabel-Inhalt: Paare, Sprachen, Groß-/Kleinschreibung, Tabelleneingabe,
 * Übernahme in die LernBox und die Tags.
 */
export function useVocabularyContent({ setSources }: VocabularyContentInput) {
  const [vocabularyPairs, setVocabularyPairs] = useState<VocabularyPair[]>([
    emptyVocabularyPair(),
  ]);
  const [vocabularyCaseSensitive, setVocabularyCaseSensitive] = useState(false);
  const [vocabularyLocales, setVocabularyLocales] = useState<VocabularyLocales>(
    DEFAULT_VOCABULARY_LOCALES,
  );
  const [vocabularyTableInput, setVocabularyTableInput] = useState("");
  const [direction, setDirection] =
    useState<VocabularyDirection>("left-to-right");
  const [vocabularyTransfer, setVocabularyTransfer] =
    useState<VocabularyTransferChoice>("none");
  // Standard-Tag aus den Lehrer-Einstellungen für übernommene Vokabeln.
  const [lernboxTag, setLernboxTag] = useState("");
  // Tag dieser Runde; leer gilt der Standard-Tag aus den Einstellungen.
  const [roundTag, setRoundTag] = useState("");
  const vocabularyTag = roundTag.trim() || lernboxTag;
  useEffect(() => {
    let active = true;
    void createTeacherProfileRepository()
      .get()
      .then((profile) => {
        if (active && profile?.lernboxTag) setLernboxTag(profile.lernboxTag);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const applyVocabularyPairs = (pairs: VocabularyPair[]) => {
    setVocabularyPairs(pairs);
    setSources((current) => ({
      ...current,
      vocabulary: serializeVocabularyPairs(pairs),
    }));
  };

  /** Paare aus einer Tabelle laden; ohne Treffer bleibt ein leeres Paar. */
  function loadPairsFromTable(table: string) {
    const parsed = parseVocabularyTable(table);
    setVocabularyPairs(parsed.length > 0 ? parsed : [emptyVocabularyPair()]);
  }

  function updateVocabularyPair(
    id: string,
    side: "left" | "right",
    patch: Partial<VocabularyPair["left"]>,
  ) {
    applyVocabularyPairs(
      vocabularyPairs.map((entry) =>
        entry.id === id
          ? { ...entry, [side]: { ...entry[side], ...patch } }
          : entry,
      ),
    );
  }

  /** Eigener LernBox-Tag einer Vokabel; leer nimmt den Standard-Tag. */
  function updateVocabularyTag(id: string, tag: string) {
    applyVocabularyPairs(
      vocabularyPairs.map((entry) => {
        if (entry.id !== id) return entry;
        const next: VocabularyPair = { ...entry };
        if (tag.trim()) next.tag = tag;
        else delete next.tag;
        return next;
      }),
    );
  }

  function removeVocabularyPair(id: string) {
    const next = vocabularyPairs.filter((entry) => entry.id !== id);
    applyVocabularyPairs(next.length > 0 ? next : [emptyVocabularyPair()]);
  }

  function addVocabularyPair() {
    applyVocabularyPairs([...vocabularyPairs, emptyVocabularyPair()]);
  }

  function importVocabularyTable() {
    const imported = parseVocabularyTable(vocabularyTableInput).map((pair) => ({
      ...pair,
      id: crypto.randomUUID(),
    }));
    if (!imported.length) return;
    applyVocabularyPairs(imported);
    setVocabularyTableInput("");
  }

  return {
    direction,
    vocabularyCaseSensitive,
    vocabularyLocales,
    vocabularyTransfer,
    setVocabularyTransfer,
    setRoundTag,
    vocabularyTag,
    loadPairsFromTable,
    /** Felder, die `TeacherLiveModel` unverändert übernimmt. */
    model: {
      vocabularyPairs,
      vocabularyCaseSensitive,
      setVocabularyCaseSensitive,
      vocabularyLocales,
      setVocabularyLocales,
      vocabularyTableInput,
      setVocabularyTableInput,
      direction,
      setDirection,
      vocabularyTransfer,
      setVocabularyTransfer,
      lernboxTag,
      roundTag,
      setRoundTag,
      applyVocabularyPairs,
      updateVocabularyPair,
      updateVocabularyTag,
      removeVocabularyPair,
      addVocabularyPair,
      importVocabularyTable,
    },
  };
}
