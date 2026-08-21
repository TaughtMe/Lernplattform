"use client";

import { useState, type FormEvent } from "react";
import { openDuell, joinDuell } from "../../../src/duell/duell-api.ts";
import { readDuellIdentity, saveDuellIdentity } from "../../../src/duell/duell-identity.ts";
import { DEFAULT_ROUND_SIZE, type DuellArt } from "../../../src/duell/duell-content.ts";
import type { JoinedDuellIdentity } from "./duell-app.tsx";

const DUELL_ARTEN: { value: DuellArt; label: string }[] = [
  { value: "herausforderer-stapel", label: "Herausforderer-Stapel – nur meine Wörter" },
  { value: "wechselduell", label: "Wechselduell – Hälfte von jeder Person" },
  { value: "schwierige-woerter", label: "Schwierige Wörter – niedrigster Boxwert zuerst" },
  { value: "zufaellige-woerter", label: "Zufällige Wörter" },
];

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, 4);
}

function codeFromUrl(): string {
  if (typeof window === "undefined") return "";
  return digitsOnly(new URLSearchParams(window.location.search).get("code") ?? "");
}

export function DuellStart({ onJoined }: { onJoined: (identity: JoinedDuellIdentity) => void }) {
  const [mode, setMode] = useState<"open" | "join">(codeFromUrl() ? "join" : "open");
  const [art, setArt] = useState<DuellArt>("zufaellige-woerter");
  const [roundSize, setRoundSize] = useState(DEFAULT_ROUND_SIZE);
  const [alias, setAlias] = useState("");
  const [code, setCode] = useState(codeFromUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen(event: FormEvent) {
    event.preventDefault();
    const trimmedAlias = alias.trim();
    if (!trimmedAlias) {
      setError("Bitte gib einen Namen ein.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const opened = await openDuell(art, trimmedAlias, roundSize);
      saveDuellIdentity(opened.code, trimmedAlias, opened.participantToken);
      onJoined({ duellId: opened.duellId, code: opened.code, art, roundSize, alias: trimmedAlias, joinOrder: 0, participantToken: opened.participantToken });
    } catch {
      setError("Duell konnte nicht geöffnet werden. Prüfe deine Internetverbindung.");
      setBusy(false);
    }
  }

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    const trimmedAlias = alias.trim();
    if (code.length !== 4) {
      setError("Bitte gib den vierstelligen Duell-Code ein.");
      return;
    }
    if (!trimmedAlias) {
      setError("Bitte gib einen Namen ein.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const existingToken = readDuellIdentity(code)?.participantToken;
      const joined = await joinDuell(code, trimmedAlias, existingToken);
      if (!joined) {
        setError("Zu diesem Code wurde kein offenes Duell gefunden.");
        setBusy(false);
        return;
      }
      if (joined.status !== "lobby") {
        setError("Dieses Duell läuft bereits oder ist beendet.");
        setBusy(false);
        return;
      }
      saveDuellIdentity(code, joined.assignedAlias, joined.participantToken);
      onJoined({
        duellId: joined.duellId,
        code,
        art: joined.art,
        roundSize: DEFAULT_ROUND_SIZE,
        alias: joined.assignedAlias,
        joinOrder: joined.joinOrder,
        participantToken: joined.participantToken,
      });
    } catch {
      setError("Der Beitritt ist gerade nicht möglich. Prüfe deine Internetverbindung.");
      setBusy(false);
    }
  }

  return (
    <div className="duell-start">
      <div className="duell-start__tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "open"} className={mode === "open" ? "duell-start__tab duell-start__tab--active" : "duell-start__tab"} onClick={() => setMode("open")}>
          Duell öffnen
        </button>
        <button type="button" role="tab" aria-selected={mode === "join"} className={mode === "join" ? "duell-start__tab duell-start__tab--active" : "duell-start__tab"} onClick={() => setMode("join")}>
          Duell beitreten
        </button>
      </div>

      {mode === "open" ? (
        <form className="duell-start__form" onSubmit={handleOpen}>
          <label htmlFor="duell-art">Duellart</label>
          <select id="duell-art" value={art} onChange={(event) => setArt(event.target.value as DuellArt)}>
            {DUELL_ARTEN.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <label htmlFor="duell-round-size">Anzahl Wörter</label>
          <input
            id="duell-round-size"
            type="number"
            min={4}
            max={30}
            value={roundSize}
            onChange={(event) => setRoundSize(Math.min(30, Math.max(4, Number(event.target.value) || DEFAULT_ROUND_SIZE)))}
          />

          <label htmlFor="duell-alias-open">Dein Name</label>
          <input id="duell-alias-open" value={alias} onChange={(event) => setAlias(event.target.value)} maxLength={60} placeholder="z. B. Mia" autoComplete="off" />

          {error && <p role="alert" className="duell-start__error">{error}</p>}

          <button className="button button--primary" type="submit" disabled={busy}>{busy ? "Öffne …" : "Duell öffnen"}</button>
        </form>
      ) : (
        <form className="duell-start__form" onSubmit={handleJoin}>
          <label htmlFor="duell-code">Duell-Code</label>
          <input
            id="duell-code"
            value={code}
            onChange={(event) => setCode(digitsOnly(event.target.value))}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder="z. B. 4821"
            autoComplete="off"
          />

          <label htmlFor="duell-alias-join">Dein Name</label>
          <input id="duell-alias-join" value={alias} onChange={(event) => setAlias(event.target.value)} maxLength={60} placeholder="z. B. Ben" autoComplete="off" />

          {error && <p role="alert" className="duell-start__error">{error}</p>}

          <button className="button button--primary" type="submit" disabled={busy}>{busy ? "Trete bei …" : "Beitreten"}</button>
        </form>
      )}
    </div>
  );
}
