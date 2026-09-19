"use client";

import { ClipboardEvent, KeyboardEvent, useRef } from "react";

type SegmentedRoomCodeProps = {
  idPrefix: string;
  labelId: string;
  value: string;
  invalid?: boolean;
  describedBy: string | undefined;
  onChange: (value: string) => void;
};

export function SegmentedRoomCode({
  idPrefix,
  labelId,
  value,
  invalid = false,
  describedBy,
  onChange,
}: SegmentedRoomCodeProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 4 }, (_, index) => value[index] ?? "");

  function replaceDigit(index: number, rawValue: string) {
    const incoming = rawValue.replace(/\D/g, "");
    if (incoming.length > 1) {
      const next = incoming.slice(0, 4);
      onChange(next);
      refs.current[Math.min(next.length, 3)]?.focus();
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = incoming;
    onChange(nextDigits.join(""));
    if (incoming && index < 3) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < 3) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 4);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    refs.current[Math.min(pasted.length, 3)]?.focus();
  }

  return (
    <div
      className="room-code__digits"
      role="group"
      aria-labelledby={labelId}
      onPaste={handlePaste}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          id={`${idPrefix}-digit-${index + 1}`}
          name={`${idPrefix}-digit-${index + 1}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={1}
          value={digit}
          aria-label={`Ziffer ${index + 1}`}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(event) => replaceDigit(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
        />
      ))}
    </div>
  );
}
