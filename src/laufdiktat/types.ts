export type GameState = "IDLE" | "REVEALED" | "WRITING" | "FINISHED";

export type GameMode = "LAUFDIKTAT" | "UEBUNG" | "BATTLE";

export interface WordItem {
  id: string;
  kind?: "text" | "vocabulary" | "math";
  targetWord: string;
  /** Shown instead of targetWord when set (math task, vocabulary source side). */
  prompt?: string;
  acceptedAnswers?: string[];
  caseSensitive?: boolean;
  promptLang?: string;
  answerLang?: string;
}

export interface GameMetrics {
  peeks: number;
  attempts: number;
}

export interface BattleOptions {
  ink: boolean;
  flicker: boolean;
}

export type AttackType = "ink" | "flicker";

export interface StationStudentState {
  currentIndex: number;
  peeks: number;
  finished?: boolean;
}

export interface SessionStartData {
  words: WordItem[];
  gameMode: GameMode;
  battleOptions: BattleOptions;
  stationMode: boolean;
  stationCount: number;
  uebungMaxAttempts: number;
  showStars: boolean;
  shuffleWords: boolean;
  strictTypingMode: boolean;
  appVersion?: string;
  sessionId?: string;
  targetStudent?: string;
}

export interface RoomConfig {
  words: WordItem[];
  gameMode: GameMode;
  battleOptions: BattleOptions;
  stationMode: boolean;
  stationCount: number;
  uebungMaxAttempts: number;
  showStars: boolean;
  shuffleWords: boolean;
  strictTypingMode: boolean;
  appVersion: string;
}
