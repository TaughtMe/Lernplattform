"use client";

import { useEffect, useState } from "react";
import { KEYBOARD_ROWS, lookupChar, handOf } from "../../../src/tastschreiben/keyboard-layout.ts";

export interface LastPress {
  char: string;
  correct: boolean;
  /** Ändert sich bei jedem Tastendruck, auch bei Wiederholung desselben Zeichens — löst den Blitz-Effekt erneut aus. */
  nonce: number;
}

type Props = {
  /** Das als Nächstes erwartete Zeichen — diese Taste (und ggf. die passende Shift-Taste) wird hervorgehoben. */
  nextChar?: string;
  lastPress?: LastPress | null;
};

const FLASH_DURATION_MS = 220;

export function VirtualKeyboard({ nextChar, lastPress }: Props) {
  const [seenNonce, setSeenNonce] = useState<number | null>(null);
  const [flashBase, setFlashBase] = useState<{ base: string; correct: boolean } | null>(null);

  // A new keypress (changed nonce) is a prop change to react to during render,
  // not an effect — only the timeout that clears it afterwards is a real effect.
  if (lastPress && lastPress.nonce !== seenNonce) {
    setSeenNonce(lastPress.nonce);
    const info = lookupChar(lastPress.char);
    setFlashBase({ base: info?.key.base ?? lastPress.char, correct: lastPress.correct });
  }

  useEffect(() => {
    if (!flashBase) return;
    const timer = setTimeout(() => setFlashBase(null), FLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [flashBase]);

  const nextInfo = nextChar !== undefined ? lookupChar(nextChar) : undefined;
  const nextBase = nextInfo?.key.base;
  const shiftHand = nextInfo?.needsShift ? (handOf(nextInfo.key.finger) === "left" ? "right" : "left") : null;

  return (
    <div className="virtual-keyboard" aria-hidden="true">
      {KEYBOARD_ROWS.map((row, i) => (
        <div key={i} className={`virtual-keyboard__row virtual-keyboard__row--${i}`}>
          {row.map((key) => {
            const isNext = key.base === nextBase;
            const flash = flashBase?.base === key.base ? flashBase : null;
            const classes = [
              "virtual-keyboard__key",
              `virtual-keyboard__key--${key.finger}`,
              key.base === " " ? "virtual-keyboard__key--space" : "",
              isNext ? "virtual-keyboard__key--next" : "",
              flash ? (flash.correct ? "virtual-keyboard__key--flash-correct" : "virtual-keyboard__key--flash-wrong") : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <span key={key.base} className={classes}>
                {key.base === " " ? "" : key.base}
              </span>
            );
          })}
        </div>
      ))}
      <div className="virtual-keyboard__row virtual-keyboard__row--shift">
        <span className={`virtual-keyboard__key virtual-keyboard__key--shift virtual-keyboard__key--left-pinky${shiftHand === "left" ? " virtual-keyboard__key--next" : ""}`}>
          ⇧
        </span>
        <span className={`virtual-keyboard__key virtual-keyboard__key--shift virtual-keyboard__key--right-pinky${shiftHand === "right" ? " virtual-keyboard__key--next" : ""}`}>
          ⇧
        </span>
      </div>
    </div>
  );
}
