"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { TeacherService } from "../../../src/klasse/klasse-service.ts";

interface Props {
  service: TeacherService;
  onUnlocked: () => void;
}

/**
 * Lehrerbereich-Zugangssperre: lokale PIN, gehasht+gesalzen gespeichert
 * (siehe teacher-auth.ts), niemals im Klartext. Der Entsperrzustand lebt nur
 * im React-State dieser Komponente — ein Neuladen der Seite verlangt die PIN
 * erneut. PIN-Wiederherstellung ist laut Entscheidungsprotokoll (Punkt 11,
 * "genaue Lehrer-Authentifizierung und Wiederherstellung") noch offen; bis
 * dahin hilft nur ein Zurücksetzen über die Browser-Daten dieser Seite.
 */
export function TeacherPinGate({ service, onUnlocked }: Props) {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    service.hasPinSet().then(setHasPin);
  }, [service]);

  if (hasPin === null) {
    return (
      <div className="lehrer-gate">
        <p>Lade …</p>
      </div>
    );
  }

  async function handleSetup(event: FormEvent) {
    event.preventDefault();
    if (pin.length < 4) {
      setError("Die PIN muss mindestens 4 Zeichen haben.");
      return;
    }
    if (pin !== confirmPin) {
      setError("Die PINs stimmen nicht überein.");
      return;
    }
    setBusy(true);
    await service.setPin(pin);
    onUnlocked();
  }

  async function handleUnlock(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const ok = await service.unlockWithPin(pin);
    if (!ok) {
      setError("Falsche PIN.");
      setBusy(false);
      return;
    }
    onUnlocked();
  }

  if (!hasPin) {
    return (
      <form className="lehrer-gate" onSubmit={handleSetup}>
        <h2>Lehrerbereich einrichten</h2>
        <p>Lege eine lokale PIN fest, die diesen Bereich auf diesem Gerät schützt.</p>
        <label htmlFor="new-pin">Neue PIN</label>
        <input id="new-pin" type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} minLength={4} required />
        <label htmlFor="confirm-pin">PIN wiederholen</label>
        <input id="confirm-pin" type="password" inputMode="numeric" autoComplete="off" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} minLength={4} required />
        {error && <p role="alert" className="lehrer-gate__error">{error}</p>}
        <button className="button button--primary" type="submit" disabled={busy}>PIN festlegen</button>
      </form>
    );
  }

  return (
    <form className="lehrer-gate" onSubmit={handleUnlock}>
      <h2>Lehrerbereich</h2>
      <label htmlFor="unlock-pin">PIN</label>
      <input id="unlock-pin" type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} required />
      {error && <p role="alert" className="lehrer-gate__error">{error}</p>}
      <button className="button button--primary" type="submit" disabled={busy}>Entsperren</button>
    </form>
  );
}
