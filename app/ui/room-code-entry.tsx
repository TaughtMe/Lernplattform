"use client";

import { useId, useState, type FormEvent } from "react";
import { extractJoinCode, normalizeJoinCode } from "../../src/domain/join-code";
import { QrCodeScanner } from "./qr-scanner";
import { SegmentedRoomCode } from "../components/segmented-room-code";
import { useHydrated } from "../components/use-hydrated";

/**
 * Raumcode-Eingabe nach Design 2a: vier Ziffernfelder und grüner
 * Kamera-Knopf. Nach der vierten Ziffer öffnet sich der Raum direkt; darauf
 * weist der Hilfetext vorher hin (WCAG 3.2.2).
 */
export function RoomCodeEntry({
  onCode = (code) =>
    window.location.assign(`/raum?code=${encodeURIComponent(code)}`),
  initialCode = "",
  hint = "Nach der vierten Ziffer geht es los.",
}: {
  onCode?: (code: string) => void;
  initialCode?: string;
  hint?: string;
}) {
  const id = useId();
  const hydrated = useHydrated();
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState("");

  function open(raw: string) {
    const value = normalizeJoinCode(raw);
    if (!/^\d{4}$/.test(value)) {
      setError("Bitte gib den vierstelligen Raumcode ein.");
      return;
    }
    setError("");
    onCode(value);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    open(code);
  }

  return (
    <form
      className="ui-room-code"
      onSubmit={submit}
      noValidate
      data-hydrated={hydrated ? "true" : "false"}
    >
      <div className="ui-between ui-room-code__head">
        <span id={labelId} className="ui-eyebrow">
          Raumcode
        </span>
        <span className="ui-small ui-muted">von der Tafel oder per QR</span>
      </div>
      <div className="ui-row ui-room-code__controls">
        <div className="ui-grow">
          <SegmentedRoomCode
            idPrefix={id}
            labelId={labelId}
            value={code}
            invalid={Boolean(error)}
            describedBy={error ? `${hintId} ${errorId}` : hintId}
            className="ui-code"
            onChange={(value) => {
              setCode(value);
              if (error) setError("");
              if (/^\d{4}$/.test(value)) open(value);
            }}
          />
        </div>
        <QrCodeScanner
          buttonClassName="ui-room-code__camera"
          onResult={(value) => {
            const scanned = extractJoinCode(value);
            setCode(scanned);
            open(scanned);
          }}
        />
      </div>
      <p id={hintId} className="ui-small ui-muted">
        {hint}
      </p>
      {/* Ermöglicht das Absenden mit der Eingabetaste (mehrere Felder). */}
      <button type="submit" className="ui-sr-only">
        Beitreten
      </button>
      {error ? (
        <p id={errorId} role="alert" className="ui-notice ui-notice--bad">
          {error}
        </p>
      ) : null}
    </form>
  );
}
