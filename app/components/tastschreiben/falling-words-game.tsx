"use client";

import { useEffect, useRef, useState } from "react";
import { initGame, spawnWord, tick, typeChar, pickSpawnPool, LANES, STARTING_LIVES, type FallingWordsState } from "../../../src/tastschreiben/falling-words-game.ts";

type Props = {
  completedLessonIds: ReadonlySet<string>;
  onExit: () => void;
};

const TICK_MS = 50;
const SPAWN_MS = 1600;

export function FallingWordsGame({ completedLessonIds, onExit }: Props) {
  const [state, setState] = useState<FallingWordsState>(initGame);
  const [focused, setFocused] = useState(false);
  const poolRef = useRef<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    poolRef.current = pickSpawnPool(completedLessonIds, `game:${Date.now()}`);
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const tickTimer = setInterval(() => setState((s) => tick(s, TICK_MS)), TICK_MS);
    return () => clearInterval(tickTimer);
  }, []);

  useEffect(() => {
    const spawnTimer = setInterval(() => {
      setState((s) => {
        const pool = poolRef.current;
        if (pool.length === 0) return s;
        const word = pool[Math.floor(Math.random() * pool.length)];
        return spawnWord(s, word);
      });
    }, SPAWN_MS);
    return () => clearInterval(spawnTimer);
  }, []);

  function handleKeyDown(char: string) {
    if (char.length !== 1) return;
    setState((s) => typeChar(s, char.toLowerCase()));
  }

  function restart() {
    setState(initGame());
    poolRef.current = pickSpawnPool(completedLessonIds, `game:${Date.now()}`);
    inputRef.current?.focus();
  }

  return (
    <div className="falling-words">
      <div className="falling-words__hud">
        <span>Punkte: {state.score}</span>
        <span>Serie: {state.streak}</span>
        <span aria-label={`${state.lives} von ${STARTING_LIVES} Leben`}>{"❤️".repeat(state.lives)}{"🖤".repeat(STARTING_LIVES - state.lives)}</span>
      </div>

      <label className="falling-words__sky">
        <input
          ref={inputRef}
          className="typing-practice__capture"
          type="text"
          value=""
          onChange={() => {}}
          onKeyDown={(event) => handleKeyDown(event.key)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label="Tippfeld für Buchstabenregen"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={state.gameOver}
        />
        {!focused && !state.gameOver && <p className="falling-words__hint">Hier klicken, um zu spielen.</p>}

        {state.words.map((w) => (
          <span
            key={w.id}
            className="falling-words__word"
            style={{ top: `${w.progress * 100}%`, left: `${(w.lane + 0.5) * (100 / LANES)}%` }}
          >
            <span className="falling-words__word-typed">{w.word.slice(0, w.typed)}</span>
            <span className="falling-words__word-rest">{w.word.slice(w.typed)}</span>
          </span>
        ))}

        {state.gameOver && (
          <div className="falling-words__game-over">
            <p>Vorbei!</p>
            <p className="falling-words__game-over-stats">
              {state.score} Punkte · beste Serie {state.bestStreak}
            </p>
            <button className="button button--primary" type="button" onClick={restart}>
              Nochmal spielen
            </button>
          </div>
        )}
      </label>

      <button className="button button--quiet" type="button" onClick={onExit}>
        Zur Übersicht
      </button>
    </div>
  );
}
