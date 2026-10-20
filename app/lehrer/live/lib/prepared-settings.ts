import type {
  VocabularyTransferChoice,
  WordStoreTransferChoice,
} from "../../../../src/integrations/laufdiktat/live-session";
import type { GameSettings } from "../hooks/use-game-settings";

/** Optionen des Raums, die ein vorbereitetes Laufdiktat mitnimmt. */
const ROOM_OPTION_KEYS = [
  "gameMode",
  "shuffleWords",
  "stationShuffle",
  "repeatWrongAnswers",
  "assistance",
  "attempts",
  "tts",
  "showStars",
  "strictTyping",
  "taskHelp",
  "stationCount",
  "battleInk",
  "battleFlicker",
] as const satisfies ReadonlyArray<keyof GameSettings>;

export type PreparedRoomOptions = Pick<
  GameSettings,
  (typeof ROOM_OPTION_KEYS)[number]
>;

/**
 * Was „Speichern“ am Ende von Schritt 2 (Design 15b) neben dem Inhalt
 * ablegt: Modus und Optionen des Raums. Die Mathe-Einstellungen gehören zum
 * Inhalt (die erzeugten Aufgaben stehen im Quelltext) und fehlen hier.
 */
export type PreparedRoomSettings = {
  options: PreparedRoomOptions;
  wordStoreTransfer: WordStoreTransferChoice;
  vocabularyTransfer: VocabularyTransferChoice;
  /** Runden-Tag für die LernBox; leer = Vorschlag aus den Einstellungen. */
  roundTag: string;
  /** Gewählte Klasse; leer = ohne Klasse. */
  classId: string;
};

export function preparedSettingsOf({
  settings,
  wordStoreTransfer,
  vocabularyTransfer,
  roundTag,
  classId,
}: {
  settings: GameSettings;
  wordStoreTransfer: WordStoreTransferChoice;
  vocabularyTransfer: VocabularyTransferChoice;
  roundTag: string;
  classId: string;
}): PreparedRoomSettings {
  const options = Object.fromEntries(
    ROOM_OPTION_KEYS.map((key) => [key, settings[key]]),
  ) as PreparedRoomOptions;
  return {
    options,
    wordStoreTransfer,
    vocabularyTransfer,
    roundTag: roundTag.trim(),
    classId,
  };
}
