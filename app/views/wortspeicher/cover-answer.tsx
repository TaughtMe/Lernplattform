"use client";

import { useEffect, useRef } from "react";
import { strictInputProps } from "./input-guards";
import styles from "./wortspeicher.module.css";

/** Stufe 4: Das Wort ist verdeckt, die Buchstaben entstehen direkt auf den Strichen. */
export function CoverAnswer({
  word,
  value,
  onChange,
}: {
  word: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);

  const slots = Array.from(word);
  const entered = Array.from(value);
  return (
    <div className={styles.slotsAnswer}>
      <span className="ui-small ui-muted">
        Schreibe das Wort auf die Striche
      </span>
      <span className={styles.slots} aria-hidden="true">
        {slots.map((letter, index) => {
          const isLetter = /[\p{L}\p{M}]/u.test(letter);
          return (
            <i
              key={`${letter}-${index}`}
              data-active={isLetter && index === entered.length}
            >
              {isLetter ? (entered[index] ?? " ") : letter}
            </i>
          );
        })}
      </span>
      <input
        ref={input}
        className={styles.slotInput}
        aria-label="Deine Lösung"
        value={value}
        maxLength={slots.length}
        onChange={(event) =>
          onChange(
            Array.from(event.target.value).slice(0, slots.length).join(""),
          )
        }
        {...strictInputProps}
      />
    </div>
  );
}
