"use client";

import { FormEvent, useState } from "react";

type RoomCodeFormProps = {
  idPrefix?: string;
};

export function RoomCodeForm({ idPrefix = "room" }: RoomCodeFormProps) {
  const [error, setError] = useState("");
  const inputId = `${idPrefix}-code-input`;
  const errorId = `${idPrefix}-code-error`;

  function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roomCode = String(form.get("roomCode") ?? "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
    if (!/^\d{4}$/.test(roomCode)) {
      setError("Bitte gib den vierstelligen Raumcode ein.");
      return;
    }
    window.location.assign(`/raum?code=${encodeURIComponent(roomCode)}`);
  }

  return (
    <div className="room-code">
      <form onSubmit={joinRoom} noValidate>
        <label htmlFor={inputId}>Raumcode</label>
        <input
          id={inputId}
          name="roomCode"
          autoComplete="off"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          placeholder="z. B. 4829"
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          onChange={() => error && setError("")}
        />
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
