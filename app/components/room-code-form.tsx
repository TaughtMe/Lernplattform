"use client";

import { FormEvent, useState } from "react";
import { extractJoinCode, normalizeJoinCode } from "../../src/domain/join-code";
import { QrCodeScanner } from "./qr-code-scanner";
import { SegmentedRoomCode } from "./segmented-room-code";

type RoomCodeFormProps = {
  idPrefix?: string;
  mode?: "room" | "auto";
};

export function RoomCodeForm({
  idPrefix = "room",
  mode = "room",
}: RoomCodeFormProps) {
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const inputId = `${idPrefix}-code-input`;
  const labelId = `${idPrefix}-code-label`;
  const errorId = `${idPrefix}-code-error`;
  const label = mode === "room" ? "Raumcode" : "Klassen- oder Raumcode";

  function openCode(rawCode: string) {
    const joinCode = normalizeJoinCode(rawCode);
    const isRoomCode = /^\d{4}$/.test(joinCode);
    const isClassCode = /^[A-Z0-9]{4,12}$/.test(joinCode);
    if (mode === "room" ? !isRoomCode : !isClassCode) {
      setError(
        mode === "room"
          ? "Bitte gib den vierstelligen Raumcode ein."
          : "Bitte gib einen gültigen Klassen- oder Raumcode ein.",
      );
      return;
    }
    const destination =
      mode === "room" || isRoomCode
        ? `/raum?code=${encodeURIComponent(joinCode)}`
        : `/klasse/7b?code=${encodeURIComponent(joinCode)}`;
    window.location.assign(destination);
  }

  function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openCode(code);
  }

  function useScan(value: string) {
    const scannedCode = extractJoinCode(value);
    setCode(scannedCode);
    setError("");
    openCode(scannedCode);
  }

  return (
    <div className="room-code">
      <form onSubmit={joinRoom} noValidate>
        <div className="room-code__heading">
          {mode === "room" ? (
            <span id={labelId} className="room-code__label">
              {label}
            </span>
          ) : (
            <label id={labelId} htmlFor={inputId}>
              {label}
            </label>
          )}
          <small>
            {mode === "room"
              ? "Vierstelligen Code eingeben oder QR-Code scannen"
              : "Code von deiner Lehrkraft eingeben oder QR-Code scannen"}
          </small>
        </div>
        <div className="room-code__controls">
          {mode === "room" ? (
            <SegmentedRoomCode
              idPrefix={idPrefix}
              labelId={labelId}
              value={code}
              invalid={Boolean(error)}
              describedBy={error ? errorId : undefined}
              onChange={(value) => {
                setCode(value);
                if (error) setError("");
              }}
            />
          ) : (
            <input
              id={inputId}
              name="roomCode"
              autoComplete="off"
              maxLength={12}
              placeholder="Code eingeben"
              value={code}
              aria-describedby={error ? errorId : undefined}
              aria-invalid={Boolean(error)}
              onChange={(event) => {
                setCode(normalizeJoinCode(event.target.value));
                if (error) setError("");
              }}
            />
          )}
          <QrCodeScanner onResult={useScan} />
          <button className="button button--secondary" type="submit">
            Beitreten
          </button>
        </div>
      </form>
      {error ? (
        <p id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
