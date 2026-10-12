"use client";

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import {
  STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES,
  isBlockedRunningDictationInput,
} from "../../../src/domain/running-dictation-input";
import type { RunFrameProps } from "./memorize-screen";
import { RunButton, RunLayout } from "./run-layout";
import styles from "./run-layout.module.css";

/** Längster Text in Durchgang 4; schützt vor festgehaltenen Tasten. */
export const MAX_FREE_TEXT_LENGTH = 4000;

/** Durchgang 4: der ganze Text aus dem Gedächtnis in ein leeres Feld. */
export function FreeWritingScreen({
  onSubmit,
  initialFocus = true,
  ...frame
}: RunFrameProps & {
  onSubmit: (text: string, writingMs: number) => void;
  /** Fokus beim Öffnen ins Feld (der Katalog schaltet ihn ab). */
  initialFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (initialFocus) field.current?.focus();
  }, [initialFocus]);

  function block(event: ClipboardEvent | DragEvent) {
    event.preventDefault();
  }

  function onBeforeInput(event: FormEvent<HTMLTextAreaElement>) {
    if (
      isBlockedRunningDictationInput(
        (event.nativeEvent as InputEvent).inputType,
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <RunLayout
      {...frame}
      round={4}
      step={1}
      hint="Schreibe den ganzen Text aus dem Gedächtnis auf. Wenn du nicht weiterkommst, kannst du jederzeit auf „Prüfen“ drücken."
      actions={
        <RunButton
          onClick={() =>
            onSubmit(
              value,
              startedAt.current === null ? 0 : Date.now() - startedAt.current,
            )
          }
        >
          Prüfen
        </RunButton>
      }
    >
      <div className={`${styles.paper} ${styles.paperFree}`}>
        <textarea
          ref={field}
          className={styles.free}
          aria-label="Dein Text aus dem Gedächtnis"
          value={value}
          maxLength={MAX_FREE_TEXT_LENGTH}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={() => {
            if (startedAt.current === null) startedAt.current = Date.now();
          }}
          onBeforeInput={onBeforeInput}
          onPaste={block}
          onDrop={block}
          {...STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES}
        />
      </div>
    </RunLayout>
  );
}
