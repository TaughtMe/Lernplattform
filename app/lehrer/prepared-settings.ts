import type { VocabularyDirection } from "../../src/domain/running-dictation";
import {
  teacherPreparedSettingsSchema,
  type TeacherContentKind,
  type TeacherPreparedSettings,
} from "../../src/domain/teacher-content-library";
import type {
  VocabularyTransferChoice,
  WordStoreTransferChoice,
} from "../../src/integrations/laufdiktat/live-session";
import { createTeacherContentLibraryRepository } from "../../src/storage/teacher-class-settings";
import type { GameSettings } from "./live/hooks/use-game-settings";

/** Ereignis für Leiste und Startseite, dass sich die Ablage geändert hat. */
export const TEACHER_DATA_EVENT = "teacher-data-changed";

/** Was der Live-Raum für eine Vorbereitung liefert (Schritt 2). */
export type LivePreparation = {
  contentMode: TeacherContentKind;
  settings: GameSettings;
  direction: VocabularyDirection;
  caseSensitive: boolean;
  vocabularyTransfer: VocabularyTransferChoice;
  /** Tag dieser Runde; leer = Standard-Tag aus den Einstellungen. */
  roundTag: string;
  wordStoreTransfer: WordStoreTransferChoice;
};

const MATH_KEYS = [
  "mathCount",
  "mathMin",
  "mathMax",
  "mathOps",
  "mathAllowNegative",
  "mathExcludeZeroOperand",
  "mathExcludeZeroResult",
  "mathGap",
  "mathTables",
] as const satisfies ReadonlyArray<keyof GameSettings>;

const GAME_KEYS = [
  "shuffleWords",
  "stationShuffle",
  "repeatWrongAnswers",
  "assistance",
  "attempts",
  "tts",
  "showStars",
  "showTempoPoints",
  "strictTyping",
  "taskHelp",
  "stationCount",
  "battleInk",
  "battleFlicker",
] as const satisfies ReadonlyArray<keyof GameSettings>;

/**
 * Spieloptionen des Live-Raums → gespeicherte Vorbereitung. Mathe-Optionen
 * gehören nur zu Mathe, Abfragerichtung, LernBox und Tag nur zu Vokabeln, der
 * Wortspeicher nur zu Text. Werte außerhalb der erlaubten Grenzen fallen weg;
 * der Raum nimmt dafür beim Start seinen Standard.
 */
export function preparedSettingsOf(
  input: LivePreparation,
): TeacherPreparedSettings {
  const { settings, contentMode } = input;
  const candidate: Record<string, unknown> = {
    ...Object.fromEntries(GAME_KEYS.map((key) => [key, settings[key]])),
    ...(contentMode === "math"
      ? Object.fromEntries(MATH_KEYS.map((key) => [key, settings[key]]))
      : {}),
    ...(contentMode === "vocabulary"
      ? {
          direction: input.direction,
          caseSensitive: input.caseSensitive,
          vocabularyTransfer: input.vocabularyTransfer,
          vocabularyTag: input.roundTag.trim().slice(0, 60),
        }
      : {}),
    ...(contentMode === "text"
      ? { wordStoreTransfer: input.wordStoreTransfer }
      : {}),
  };
  const shape = teacherPreparedSettingsSchema.shape;
  const valid = Object.fromEntries(
    Object.entries(candidate).filter(
      ([key, value]) =>
        key in shape &&
        shape[key as keyof typeof shape].safeParse(value).success,
    ),
  );
  return teacherPreparedSettingsSchema.parse({
    ...valid,
    gameMode: settings.gameMode,
  });
}

/** Gespeicherte Vorbereitung → Spieloptionen, die der Raum übernimmt. */
export function gameSettingsPatchOf(
  prepared: TeacherPreparedSettings,
): Partial<GameSettings> {
  const patch: Partial<GameSettings> = { gameMode: prepared.gameMode };
  for (const key of [...GAME_KEYS, ...MATH_KEYS]) {
    const value = prepared[key];
    if (value !== undefined) Object.assign(patch, { [key]: value });
  }
  return patch;
}

/** Vokabel- und Text-Optionen einer Vorbereitung für den Editor. */
export type PreparedContentOptions = Pick<
  TeacherPreparedSettings,
  | "direction"
  | "caseSensitive"
  | "vocabularyTransfer"
  | "vocabularyTag"
  | "wordStoreTransfer"
>;

/**
 * Speichert Modus und Optionen eines abgelegten Inhalts als Vorbereitung
 * (Schritt 2 „Speichern“ bzw. „Vorbereiten“). Danach steht er auf der
 * Startseite unter „Vorbereitet“, und „Starten“ öffnet den Raum direkt mit
 * diesen Einstellungen. `false`, wenn es den Inhalt nicht (mehr) gibt.
 *
 * Aufruf aus dem Live-Raum, nachdem der Inhalt abgelegt ist:
 * `savePreparedSettings(contentId, preparedSettingsOf({...}))`.
 */
export async function savePreparedSettings(
  id: string,
  settings: TeacherPreparedSettings,
  at = new Date().toISOString(),
): Promise<boolean> {
  const saved = await createTeacherContentLibraryRepository().prepare(
    id,
    teacherPreparedSettingsSchema.parse(settings),
    at,
  );
  if (saved) window.dispatchEvent(new Event(TEACHER_DATA_EVENT));
  return saved;
}
