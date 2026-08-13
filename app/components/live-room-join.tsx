"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { extractJoinCode, normalizeJoinCode } from "../../src/domain/join-code";
import {
  getLiveRoomClient,
  type LiveRoomConfig,
} from "../../src/integrations/laufdiktat/live-room-client";
import {
  joinLiveRoom,
  readLiveRoomIdentity,
  saveLiveRoomIdentity,
  type JoinedLiveRoom,
} from "../../src/integrations/laufdiktat/room-api";
import { QrCodeScanner } from "./qr-code-scanner";

type View = "join" | "connecting" | "lobby" | "starting";

type LiveRoomJoinProps = {
  initialCode?: string;
  liveRoomConfig: LiveRoomConfig | null;
};

export function LiveRoomJoin({
  initialCode = "",
  liveRoomConfig,
}: LiveRoomJoinProps) {
  const [code, setCode] = useState(() =>
    normalizeJoinCode(initialCode).replace(/\D/g, "").slice(0, 4),
  );
  const [name, setName] = useState("");
  const [view, setView] = useState<View>("join");
  const [error, setError] = useState("");
  const [room, setRoom] = useState<JoinedLiveRoom | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!room || view !== "lobby" || !liveRoomConfig) return;

    const client = getLiveRoomClient(liveRoomConfig);
    const channel = client.channel(`room-${code}`, {
      config: { presence: { key: room.studentName } },
    });
    channel
      .on("broadcast", { event: "session-start" }, () => setView("starting"))
      .on("broadcast", { event: "session-ended" }, () => {
        setView("join");
        setRoom(null);
        setError("Der Raum wurde beendet.");
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ name: room.studentName });
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setError("Die Verbindung zur Lobby wurde unterbrochen.");
        }
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [code, liveRoomConfig, room, view]);

  function useScan(value: string) {
    const scanned = extractJoinCode(value).replace(/\D/g, "").slice(0, 4);
    setCode(scanned);
    setError("");
    codeRef.current?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = code.replace(/\D/g, "").slice(0, 4);
    const normalizedName = name.trim().replace(/\s+/g, " ").slice(0, 32);
    if (!/^\d{4}$/.test(normalizedCode)) {
      setError("Bitte gib den vierstelligen Raumcode ein.");
      codeRef.current?.focus();
      return;
    }
    if (normalizedName.length < 2) {
      setError("Bitte gib deinen Namen ein.");
      return;
    }
    if (!liveRoomConfig) {
      setError(
        "Live-Räume sind in dieser lokalen Vorschau noch nicht mit dem Laufdiktat-Raumdienst verbunden.",
      );
      return;
    }

    setView("connecting");
    setError("");
    try {
      const identity = readLiveRoomIdentity(normalizedCode);
      const joined = await joinLiveRoom(
        liveRoomConfig,
        normalizedCode,
        normalizedName,
        identity?.participantToken,
      );
      if (!joined || joined.status === "ended") {
        setView("join");
        setError("Dieser Raum ist nicht verfügbar oder wurde bereits beendet.");
        return;
      }
      saveLiveRoomIdentity({
        code: normalizedCode,
        name: joined.studentName,
        participantToken: joined.participantToken,
      });
      setCode(normalizedCode);
      setName(joined.studentName);
      setRoom(joined);
      setView(joined.status === "live" ? "starting" : "lobby");
    } catch {
      setView("join");
      setError("Der Raum konnte nicht erreicht werden. Bitte prüfe den Code.");
    }
  }

  if (view === "lobby" || view === "starting") {
    return (
      <main className="live-room-page">
        <section className="live-room-state" aria-live="polite">
          <span className="live-room-state__mark" aria-hidden="true">
            {view === "lobby" ? "✓" : "→"}
          </span>
          <p className="eyebrow">Raum {code}</p>
          <h1>
            {view === "lobby"
              ? `Du bist dabei, ${room?.studentName}.`
              : "Das Laufdiktat startet."}
          </h1>
          <p>
            {view === "lobby"
              ? "Warte kurz, bis die Lehrkraft die Runde startet."
              : "Die Übung wird im Lernraum vorbereitet."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="live-room-page">
      <section className="live-room-join" aria-labelledby="live-room-title">
        <p className="eyebrow">Laufdiktat</p>
        <h1 id="live-room-title">Raum beitreten</h1>
        <p className="live-room-join__intro">
          Gib den Code von der Tafel ein oder scanne den QR-Code.
        </p>
        <form onSubmit={submit} noValidate>
          <label htmlFor="live-room-code">Raumcode</label>
          <div className="live-room-code-row">
            <input
              ref={codeRef}
              id="live-room-code"
              className="live-room-code-input"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={4}
              value={code}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "live-room-error" : undefined}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 4));
                setError("");
              }}
            />
            <QrCodeScanner onResult={useScan} />
          </div>
          <label htmlFor="live-room-name">Dein Name</label>
          <input
            id="live-room-name"
            className="live-room-name-input"
            autoComplete="name"
            maxLength={32}
            placeholder="Vorname oder Klassenname"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
          />
          {error ? (
            <p id="live-room-error" className="live-room-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="button button--primary" type="submit">
            {view === "connecting"
              ? "Verbindung wird aufgebaut …"
              : "Beitreten"}
          </button>
        </form>
      </section>
    </main>
  );
}
