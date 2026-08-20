export type GameState = "IDLE" | "REVEALED" | "WRITING" | "FINISHED";

export interface WordItem {
  id: string;
  kind?: "text" | "vocabulary";
  targetWord: string;
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

export interface SessionStartData {
  words: WordItem[];
  appVersion?: string;
  shuffleWords?: boolean;
  sessionId?: string;
  targetStudent?: string;
}

export interface RoomConfig {
  words: WordItem[];
  shuffleWords: boolean;
  appVersion: string;
}
