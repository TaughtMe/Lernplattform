"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { strictInputProps } from "./input-guards";

/** Stufe 5: Mehrere Wörter aus dem Gedächtnis, Enter prüft, Umschalt + Enter neue Zeile. */
export function MemoryBlock({
  count,
  value,
  onChange,
}: {
  count: number;
  value: string;
  onChange: (value: string) => void;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    field.current?.focus();
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <label className="ui-stack" style={{ ["--gap" as string]: "6px" }}>
      <span className="ui-small ui-muted">
        {count === 1 ? "1 Wort" : `${count} Wörter`} eingeben · Enter prüft,
        Umschalt + Enter erzeugt eine neue Zeile
      </span>
      <textarea
        ref={field}
        className="ui-textarea"
        aria-label="Deine Lösung"
        rows={Math.max(3, count)}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        {...strictInputProps}
      />
    </label>
  );
}
