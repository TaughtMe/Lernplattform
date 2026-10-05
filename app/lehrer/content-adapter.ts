import {
  DEFAULT_VOCABULARY_LOCALES,
  VOCABULARY_LANGUAGES,
  type VocabularyLocales,
} from "../../src/domain/running-dictation";
import type { TextSplitConfig } from "../../src/domain/running-dictation-sections";
import type {
  TeacherContentKind,
  TeacherContentPackage,
  TeacherTextSplit,
} from "../../src/domain/teacher-content-library";
import {
  contentKindOf,
  suggestTitle,
  textSplitConfigFor,
} from "../../src/domain/teacher-content-summary";

/** Was der Live-Raum zum Bearbeiten eines abgelegten Inhalts braucht. */
export type LiveContent = {
  contentMode: TeacherContentKind;
  source: string;
  title: string;
  /** Nur Text: Zerlegung in Stationen. */
  textSplit: TeacherTextSplit;
  textSplitConfig: TextSplitConfig;
  /** Nur Vokabeln: Sprachen links und rechts. */
  vocabularyLocales: VocabularyLocales;
};

/** Gespeicherte Kennungen wie „en“ passen zu „en-GB“ der Sprachauswahl. */
function pickerLocale(stored: string, fallback: string) {
  const exact = VOCABULARY_LANGUAGES.find(({ locale }) => locale === stored);
  if (exact) return exact.locale;
  const base = stored.split("-")[0]?.toLowerCase();
  return (
    VOCABULARY_LANGUAGES.find(
      ({ locale }) => locale.split("-")[0]?.toLowerCase() === base,
    )?.locale ?? fallback
  );
}

/** Paket der Ablage → Zustand des Live-Raums. */
export function packageToLiveContent(
  entry: TeacherContentPackage,
): LiveContent {
  const textSplit = entry.textSplit ?? "satz";
  return {
    contentMode: contentKindOf(entry),
    source: entry.source,
    title: entry.title,
    textSplit,
    textSplitConfig: textSplitConfigFor(textSplit),
    vocabularyLocales: {
      left: pickerLocale(entry.promptLocale, DEFAULT_VOCABULARY_LOCALES.left),
      right: pickerLocale(entry.answerLocale, DEFAULT_VOCABULARY_LOCALES.right),
    },
  };
}

export type LiveContentDraft = {
  contentMode: TeacherContentKind;
  source: string;
  title: string;
  textSplit: TeacherTextSplit;
  vocabularyLocales: VocabularyLocales;
};

/**
 * Zustand des Live-Raums → Paket der Ablage. Mit `existing` bleiben ID,
 * Erstellzeit, Klassen (außer bei `moveToClass`) und letzte Nutzung erhalten; die Revision steigt nur,
 * wenn sich Quelle oder Titel geändert haben. Ein leerer Titel wird aus
 * der Quelle vorgeschlagen.
 */
export function liveContentToPackage(input: {
  draft: LiveContentDraft;
  existing?: TeacherContentPackage | undefined;
  /** ID für ein neues Paket. */
  newId: string;
  now: string;
  /** Klasse, zu der ein neues Paket gehört; leer = „Nicht zugeordnet“. */
  classId?: string | undefined;
  /** Raumstart: setzt die letzte Nutzung. */
  markUsed?: boolean;
  /** Speichern: ein bestehendes Paket wechselt in `classId`, falls es dort noch fehlt. */
  moveToClass?: boolean;
}): TeacherContentPackage {
  const { draft, existing, now } = input;
  const title =
    draft.title.trim() || suggestTitle(draft.source) || "Ohne Titel";
  const changed =
    !existing || existing.source !== draft.source || existing.title !== title;
  const moves =
    existing &&
    input.moveToClass &&
    input.classId &&
    !existing.classIds?.includes(input.classId);
  const classIds = moves
    ? [input.classId as string]
    : existing
      ? existing.classIds
      : input.classId
        ? [input.classId]
        : undefined;
  const lastUsedAt = input.markUsed ? now : existing?.lastUsedAt;
  return {
    id: existing?.id ?? input.newId,
    revision: existing ? existing.revision + (changed ? 1 : 0) : 0,
    title,
    source: draft.source,
    promptLocale:
      draft.contentMode === "vocabulary"
        ? draft.vocabularyLocales.left
        : (existing?.promptLocale ?? "en"),
    answerLocale:
      draft.contentMode === "vocabulary"
        ? draft.vocabularyLocales.right
        : (existing?.answerLocale ?? "de"),
    createdAt: existing?.createdAt ?? now,
    updatedAt: changed || moves || !existing ? now : existing.updatedAt,
    kind: draft.contentMode,
    ...(classIds ? { classIds } : {}),
    ...(lastUsedAt ? { lastUsedAt } : {}),
    ...(draft.contentMode === "text" ? { textSplit: draft.textSplit } : {}),
  };
}
