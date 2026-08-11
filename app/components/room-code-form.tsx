"use client";

import { FormEvent, useState } from "react";

export function RoomCodeForm() {
  const [error, setError] = useState("");

  function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roomCode = String(form.get("roomCode") ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (roomCode.length < 6) {
      setError("Bitte gib einen sechsstelligen Raumcode ein.");
      return;
    }
    window.location.assign(`/raum?code=${encodeURIComponent(roomCode)}`);
  }

  return (
    <div className="room-code" id="raumcode">
      <form onSubmit={joinRoom} noValidate>
        <label htmlFor="room-code-input">Raumcode</label>
        <input id="room-code-input" name="roomCode" autoComplete="off" maxLength={8} placeholder="z. B. 482913" aria-describedby={error ? "room-code-error" : undefined} aria-invalid={Boolean(error)} onChange={() => error && setError("")} />
        <button className="button button--secondary" type="submit">Beitreten</button>
      </form>
      {error ? <p id="room-code-error" role="alert">{error}</p> : null}
    </div>
  );
}
