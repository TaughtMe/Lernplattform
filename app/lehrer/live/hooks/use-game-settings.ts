"use client";

import {
  useCallback,
  useMemo,
  useReducer,
  type Dispatch,
  type SetStateAction,
} from "react";
import type {
  MathOperation,
  TeacherGameMode,
} from "../../../../src/integrations/laufdiktat/teacher-session";

/** Alle Spieloptionen der Lehrkraft für den Raum, in einem Objekt. */
export type GameSettings = {
  gameMode: TeacherGameMode;
  shuffleWords: boolean;
  stationShuffle: boolean;
  repeatWrongAnswers: boolean;
  assistance: boolean;
  attempts: number;
  tts: boolean;
  showStars: boolean;
  showTempoPoints: boolean;
  strictTyping: boolean;
  taskHelp: boolean;
  stationCount: number;
  battleInk: boolean;
  battleFlicker: boolean;
  mathCount: number;
  mathMin: number;
  mathMax: number;
  mathOps: MathOperation[];
  mathAllowNegative: boolean;
  mathExcludeZeroOperand: boolean;
  mathExcludeZeroResult: boolean;
  mathGap: boolean;
  mathTables: number[];
};

export function initialGameSettings(): GameSettings {
  return {
    gameMode: "LAUFDIKTAT",
    shuffleWords: false,
    stationShuffle: true,
    repeatWrongAnswers: true,
    assistance: true,
    attempts: 3,
    tts: false,
    showStars: true,
    showTempoPoints: false,
    strictTyping: false,
    taskHelp: true,
    stationCount: 20,
    battleInk: true,
    battleFlicker: true,
    mathCount: 10,
    mathMin: 0,
    mathMax: 20,
    mathOps: ["+", "-"],
    mathAllowNegative: false,
    mathExcludeZeroOperand: false,
    mathExcludeZeroResult: false,
    mathGap: false,
    mathTables: [],
  };
}

export type GameSettingsAction =
  | {
      [K in keyof GameSettings]: {
        type: "set";
        key: K;
        value: SetStateAction<GameSettings[K]>;
      };
    }[keyof GameSettings]
  | { type: "patch"; patch: Partial<GameSettings> };

/** Wie `useState`: gleicher Wert (`Object.is`) lässt den Zustand unverändert. */
export function gameSettingsReducer(
  state: GameSettings,
  action: GameSettingsAction,
): GameSettings {
  if (action.type === "patch") {
    const changed = (Object.keys(action.patch) as (keyof GameSettings)[]).some(
      (key) => !Object.is(action.patch[key], state[key]),
    );
    return changed ? { ...state, ...action.patch } : state;
  }
  const { key } = action;
  const current = state[key];
  const next =
    typeof action.value === "function"
      ? (action.value as (previous: typeof current) => typeof current)(current)
      : action.value;
  return Object.is(next, current) ? state : { ...state, [key]: next };
}

type Setter<K extends keyof GameSettings> = Dispatch<
  SetStateAction<GameSettings[K]>
>;

/**
 * Die Spieloptionen als **ein** Objekt mit `useReducer`. Die Setter haben
 * dieselbe Signatur wie die früheren `useState`-Setter und bleiben über alle
 * Renderings dieselbe Funktion.
 */
export function useGameSettings() {
  const [settings, dispatch] = useReducer(
    gameSettingsReducer,
    undefined,
    initialGameSettings,
  );
  const setters = useMemo(() => {
    const setterFor =
      <K extends keyof GameSettings>(key: K): Setter<K> =>
      (value) =>
        dispatch({ type: "set", key, value } as GameSettingsAction);
    return {
      setGameMode: setterFor("gameMode"),
      setShuffleWords: setterFor("shuffleWords"),
      setStationShuffle: setterFor("stationShuffle"),
      setRepeatWrongAnswers: setterFor("repeatWrongAnswers"),
      setAssistance: setterFor("assistance"),
      setAttempts: setterFor("attempts"),
      setTts: setterFor("tts"),
      setShowStars: setterFor("showStars"),
      setShowTempoPoints: setterFor("showTempoPoints"),
      setStrictTyping: setterFor("strictTyping"),
      setTaskHelp: setterFor("taskHelp"),
      setStationCount: setterFor("stationCount"),
      setBattleInk: setterFor("battleInk"),
      setBattleFlicker: setterFor("battleFlicker"),
      setMathCount: setterFor("mathCount"),
      setMathMin: setterFor("mathMin"),
      setMathMax: setterFor("mathMax"),
      setMathOps: setterFor("mathOps"),
      setMathAllowNegative: setterFor("mathAllowNegative"),
      setMathExcludeZeroOperand: setterFor("mathExcludeZeroOperand"),
      setMathExcludeZeroResult: setterFor("mathExcludeZeroResult"),
      setMathGap: setterFor("mathGap"),
      setMathTables: setterFor("mathTables"),
    };
  }, []);

  /** Mehrere Optionen auf einmal setzen (Wiederaufnahme eines Raums). */
  const patchSettings = useCallback(
    (patch: Partial<GameSettings>) => dispatch({ type: "patch", patch }),
    [],
  );

  const { setMathOps, setMathTables } = setters;
  function toggleMathOperation(op: MathOperation) {
    setMathOps((current) =>
      current.includes(op)
        ? current.filter((item) => item !== op)
        : [...current, op],
    );
  }

  function toggleMathTable(table: number) {
    setMathTables((active) =>
      active.includes(table)
        ? active.filter((entry) => entry !== table)
        : [...active, table].sort((left, right) => left - right),
    );
  }

  return {
    settings,
    patchSettings,
    /** Felder, die `TeacherLiveModel` unverändert übernimmt. */
    model: {
      ...settings,
      setGameMode: setters.setGameMode,
      setShuffleWords: setters.setShuffleWords,
      setStationShuffle: setters.setStationShuffle,
      setRepeatWrongAnswers: setters.setRepeatWrongAnswers,
      setAssistance: setters.setAssistance,
      setAttempts: setters.setAttempts,
      setTts: setters.setTts,
      setShowStars: setters.setShowStars,
      setShowTempoPoints: setters.setShowTempoPoints,
      setStrictTyping: setters.setStrictTyping,
      setTaskHelp: setters.setTaskHelp,
      setStationCount: setters.setStationCount,
      setBattleInk: setters.setBattleInk,
      setBattleFlicker: setters.setBattleFlicker,
      setMathCount: setters.setMathCount,
      setMathMin: setters.setMathMin,
      setMathMax: setters.setMathMax,
      setMathAllowNegative: setters.setMathAllowNegative,
      setMathExcludeZeroOperand: setters.setMathExcludeZeroOperand,
      setMathExcludeZeroResult: setters.setMathExcludeZeroResult,
      setMathGap: setters.setMathGap,
      toggleMathOperation,
      toggleMathTable,
    },
  };
}
