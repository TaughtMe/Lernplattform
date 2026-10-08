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
import { StepList } from "./memorize-screen";
import { TextFlow } from "./text-flow";
import styles from "./textbox.module.css";

/** Breite der Lücken in Durchgang 3 (kalibrierbar, Plan 1.4). */
const UNIFORM_GAP_WIDTH = 11;

/** Die Schreibzeit startet mit dem ersten Tastenanschlag. */
function markStart(ref: { current: number | null }) {
  if (ref.current === null) ref.current = Date.now();
}

/** Schreibt direkt in die Lücken des Textes (Durchgang 1 bis 3). */
export function GapWritingScreen({
  round,
  title,
  tokens,
  blanked,
  onSubmit,
}: {
  round: 1 | 2 | 3;
  title: string;
  tokens: readonly LayoutToken[];
  /** Wortindizes der Lücken, aufsteigend. */
  blanked: readonly number[];
  onSubmit: (inputs: string[], writingMs: number) => void;
}) {
  const [values, setValues] = useState<string[]>(() => blanked.map(() => ""));
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const submitButton = useRef<HTMLButtonElement>(null);
  const startedAt = useRef<number | null>(null);
  const gapOf = new Map(blanked.map((word, gap) => [word, gap] as const));

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

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

  return (
    <section className={styles.screen} aria-labelledby="textbox-title">
      <header className={styles.head}>
        <div>
          <h1 id="textbox-title" className={styles.title} tabIndex={-1}>
            Durchgang {round} von 4: Schreiben
          </h1>
          <p className={styles.subtitle}>{title}</p>
        </div>
        <StepList active={1} />
      </header>
      <p className={styles.hint}>
        Schreibe die fehlenden Wörter in die Lücken. Mit der Leertaste oder der
        Eingabetaste springst du zur nächsten Lücke.
      </p>
      <div className={styles.paper}>
        <TextFlow
          className={styles.text}
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
      <div className={styles.actions}>
        <button
          ref={submitButton}
          type="button"
          className="ui-btn ui-btn--primary ui-btn--lg"
          onClick={() =>
            onSubmit(
              values,
              startedAt.current === null ? 0 : Date.now() - startedAt.current,
            )
          }
        >
          Prüfen
        </button>
      </div>
    </section>
  );
}
