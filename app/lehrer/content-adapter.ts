import {
  DEFAULT_VOCABULARY_LOCALES,
  pickerLocale,
  type VocabularyLocales,
} from "../../src/domain/running-dictation";
import type { TextSplitConfig } from "../../src/domain/running-dictation-sections";
import type {
  TeacherContentKind,
  TeacherContentPackage,
  TeacherPreparedSettings,
  TeacherTextSplit,
} from "../../src/domain/teacher-content-library";
import {
  contentKindOf,
  splitFieldsOf,
  splitOptionsOfPackage,
  suggestTitle,
  textSplitConfigFor,
  type TextSplitOptions,
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
    textSplitConfig: textSplitConfigFor(
      textSplit,
      splitOptionsOfPackage(entry),
    ),
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
  /** Satzzeichen, eigenes Zeichen, Zeilenmodus; fehlt = Standard. */
  splitOptions?: TextSplitOptions;
  vocabularyLocales: VocabularyLocales;
};

/**
 * Zustand des Live-Raums → Paket der Ablage. Mit `existing` bleiben ID,
 * Erstellzeit, Klassen (mit `addToClass` um `classId` ergänzt), letzte Nutzung und
 * Vorbereitung erhalten; die Revision steigt nur, wenn sich Quelle oder Titel
 * geändert haben. Ein leerer Titel wird aus der Quelle vorgeschlagen.
 */
export function liveContentToPackage(input: {
  draft: LiveContentDraft;
  existing?: TeacherContentPackage | undefined;
  /** ID für ein neues Paket. */
  newId: string;
  now: string;
  /** Klasse, zu der ein neues Paket gehört; leer = „Nicht zugeordnet“. */
  classId?: string | undefined;
  /** Durchführung (Start einer Runde): setzt die letzte Nutzung. */
  markUsed?: boolean;
  /**
   * Mit `markUsed`: Modus und Optionen der Runde. Sie ersetzen die
   * gespeicherte Vorbereitung, damit „Wieder vorbereiten“ genau diese Runde
   * zurückholt.
   */
  ranWith?: TeacherPreparedSettings | undefined;
  /**
   * Speichern: ein bestehendes Paket gehört danach auch zu `classId`. Es bleibt
   * ein Eintrag, der mehreren Klassen gehört (Lehrerbereich v2, 15a).
   */
  addToClass?: boolean;
}): TeacherContentPackage {
  const { draft, existing, now } = input;
  const title =
    draft.title.trim() || suggestTitle(draft.source) || "Ohne Titel";
  const changed =
    !existing || existing.source !== draft.source || existing.title !== title;
  const adds =
    existing &&
    input.addToClass &&
    input.classId &&
    !existing.classIds?.includes(input.classId);
  const classIds = adds
    ? [...(existing.classIds ?? []), input.classId as string]
    : existing
      ? existing.classIds
      : input.classId
        ? [input.classId]
        : undefined;
  const lastUsedAt = input.markUsed ? now : existing?.lastUsedAt;
  const prepared =
    input.markUsed && input.ranWith ? input.ranWith : existing?.prepared;
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
    updatedAt: changed || adds || !existing ? now : existing.updatedAt,
    kind: draft.contentMode,
    ...(classIds ? { classIds } : {}),
    ...(lastUsedAt ? { lastUsedAt } : {}),
    ...(existing?.preparedAt ? { preparedAt: existing.preparedAt } : {}),
    ...(prepared ? { prepared } : {}),
    ...(draft.contentMode === "text"
      ? {
          textSplit: draft.textSplit,
          ...splitFieldsOf(draft.splitOptions ?? {}),
        }
      : {}),
  };
}
