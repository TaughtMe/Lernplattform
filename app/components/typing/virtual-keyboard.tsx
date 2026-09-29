"use client";

import type { CSSProperties } from "react";
import {
  KEYBOARD_ROWS,
  NUMPAD_ROWS,
  lookupNumpadCharacter,
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
  layout = "main",
}: {
  nextChar: string | undefined;
  lastPress?: TypingKeyPress | null;
  activeChars?: readonly string[] | undefined;
  layout?: "main" | "numpad";
}) {
  const lookup =
    layout === "numpad" ? lookupNumpadCharacter : lookupTypingCharacter;
  const rows = layout === "numpad" ? NUMPAD_ROWS : KEYBOARD_ROWS;
  const nextInfo = nextChar ? lookup(nextChar) : undefined;
  const nextCode = nextInfo?.key.code;
  const shiftHand =
    layout === "main" && nextChar ? oppositeShiftHand(nextChar) : null;
  const activeCodes = new Set(
    activeChars.map((char) => lookup(char)?.key.code).filter(Boolean),
  );
  const finger = nextInfo?.key.finger;

  return (
    <div className="ui-kb-guide">
      <div className="ui-kb-guide__next" aria-live="polite">
        <span
          className={
            finger ? `ui-finger-dot ui-finger-${finger}` : "ui-finger-dot"
          }
        />
        <span>
          {nextChar === " " ? "Leertaste" : nextChar?.toUpperCase() || "Fertig"}
          {finger ? <small>{fingerNames[finger]}</small> : null}
        </span>
      </div>
      <div
        className={`ui-kb${layout === "numpad" ? " is-numpad" : ""}`}
        role="img"
        aria-label={
          layout === "numpad"
            ? "Numerischer Tastenblock mit Markierung für die nächste Taste"
            : "Deutsche Tastatur mit Markierung für die nächste Taste"
        }
      >
        {rows.map((row, rowIndex) => (
          <div className="ui-kb__row" key={rowIndex}>
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
                    "ui-kb__key",
                    key.finger ? `ui-finger-${key.finger}` : "",
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
                    <span className="ui-kb__symbols">
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
