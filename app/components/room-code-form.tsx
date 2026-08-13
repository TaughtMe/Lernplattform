"use client";

import { FormEvent, useState } from "react";
import { extractJoinCode, normalizeJoinCode } from "../../src/domain/join-code";
import { QrCodeScanner } from "./qr-code-scanner";

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
        <label htmlFor={inputId}>{label}</label>
        <input
          id={inputId}
          name="roomCode"
          autoComplete="off"
          inputMode={mode === "room" ? "numeric" : "text"}
          pattern={mode === "room" ? "[0-9]*" : undefined}
          maxLength={mode === "room" ? 4 : 12}
          placeholder={mode === "room" ? "z. B. 4829" : "Code eingeben"}
          value={code}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          onChange={(event) => {
            setCode(normalizeJoinCode(event.target.value));
            if (error) setError("");
          }}
        />
        <QrCodeScanner onResult={useScan} />
        <button className="button button--secondary" type="submit">
          Beitreten
        </button>
      </form>
      {error ? (
        <p id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
