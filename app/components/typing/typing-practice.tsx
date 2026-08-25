"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  correctTypingCharacter,
  createTypingSession,
  enterTypingCharacter,
  expectedTypingCharacter,
} from "../../../src/tastschreiben/typing-session";
import {
  computeTypingStats,
  type TypingStats,
} from "../../../src/tastschreiben/typing-stats";
import { lookupTypingCharacter } from "../../../src/tastschreiben/keyboard-layout";
import { VirtualKeyboard, type TypingKeyPress } from "./virtual-keyboard";

export function TypingPractice({
  text,
  activeChars,
  onFinish,
}: {
  text: string;
  activeChars?: readonly string[];
  onFinish: (stats: TypingStats) => void;
}) {
  const [session, setSession] = useState(() => createTypingSession(text));
  const [lastPress, setLastPress] = useState<TypingKeyPress | null>(null);
  const [focused, setFocused] = useState(false);
  const nonce = useRef(0);
  const notified = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => input.current?.focus(), []);

  useEffect(() => {
    if (session.finishedAt === null || notified.current) return;
    notified.current = true;
    onFinish(
      computeTypingStats(
        session.keystrokes,
        session.startedAt ?? session.finishedAt,
        session.finishedAt,
        session.corrections,
      ),
    );
  }, [onFinish, session]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (session.finishedAt !== null) return;
    if (event.key === "Backspace") {
      event.preventDefault();
      setSession((current) => correctTypingCharacter(current));
      return;
    }
    if (event.key.length !== 1) return;
    event.preventDefault();
    const expected = expectedTypingCharacter(session);
    nonce.current += 1;
    setLastPress({
      char: event.key,
      code:
        event.code || lookupTypingCharacter(event.key)?.key.code || event.key,
      correct: event.key === expected,
      nonce: nonce.current,
    });
    setSession((current) =>
      enterTypingCharacter(current, event.key, performance.now()),
    );
  }

  return (
    <label className="typing-practice">
      <input
        ref={input}
        className="typing-practice__capture"
        value=""
        onChange={() => undefined}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="Tippfeld"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <p className="typing-practice__text" aria-hidden="true">
        {Array.from(text).map((char, index) => {
          const result = session.typed[index];
          const state = result
            ? result.correct
              ? "correct"
              : "wrong"
            : index === session.position
              ? "cursor"
              : "pending";
          return (
            <span className={`is-${state}`} key={`${index}-${char}`}>
              {char}
            </span>
          );
        })}
      </p>
      {!focused && (
        <p className="typing-practice__hint">Zum Tippen hier klicken.</p>
      )}
      <VirtualKeyboard
        nextChar={expectedTypingCharacter(session)}
        lastPress={lastPress}
        activeChars={activeChars}
      />
    </label>
  );
}
