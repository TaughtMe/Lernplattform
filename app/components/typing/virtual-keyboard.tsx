"use client";

import type { CSSProperties } from "react";
import {
  KEYBOARD_ROWS,
  lookupTypingCharacter,
  oppositeShiftHand,
  type Finger,
} from "../../../src/tastschreiben/keyboard-layout";

export interface TypingKeyPress {
  char: string;
  code: string;
  correct: boolean;
  nonce: number;
}

const fingerNames: Record<Finger, string> = {
  "left-pinky": "linker kleiner Finger",
  "left-ring": "linker Ringfinger",
  "left-middle": "linker Mittelfinger",
  "left-index": "linker Zeigefinger",
  "right-index": "rechter Zeigefinger",
  "right-middle": "rechter Mittelfinger",
  "right-ring": "rechter Ringfinger",
  "right-pinky": "rechter kleiner Finger",
  thumb: "Daumen",
};

export function VirtualKeyboard({
  nextChar,
  lastPress,
  activeChars = [],
}: {
  nextChar: string | undefined;
  lastPress?: TypingKeyPress | null;
  activeChars?: readonly string[] | undefined;
}) {
  const nextInfo = nextChar ? lookupTypingCharacter(nextChar) : undefined;
  const nextCode = nextInfo?.key.code;
  const shiftHand = nextChar ? oppositeShiftHand(nextChar) : null;
  const activeCodes = new Set(
    activeChars
      .map((char) => lookupTypingCharacter(char)?.key.code)
      .filter(Boolean),
  );
  const finger = nextInfo?.key.finger;

  return (
    <div className="keyboard-guide">
      <div className="keyboard-guide__next" aria-live="polite">
        <span
          className={finger ? `finger-dot finger-${finger}` : "finger-dot"}
        />
        <span>
          {nextChar === " " ? "Leertaste" : nextChar?.toUpperCase() || "Fertig"}
          {finger ? <small>{fingerNames[finger]}</small> : null}
        </span>
      </div>
      <div
        className="virtual-keyboard"
        role="img"
        aria-label="Deutsche Tastatur mit Markierung für die nächste Taste"
      >
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div className="virtual-keyboard__row" key={rowIndex}>
            {row.map((key) => {
              const isShift =
                key.code === "ShiftLeft" || key.code === "ShiftRight";
              const isNext =
                nextCode === key.code ||
                (isShift &&
                  ((shiftHand === "left" && key.code === "ShiftLeft") ||
                    (shiftHand === "right" && key.code === "ShiftRight")));
              const isFlash = lastPress?.code === key.code;
              const isActive =
                key.kind === "character" && activeCodes.has(key.code);
              const keyStyle = {
                "--key-width": key.width ?? 1,
              } as CSSProperties;

              return (
                <span
                  className={[
                    "virtual-keyboard__key",
                    key.finger ? `finger-${key.finger}` : "",
                    key.kind !== "character" ? "is-control" : "",
                    key.base === " " ? "is-space" : "",
                    key.home ? "is-home" : "",
                    isActive ? "is-active" : "",
                    isNext ? "is-next" : "",
                    isFlash
                      ? lastPress?.correct
                        ? "is-correct"
                        : "is-wrong"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={`${key.id}-${isFlash ? lastPress?.nonce : "idle"}`}
                  style={keyStyle}
                >
                  {key.shift ? (
                    <span className="virtual-keyboard__symbols">
                      <small>{key.shift}</small>
                      <span>{key.label}</span>
                    </span>
                  ) : (
                    key.label
                  )}
                  {key.home ? <i aria-hidden="true" /> : null}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
