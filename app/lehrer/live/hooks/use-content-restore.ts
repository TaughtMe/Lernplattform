"use client";

import type { Dispatch, SetStateAction } from "react";
import type { VocabularyDirection } from "../../../../src/domain/running-dictation";
import type { TeacherPreparedSettings } from "../../../../src/domain/teacher-content-library";
import type { LiveSession } from "../../../../src/integrations/laufdiktat/live-session";
import type { VocabularyTransferChoice } from "../../../../src/integrations/laufdiktat/live-session";
import type { WordStoreTransferChoice } from "../../../../src/integrations/laufdiktat/live-session";
import type { TeacherContentMode } from "../../../../src/integrations/laufdiktat/teacher-session";
import { gameSettingsPatchOf } from "../../prepared-settings";
import type { GameSettings } from "./use-game-settings";

type ContentRestoreInput = {
  setContentMode: Dispatch<SetStateAction<TeacherContentMode>>;
  setSources: Dispatch<SetStateAction<Record<TeacherContentMode, string>>>;
  loadPairsFromTable: (table: string) => void;
  patchSettings: (patch: Partial<GameSettings>) => void;
  setVocabularyTransfer: Dispatch<SetStateAction<VocabularyTransferChoice>>;
  setWordStoreTransfer: Dispatch<SetStateAction<WordStoreTransferChoice>>;
  setRoundTag: Dispatch<SetStateAction<string>>;
  setRestoredClassSeal: Dispatch<SetStateAction<string | undefined>>;
  setDirection: Dispatch<SetStateAction<VocabularyDirection>>;
  setVocabularyCaseSensitive: Dispatch<SetStateAction<boolean>>;
};

/**
 * Inhalt und Optionen eines wiederaufgenommenen Raums zurück in den Editor
 * holen. Der Hook hat keine Effekte; den Raum selbst liest und setzt der
 * Sitzungs-Hook, der diese Funktion in seinem Wiederaufnahme-Effekt aufruft.
 * Ebenso holt `applyPreparedSettings` Modus und Optionen eines vorbereiteten
 * Inhalts der Ablage in den Editor.
 */
export function useContentRestore({
  setContentMode,
  setSources,
  loadPairsFromTable,
  patchSettings,
  setVocabularyTransfer,
  setWordStoreTransfer,
  setRoundTag,
  setRestoredClassSeal,
  setDirection,
  setVocabularyCaseSensitive,
}: ContentRestoreInput) {
  function applyRestoredContent(restored: LiveSession) {
    const restoredContent = restored.words[0]?.kind ?? "text";
    const nextContentMode: TeacherContentMode =
      restoredContent === "vocabulary"
        ? "vocabulary"
        : restoredContent === "math"
          ? "math"
          : "text";
    const restoredSource = restored.words
      .map((word) =>
        nextContentMode === "vocabulary"
          ? `${word.prompt ?? ""};${word.targetWord}`
          : nextContentMode === "math"
            ? (word.prompt ?? word.targetWord)
            : word.targetWord,
      )
      .join("\n");
    setContentMode(nextContentMode);
    setSources((current) => ({
      ...current,
      [nextContentMode]: restoredSource,
    }));
    if (nextContentMode === "vocabulary") {
      loadPairsFromTable(restoredSource);
    }
    patchSettings({
      gameMode: restored.stationMode ? "STATION" : restored.gameMode,
      shuffleWords: restored.shuffleWords,
      stationShuffle: restored.stationShuffle,
      repeatWrongAnswers: restored.repeatWrongAnswers,
      assistance: restored.uebungAssistanceEnabled,
      attempts: restored.uebungMaxAttempts,
      tts: restored.isTtsEnabled,
      showStars: restored.showStars,
      strictTyping: restored.strictTypingMode,
      taskHelp: restored.showTaskAfterErrors,
      stationCount: restored.stationCount,
      battleInk: restored.battleOptions.ink,
      battleFlicker: restored.battleOptions.flicker,
    });
    setVocabularyTransfer(restored.vocabularyTransfer);
    setWordStoreTransfer(restored.wordStoreTransfer);
    setRoundTag(restored.vocabularyTag ?? "");
    setRestoredClassSeal(restored.classSeal);
  }

  /** Gespeicherte Vorbereitung; was sie nicht nennt, bleibt beim Standard. */
  function applyPreparedSettings(prepared: TeacherPreparedSettings) {
    patchSettings(gameSettingsPatchOf(prepared));
    if (prepared.direction) setDirection(prepared.direction);
    if (prepared.caseSensitive !== undefined) {
      setVocabularyCaseSensitive(prepared.caseSensitive);
    }
    if (prepared.vocabularyTransfer) {
      setVocabularyTransfer(prepared.vocabularyTransfer);
    }
    if (prepared.vocabularyTag !== undefined) {
      setRoundTag(prepared.vocabularyTag);
    }
    if (prepared.wordStoreTransfer) {
      setWordStoreTransfer(prepared.wordStoreTransfer);
    }
  }

  return { applyRestoredContent, applyPreparedSettings };
}
