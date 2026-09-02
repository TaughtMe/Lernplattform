"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  FALLING_WORDS_DURATION_MS,
  FALLING_WORDS_LANES,
  advanceFallingWords,
  createFallingWordPool,
  createFallingWordsGame,
  spawnFallingWord,
  typeFallingWordCharacter,
} from "../../../src/tastschreiben/falling-words-game";

const TICK_MS = 50;
const SPAWN_MS = 1_650;

export function FallingWordsGame({
  completedLessonIds,
  onExit,
}: {
  completedLessonIds: ReadonlySet<string>;
  onExit: () => void;
}) {
  const [state, setState] = useState(createFallingWordsGame);
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const pool = useRef<string[]>([]);

  function reset() {
    pool.current = createFallingWordPool(
      completedLessonIds,
      `regen:${Date.now()}`,
    );
    setState(createFallingWordsGame());
    input.current?.focus();
  }

  useEffect(() => {
    pool.current = createFallingWordPool(
      completedLessonIds,
      `regen:${Date.now()}`,
    );
    input.current?.focus();
  }, [completedLessonIds]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setState((current) => advanceFallingWords(current, TICK_MS)),
      TICK_MS,
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setState((current) => {
        if (pool.current.length === 0) return current;
        const word =
          pool.current[Math.floor(Math.random() * pool.current.length)]!;
        return spawnFallingWord(current, word);
      });
    }, SPAWN_MS);
    return () => window.clearInterval(timer);
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key.length !== 1) return;
    event.preventDefault();
    setState((current) =>
      typeFallingWordCharacter(current, event.key.toLocaleLowerCase("de-DE")),
    );
  }

  const secondsLeft = Math.max(
    0,
    Math.ceil((FALLING_WORDS_DURATION_MS - state.elapsedMs) / 1_000),
  );

  return (
    <section className="falling-words" aria-labelledby="falling-words-title">
      <header className="falling-words__heading">
        <div>
          <p className="eyebrow">Freiwillige Spielpause</p>
          <h1 id="falling-words-title">Buchstabenregen</h1>
          <p>Tippe die Gruppen, bevor sie an Ramo vorbeiziehen.</p>
        </div>
        <button className="text-button" type="button" onClick={onExit}>
          Spiel verlassen
        </button>
      </header>

      <div className="falling-words__hud" aria-live="polite">
        <span>
          <strong>{state.score}</strong> Punkte
        </span>
        <span>
          <strong>{state.streak}</strong> Serie
        </span>
        <span>
          <strong>{secondsLeft}</strong> Sekunden
        </span>
      </div>

      <label className="falling-words__sky">
        <input
          ref={input}
          className="typing-practice__capture"
          value=""
          onChange={() => undefined}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label="Tippfeld für Buchstabenregen"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={state.finished}
        />

        <div className="falling-words__cloud cloud-one" />
        <div className="falling-words__cloud cloud-two" />
        <div className="falling-words__ramo" aria-hidden="true">
          <i />
          <span>•‿•</span>
        </div>

        {!focused && !state.finished ? (
          <p className="falling-words__focus">Zum Spielen hier klicken</p>
        ) : null}

        {state.words.map((word) => (
          <span
            className="falling-words__word"
            key={word.id}
            style={{
              left: `${(word.lane + 0.5) * (100 / FALLING_WORDS_LANES)}%`,
              top: `${word.progress * 82}%`,
            }}
          >
            <b>{word.word.slice(0, word.typed)}</b>
            {word.word.slice(word.typed)}
          </span>
        ))}

        {state.finished ? (
          <div className="falling-words__finished">
            <span aria-hidden="true">☁</span>
            <strong>Spielpause geschafft!</strong>
            <p>
              {state.score} Punkte · beste Serie {state.bestStreak}
            </p>
            <button
              className="button button--primary"
              type="button"
              onClick={reset}
            >
              Noch einmal
            </button>
            <button className="text-button" type="button" onClick={onExit}>
              Zurück zu den Lektionen
            </button>
          </div>
        ) : null}
      </label>

      <p className="falling-words__note">
        Vorbeigezogen: {state.missed}. Dafür gibt es keine Minuspunkte.
      </p>
    </section>
  );
}
