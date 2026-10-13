"use client";

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES,
  isBlockedRunningDictationInput,
} from "../../../src/domain/running-dictation-input";
import type { LayoutToken } from "../../../src/domain/text-compare";
import type { RunFrameProps } from "./memorize-screen";
import { RunButton, RunLayout } from "./run-layout";
import styles from "./run-layout.module.css";
import { TextFlow } from "./text-flow";

/** Längste Eingabe in einer Lücke; schützt vor festgehaltenen Tasten. */
export const MAX_GAP_LENGTH = 40;

/** Breite der Lücken in Durchgang 3 (kalibrierbar, Plan 1.4). */
const UNIFORM_GAP_WIDTH = 11;

/** Die Schreibzeit startet mit dem ersten Tastenanschlag. */
function markStart(ref: { current: number | null }) {
  if (ref.current === null) ref.current = Date.now();
}

/** Schreibt direkt in die Lücken des Textes (Durchgang 1 bis 3). */
export function GapWritingScreen({
  round,
  tokens,
  blanked,
  onSubmit,
  initialFocus = true,
  ...frame
}: RunFrameProps & {
  round: 1 | 2 | 3;
  tokens: readonly LayoutToken[];
  /** Wortindizes der Lücken, aufsteigend. */
  blanked: readonly number[];
  onSubmit: (inputs: string[], writingMs: number) => void;
  /** Fokus beim Öffnen in die erste Lücke (der Katalog schaltet ihn ab). */
  initialFocus?: boolean;
}) {
  const [values, setValues] = useState<string[]>(() => blanked.map(() => ""));
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const submitButton = useRef<HTMLButtonElement>(null);
  const startedAt = useRef<number | null>(null);
  const gapOf = new Map(blanked.map((word, gap) => [word, gap] as const));

  useEffect(() => {
    if (initialFocus) inputs.current[0]?.focus();
  }, [initialFocus]);

  const touch = () => markStart(startedAt);

  function focusGap(gap: number) {
    if (gap >= blanked.length) {
      submitButton.current?.focus();
      return;
    }
    const target = inputs.current[gap];
    target?.focus();
    target?.scrollIntoView?.({ block: "center" });
  }

  function onKeyDown(gap: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    touch();
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      focusGap(gap + 1);
    } else if (event.key === "Tab") {
      if (event.shiftKey) {
        if (gap > 0) {
          event.preventDefault();
          focusGap(gap - 1);
        }
      } else if (gap < blanked.length - 1) {
        event.preventDefault();
        focusGap(gap + 1);
      }
    } else if (event.key === "Backspace" && values[gap] === "" && gap > 0) {
      event.preventDefault();
      focusGap(gap - 1);
    }
  }

  function onChange(gap: number, raw: string) {
    touch();
    // Bildschirmtastaturen melden die Leertaste nicht immer als Taste.
    const jump = /\s/u.test(raw);
    const value = raw.replace(/\s+/gu, "");
    setValues((current) => current.map((v, i) => (i === gap ? value : v)));
    if (jump) focusGap(gap + 1);
  }

  function block(event: ClipboardEvent | DragEvent) {
    event.preventDefault();
  }

  function onBeforeInput(event: FormEvent<HTMLInputElement>) {
    if (
      isBlockedRunningDictationInput(
        (event.nativeEvent as InputEvent).inputType,
      )
    ) {
      event.preventDefault();
    }
  }

  const filled = values.filter((value) => value !== "").length;

  return (
    <RunLayout
      {...frame}
      round={round}
      step={1}
      hint="Schreibe die fehlenden Wörter in die Lücken. Mit der Leertaste oder der Eingabetaste springst du zur nächsten Lücke."
      footerStart={`${filled} von ${blanked.length} Lücken ausgefüllt`}
      actions={
        <RunButton
          ref={submitButton}
          onClick={() =>
            onSubmit(
              values,
              startedAt.current === null ? 0 : Date.now() - startedAt.current,
            )
          }
        >
          Prüfen
        </RunButton>
      }
    >
      <div className={styles.paper}>
        <TextFlow
          className={styles.lined}
          tokens={tokens}
          renderWord={(token) => {
            const gap = gapOf.get(token.index);
            if (gap === undefined) return token.text;
            const length = Array.from(token.text).length;
            const width =
              round === 3 ? UNIFORM_GAP_WIDTH : Math.max(3, length) + 1;
            return (
              <input
                ref={(element) => {
                  inputs.current[gap] = element;
                }}
                className={styles.gap}
                style={{ width: `${width}ch` }}
                type="text"
                maxLength={MAX_GAP_LENGTH}
                aria-label={`Lücke ${gap + 1} von ${blanked.length}`}
                value={values[gap] ?? ""}
                onChange={(event) => onChange(gap, event.target.value)}
                onKeyDown={(event) => onKeyDown(gap, event)}
                onBeforeInput={onBeforeInput}
                onPaste={block}
                onDrop={block}
                onFocus={(event) =>
                  event.currentTarget.scrollIntoView?.({ block: "center" })
                }
                {...STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES}
              />
            );
          }}
        />
      </div>
    </RunLayout>
  );
}
