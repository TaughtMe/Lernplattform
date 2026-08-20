"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import { Camera } from "lucide-react";
import { isSupabaseConfigured } from "../../../src/laufdiktat/supabase-client.ts";
import { joinRoom } from "../../../src/laufdiktat/room-api.ts";
import { generateStudentName, animalToFileName, parseStudentName } from "../../../src/laufdiktat/animal-names.ts";
import { readRoomIdentity, saveRoomIdentity, clearRoomIdentity } from "../../../src/laufdiktat/room-identity.ts";
import { useIsClient } from "../use-is-client.ts";
import { GameSession } from "./game-session.tsx";
import { StationGame } from "./station-game.tsx";
import { QrScannerOverlay } from "./qr-scanner-overlay.tsx";

type JoinedRoom = { roomCode: string; studentName: string; roomId: string; participantToken: string; stationMode: boolean };

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, 4);
}

function codeFromUrl(): string {
  return digitsOnly(new URLSearchParams(window.location.search).get("code") ?? "");
}

/** Extracts a 4-digit room code from a scanned QR payload (a join URL, or a bare digit sequence). */
function codeFromScan(text: string): string {
  try {
    const url = new URL(text);
    const fromParam = url.searchParams.get("code");
    if (fromParam) return digitsOnly(fromParam);
  } catch {
    // not a URL — fall through to a plain digit search
  }
  const match = text.match(/\d{4,}/);
  return digitsOnly(match ? match[0] : text);
}

export function JoinRoom() {
  // The room code (from ?code=) and the random student name both depend on
  // browser-only state, so — like LernBoxApp — nothing real is rendered
  // before hydration completes, to avoid a server/client mismatch.
  const isClient = useIsClient();

  if (!isSupabaseConfigured) {
    return (
      <div className="room-join">
        <p>Live-Räume sind noch nicht eingerichtet.</p>
        <p className="room-join__hint">Die Lehrkraft muss zuerst ein Supabase-Projekt einrichten (siehe docs/architecture.md).</p>
      </div>
    );
  }

  if (!isClient) {
    return (
      <div className="room-join">
        <p>Lade …</p>
      </div>
    );
  }

  return <JoinRoomForm />;
}

function JoinRoomForm() {
  const [code, setCode] = useState(codeFromUrl);
  const [studentName, setStudentName] = useState(generateStudentName);
  const [joining, setJoining] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<JoinedRoom | null>(null);
  const { animal } = useMemo(() => parseStudentName(studentName), [studentName]);

  const handleScanResult = useCallback((text: string) => {
    const scanned = codeFromScan(text);
    setScanning(false);
    if (scanned.length === 4) {
      setCode(scanned);
      setError(null);
    }
  }, []);

  if (joined) {
    return joined.stationMode ? (
      <StationGame
        roomCode={joined.roomCode}
        roomId={joined.roomId}
        participantToken={joined.participantToken}
        onLeave={() => setJoined(null)}
      />
    ) : (
      <GameSession
        roomCode={joined.roomCode}
        studentName={joined.studentName}
        roomId={joined.roomId}
        participantToken={joined.participantToken}
        onLeave={() => setJoined(null)}
      />
    );
  }

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    if (code.length !== 4) {
      setError("Bitte gib den vierstelligen Raumcode ein.");
      return;
    }
    setJoining(true);
    setError(null);
    const existingToken = readRoomIdentity(code)?.participantToken;
    try {
      const room = await joinRoom(code, studentName, existingToken);
      if (!room) {
        clearRoomIdentity();
        setError("Zu diesem Code wurde kein aktiver Raum gefunden.");
        setJoining(false);
        return;
      }
      saveRoomIdentity(code, room.studentName, room.participantToken);
      setJoined({ roomCode: code, studentName: room.studentName, roomId: room.roomId, participantToken: room.participantToken, stationMode: room.stationMode });
    } catch {
      setError("Der Beitritt ist gerade nicht möglich. Prüfe deine Internetverbindung.");
      setJoining(false);
    }
  }

  return (
    <form onSubmit={handleJoin} className="room-join">
      <label htmlFor="laufdiktat-code">Raumcode</label>
      <div className="room-join__code-row">
        <input
          id="laufdiktat-code"
          value={code}
          onChange={(event) => setCode(digitsOnly(event.target.value))}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          placeholder="z. B. 4821"
          autoComplete="off"
        />
        <button type="button" className="room-join__scan" onClick={() => setScanning(true)} aria-label="QR-Code scannen" title="QR-Code scannen">
          <Camera className="qr-overlay__icon" />
        </button>
      </div>

      <img src={`/animals/${animalToFileName(animal)}.svg`} alt="" className="room-join__avatar" onError={(e) => { e.currentTarget.style.display = "none"; }} />
      <div className="room-join__name">{studentName}</div>
      <button className="button button--quiet" type="button" onClick={() => setStudentName(generateStudentName())}>Zufälligen Namen generieren</button>

      {error && <p role="alert" className="room-join__error">{error}</p>}

      <button className="button button--primary" type="submit" disabled={joining}>
        {joining ? "Trete bei …" : "Beitreten"}
      </button>

      {scanning && <QrScannerOverlay onResult={handleScanResult} onClose={() => setScanning(false)} />}
    </form>
  );
}
