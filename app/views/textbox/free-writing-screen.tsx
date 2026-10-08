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
import { Button } from "../../ui/primitives";
import { StepList } from "./memorize-screen";
import styles from "./textbox.module.css";

/** Durchgang 4: der ganze Text aus dem Gedächtnis in ein leeres Feld. */
export function FreeWritingScreen({
  title,
  onSubmit,
}: {
  title: string;
  onSubmit: (text: string, writingMs: number) => void;
}) {
  const [value, setValue] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    field.current?.focus();
  }, []);

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
    <section className={styles.screen} aria-labelledby="textbox-title">
      <header className={styles.head}>
        <div>
          <h1 id="textbox-title" className={styles.title} tabIndex={-1}>
            Durchgang 4 von 4: Schreiben
          </h1>
          <p className={styles.subtitle}>{title}</p>
        </div>
        <StepList active={1} />
      </header>
      <p className={styles.hint}>
        Schreibe den ganzen Text aus dem Gedächtnis auf. Wenn du nicht
        weiterkommst, kannst du jederzeit auf „Prüfen“ drücken.
      </p>
      <textarea
        ref={field}
        className={styles.free}
        aria-label="Dein Text aus dem Gedächtnis"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={() => {
          if (startedAt.current === null) startedAt.current = Date.now();
        }}
        onBeforeInput={onBeforeInput}
        onPaste={block}
        onDrop={block}
        {...STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES}
      />
      <div className={styles.actions}>
        <Button
          size="lg"
          onClick={() =>
            onSubmit(
              value,
              startedAt.current === null ? 0 : Date.now() - startedAt.current,
            )
          }
        >
          Prüfen
        </Button>
      </div>
    </section>
  );
}
