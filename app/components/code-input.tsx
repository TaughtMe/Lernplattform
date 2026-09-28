"use client";

import { useRef, useState } from "react";
import { Icon } from "./icons";
import { QrScanner, qrScanSupported } from "./qr-scanner";

/** Raumcodes sind vierstellig (Schema des Laufdiktats: rooms.code ~ '^[0-9]{4}$'). */
export const ROOM_CODE_LENGTH = 4;

export function normalizeRoomCode(value: string): string {
  // QR-Codes enthalten die Beitritts-URL (…/raum?code=1234) oder nur den Code.
  const fromUrl = /[?&]code=(\d{4})/.exec(value)?.[1];
  return (fromUrl ?? value).replace(/\D/g, "").slice(0, ROOM_CODE_LENGTH);
}

export function RoomCodeInput({ dark = false, onComplete }: { dark?: boolean; onComplete: (code: string) => void }) {
  const [chars, setChars] = useState<string[]>(Array(ROOM_CODE_LENGTH).fill(""));
  const [scan, setScan] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setAll = (value: string) => {
    const code = normalizeRoomCode(value);
    const next = Array.from({ length: ROOM_CODE_LENGTH }, (_, i) => code[i] ?? "");
    setChars(next);
    if (code.length === ROOM_CODE_LENGTH) onComplete(code);
    else refs.current[Math.min(code.length, ROOM_CODE_LENGTH - 1)]?.focus();
  };

  const type = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length > 1) return setAll(chars.slice(0, i).join("") + digits);
    const next = chars.slice();
    next[i] = digits;
    setChars(next);
    if (digits && i < ROOM_CODE_LENGTH - 1) refs.current[i + 1]?.focus();
    if (next.every(Boolean)) onComplete(next.join(""));
  };

  const style = dark
    ? { background: "#2a2723", borderColor: "#4a4438", color: "#fff8e8" }
    : undefined;

  return (
    <div className="stack" style={{ ["--gap" as string]: "10px" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${ROOM_CODE_LENGTH}, minmax(0,1fr)) 64px`, gap: 8 }}>
        {chars.map((c, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            className="code-input"
            style={style}
            value={c}
            inputMode="numeric"
            autoComplete="off"
            maxLength={ROOM_CODE_LENGTH}
            aria-label={`Raumcode Ziffer ${i + 1}`}
            onChange={(e) => type(i, e.target.value)}
            onKeyDown={(e) => { if (e.key === "Backspace" && !chars[i] && i > 0) refs.current[i - 1]?.focus(); }}
            onPaste={(e) => { e.preventDefault(); setAll(e.clipboardData.getData("text")); }}
          />
        ))}
        <button type="button" className="btn btn-green" style={{ height: 64, padding: 0 }} aria-label="Code mit Kamera scannen" onClick={() => setScan((s) => !s)}>
          <Icon name="camera" size={24} />
        </button>
      </div>
      {scan ? (
        qrScanSupported() ? <QrScanner onCode={(v) => { setScan(false); setAll(v); }} /> : <p className="small center" style={{ color: dark ? "#cfc7b6" : undefined }}>Die Kamera-Erkennung wird von diesem Browser nicht unterstützt. Bitte den Code von der Tafel eintippen.</p>
      ) : null}
    </div>
  );
}
