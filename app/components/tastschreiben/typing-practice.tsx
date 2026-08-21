"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { initSession, typeChar, backspace, forceFinish, isFinished, currentExpectedChar, type TypingSessionState } from "../../../src/tastschreiben/typing-session.ts";
import { computeStats, type TypingStats } from "../../../src/tastschreiben/typing-stats.ts";
import { playClick, playError, playComplete } from "../../../src/tastschreiben/sound.ts";
import { VirtualKeyboard, type LastPress } from "./virtual-keyboard.tsx";

type Props = {
  text: string;
  onFinish: (stats: TypingStats) => void;
  /** Zeitrennen: die Runde endet spätestens nach dieser Zeit, auch mitten im Text. */
  timeLimitMs?: number;
};

/** Ein Tippdurchlauf über einen festen Text. Component-`key={text}` im Elternteil sorgt für einen frischen Start pro Runde. */
export function TypingPractice({ text, onFinish, timeLimitMs }: Props) {
  const [session, setSession] = useState<TypingSessionState>(() => initSession(text));
  const [lastPress, setLastPress] = useState<LastPress | null>(null);
  const [focused, setFocused] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(timeLimitMs ?? null);
  const nonceRef = useRef(0);
  const finishedNotifiedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (session.finishedAt === null || finishedNotifiedRef.current) return;
    finishedNotifiedRef.current = true;
    playComplete();
    const stats = computeStats(session.keystrokeLog, session.startedAt ?? session.finishedAt, session.finishedAt, session.corrections);
    onFinish(stats);
  }, [session, onFinish]);

  useEffect(() => {
    if (!timeLimitMs || session.startedAt === null || isFinished(session)) return;
    const deadline = session.startedAt + timeLimitMs;
    const tick = () => {
      const remaining = deadline - performance.now();
      setRemainingMs(Math.max(0, remaining));
      if (remaining <= 0) setSession((s) => forceFinish(s, performance.now()));
    };
    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLimitMs, session.startedAt, session.finishedAt]);

  function handleKeyDown(event: KeyboardEvent) {
    if (isFinished(session)) return;
    if (event.key === "Backspace") {
      event.preventDefault();
      setSession(backspace(session));
      return;
    }
    if (event.key.length !== 1) return;
    event.preventDefault();
    const expected = currentExpectedChar(session);
    const correct = event.key === expected;
    setSession(typeChar(session, event.key, performance.now()));
    nonceRef.current += 1;
    setLastPress({ char: event.key, correct, nonce: nonceRef.current });
    if (correct) playClick();
    else playError();
  }

  return (
    <label className="typing-practice">
      {timeLimitMs !== undefined && (
        <p className="typing-practice__timer">Noch {Math.ceil((remainingMs ?? timeLimitMs) / 1000)}s</p>
      )}
      <input
        ref={inputRef}
        className="typing-practice__capture"
        type="text"
        value=""
        onChange={() => {}}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="Tippfeld — hier mit der Tastatur schreiben"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <p className="typing-practice__text" aria-hidden="true">
        {Array.from(text).map((char, i) => {
          const result = session.typed[i];
          const isCursor = i === session.position;
          const state = result ? (result.correct ? "correct" : "wrong") : isCursor ? "cursor" : "pending";
          return (
            <span key={i} className={`typing-practice__char typing-practice__char--${state}`}>
              {char === " " ? " " : char}
            </span>
          );
        })}
      </p>
      {!focused && <p className="typing-practice__hint">Hier klicken, um zu tippen.</p>}
      <VirtualKeyboard nextChar={currentExpectedChar(session)} lastPress={lastPress} />
    </label>
  );
}
