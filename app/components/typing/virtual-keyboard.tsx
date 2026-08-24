"use client";

import {
  KEYBOARD_ROWS,
  lookupTypingCharacter,
  oppositeShiftHand,
} from "../../../src/tastschreiben/keyboard-layout";

export interface TypingKeyPress {
  char: string;
  correct: boolean;
  nonce: number;
}

export function VirtualKeyboard({
  nextChar,
  lastPress,
}: {
  nextChar: string | undefined;
  lastPress?: TypingKeyPress | null;
}) {
  const nextBase = nextChar
    ? lookupTypingCharacter(nextChar)?.key.base
    : undefined;
  const shiftHand = nextChar ? oppositeShiftHand(nextChar) : null;

  return (
    <div className="virtual-keyboard" aria-hidden="true">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div className={`virtual-keyboard__row row-${rowIndex}`} key={rowIndex}>
          {row.map((key) => {
            const pressedBase = lastPress
              ? (lookupTypingCharacter(lastPress.char)?.key.base ??
                lastPress.char)
              : undefined;
            const isFlash = pressedBase === key.base;
            return (
              <span
                className={[
                  "virtual-keyboard__key",
                  `finger-${key.finger}`,
                  key.base === " " ? "is-space" : "",
                  nextBase === key.base ? "is-next" : "",
                  isFlash
                    ? lastPress?.correct
                      ? "is-correct"
                      : "is-wrong"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={`${key.base}-${isFlash ? lastPress?.nonce : "idle"}`}
              >
                {key.base === " " ? "" : key.base}
              </span>
            );
          })}
        </div>
      ))}
      <div className="virtual-keyboard__shift-row">
        <span className={shiftHand === "left" ? "is-next" : undefined}>⇧</span>
        <span className={shiftHand === "right" ? "is-next" : undefined}>⇧</span>
      </div>
    </div>
  );
}
