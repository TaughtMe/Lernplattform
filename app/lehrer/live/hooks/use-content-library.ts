"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { VocabularyLocales } from "../../../../src/domain/running-dictation";
import type { TextSplitConfig } from "../../../../src/domain/running-dictation-sections";
import type { TeacherPreparedSettings } from "../../../../src/domain/teacher-content-library";
import type { TeacherContentMode } from "../../../../src/integrations/laufdiktat/teacher-session";
import { createTeacherContentLibraryRepository } from "../../../../src/storage/teacher-class-settings";
import { liveContentToPackage } from "../../content-adapter";
import {
  savePreparedSettings,
  TEACHER_DATA_EVENT,
} from "../../prepared-settings";
import { splitModeOf, splitOptionsOf } from "../dictation-adapter";

type ContentLibraryInput = {
  clock: () => number;
  contentMode: TeacherContentMode;
  /** Quelltext des gewählten Inhalts. */
  source: string;
  splitConfig: TextSplitConfig;
  vocabularyLocales: VocabularyLocales;
  /** Gewählte Klasse; leer = ohne Klasse. */
  activeClass: string;
  setError: (message: string) => void;
  setLibraryNotice: (message: string) => void;
  setSources: Dispatch<SetStateAction<Record<TeacherContentMode, string>>>;
  loadPairsFromTable: (table: string) => void;
};

/**
 * Ablage des Inhalts: der gerade bearbeitete Eintrag (Titel, Kennung),
 * Speichern, Löschen und das Laden einer Datei in den Editor.
 */
export function useContentLibrary({
  clock,
  contentMode,
  source,
  splitConfig,
  vocabularyLocales,
  activeClass,
  setError,
  setLibraryNotice,
  setSources,
  loadPairsFromTable,
}: ContentLibraryInput) {
  // Abgelegter Inhalt, der gerade bearbeitet wird (null = noch nicht abgelegt).
  const [contentId, setContentId] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  /**
   * Legt den Inhalt ab: neu oder als neuer Stand des geladenen Pakets. Mit
   * `markUsed` gilt er als durchgeführt; `ranWith` sind dann Modus und
   * Optionen der Runde.
   */
  async function storeContent(
    markUsed: boolean,
    addToClass = false,
    ranWith?: TeacherPreparedSettings,
  ) {
    const repository = createTeacherContentLibraryRepository();
    const existing = contentId ? await repository.get(contentId) : undefined;
    const entry = liveContentToPackage({
      draft: {
        contentMode,
        source,
        title,
        textSplit: splitModeOf(splitConfig),
        splitOptions: splitOptionsOf(splitConfig),
        vocabularyLocales,
      },
      existing,
      newId: `teacher-package-${crypto.randomUUID()}`,
      now: new Date(clock()).toISOString(),
      classId: activeClass || undefined,
      markUsed,
      addToClass,
      ranWith,
    });
    await repository.put(entry);
    setContentId(entry.id);
    setTitle(entry.title);
    window.dispatchEvent(new Event(TEACHER_DATA_EVENT));
    return entry;
  }

  async function saveContent() {
    setError("");
    if (!source.trim()) {
      setLibraryNotice("Gib zuerst etwas ein, das gespeichert werden kann.");
      return;
    }
    try {
      const entry = await storeContent(false, true);
      setLibraryNotice(`„${entry.title}“ ist gespeichert.`);
    } catch {
      setLibraryNotice(
        "Der Inhalt konnte nicht gespeichert werden. Bitte versuche es noch einmal.",
      );
    }
  }

  /**
   * Schritt 2 „Vorbereiten“: legt den Inhalt ab und speichert Modus und
   * Optionen. Danach steht er auf der Startseite unter „Vorbereitet“ und
   * startet dort mit einem Klick in die Lobby.
   */
  async function prepareContent(prepared: TeacherPreparedSettings) {
    setError("");
    if (!source.trim()) {
      setLibraryNotice("Gib zuerst etwas ein, das vorbereitet werden kann.");
      return false;
    }
    try {
      const entry = await storeContent(false, true);
      await savePreparedSettings(
        entry.id,
        prepared,
        new Date(clock()).toISOString(),
      );
      setLibraryNotice(`„${entry.title}“ ist vorbereitet.`);
      return true;
    } catch {
      setLibraryNotice(
        "Der Inhalt konnte nicht vorbereitet werden. Bitte versuche es noch einmal.",
      );
      return false;
    }
  }

  async function deleteContent() {
    if (!contentId) return;
    try {
      const repository = createTeacherContentLibraryRepository();
      const entry = await repository.get(contentId);
      await repository.remove(contentId);
      setContentId(null);
      setLibraryNotice(
        entry
          ? `„${entry.title}“ wurde aus der Ablage gelöscht.`
          : "Der Inhalt wurde aus der Ablage gelöscht.",
      );
      window.dispatchEvent(new Event(TEACHER_DATA_EVENT));
    } catch {
      setLibraryNotice("Der Inhalt konnte nicht gelöscht werden.");
    }
  }

  function importFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setSources((current) => ({ ...current, [contentMode]: text }));
      if (contentMode === "vocabulary") {
        loadPairsFromTable(text);
      }
    };
    reader.readAsText(file);
  }

  return {
    storeContent,
    prepareContent,
    setContentId,
    setTitle,
    /** Felder, die `TeacherLiveModel` unverändert übernimmt. */
    model: {
      title,
      setTitle,
      contentId,
      saveContent,
      deleteContent,
      importFile,
    },
  };
}
