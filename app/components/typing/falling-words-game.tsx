"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "../../ui/icons";
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
    <section className="ui-falling" aria-labelledby="ui-falling-title">
      <header className="ui-falling__heading">
        <div>
          <p className="ui-eyebrow">Freiwillige Spielpause</p>
          <h1 id="ui-falling-title">Buchstabenregen</h1>
          <p>Tippe die Gruppen, bevor sie an Ramo vorbeiziehen.</p>
        </div>
        <button className="ui-btn ui-btn--link" type="button" onClick={onExit}>
          Spiel verlassen
        </button>
      </header>

      <div className="ui-falling__hud" aria-live="polite">
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

      <label className="ui-falling__sky">
        <input
          ref={input}
          className="ui-typing__capture"
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

        <div className="ui-falling__cloud is-one" />
        <div className="ui-falling__cloud is-two" />
        <div className="ui-falling__ramo" aria-hidden="true">
          <i />
          <span>•‿•</span>
        </div>

        {!focused && !state.finished ? (
          <p className="ui-falling__focus">Zum Spielen hier klicken</p>
        ) : null}

        {state.words.map((word) => (
          <span
            className="ui-falling__word"
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
          <div className="ui-falling__finished">
            <Icon name="cloud" size={40} />
            <strong>Spielpause geschafft!</strong>
            <p>
              {state.score} Punkte · beste Serie {state.bestStreak}
            </p>
            <button
              className="ui-btn ui-btn--primary"
              type="button"
              onClick={reset}
            >
              Noch einmal
            </button>
            <button
              className="ui-btn ui-btn--link"
              type="button"
              onClick={onExit}
            >
              Zurück zu den Lektionen
            </button>
          </div>
        ) : null}
      </label>

      <p className="ui-falling__note">
        Vorbeigezogen: {state.missed}. Dafür gibt es keine Minuspunkte.
      </p>
    </section>
  );
}
