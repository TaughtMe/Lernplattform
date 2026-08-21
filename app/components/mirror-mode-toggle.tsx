"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  MIRROR_DURATION_PRESETS_MIN,
  DEFAULT_MIRROR_DURATION_MIN,
  isMirrorActive,
  remainingMinutes,
  getMirrorUntil,
  grantMirrorMode,
  endMirrorMode,
  hasMirrorPin,
  setMirrorPin,
  verifyMirrorPin,
} from "../../src/barrierefreiheit/mirror-mode.ts";
import { useIsClient } from "./use-is-client.ts";

const MIRROR_CLASS = "mirror-mode-active";
const CHECK_INTERVAL_MS = 5000;

/**
 * Spiegelschrift-Freigabe: eine Lehrkraft schaltet für dieses Gerät
 * zeitlich begrenzt eine gespiegelte Darstellung frei (auf Wunsch, nach
 * praktischer Erfahrung an der Schule). Die Freigabe-PIN ist bewusst
 * geräteweit und unabhängig von der Lehrer-Cockpit-PIN, da dieses Gerät
 * ein reines Schülergerät sein kann, das /lehrer nie öffnet. Nach Ablauf
 * stellt sich die Darstellung automatisch zurück, spätestens beim
 * nächsten periodischen Check — kein Zutun nötig.
 */
export function MirrorModeToggle() {
  const isClient = useIsClient();
  const [, forceRender] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [duration, setDuration] = useState<number>(DEFAULT_MIRROR_DURATION_MIN);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isClient) return;
    function sync() {
      document.body.classList.toggle(MIRROR_CLASS, isMirrorActive(getMirrorUntil()));
    }
    sync();
    const id = setInterval(() => {
      sync();
      forceRender((n) => n + 1);
    }, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isClient]);

  if (!isClient) {
    return <span className="mirror-mode-toggle" aria-hidden="true" />;
  }

  const until = getMirrorUntil();
  const active = isMirrorActive(until);

  function openDialog() {
    setError(null);
    setPin("");
    setConfirmPin("");
    setDuration(DEFAULT_MIRROR_DURATION_MIN);
    setDialogOpen(true);
  }

  async function handleGrant(event: FormEvent) {
    event.preventDefault();
    if (!hasMirrorPin()) {
      if (pin.length < 4) {
        setError("Die PIN muss mindestens 4 Zeichen haben.");
        return;
      }
      if (pin !== confirmPin) {
        setError("Die PINs stimmen nicht überein.");
        return;
      }
      await setMirrorPin(pin);
    } else if (!(await verifyMirrorPin(pin))) {
      setError("Falsche PIN.");
      return;
    }
    grantMirrorMode(duration);
    document.body.classList.add(MIRROR_CLASS);
    setDialogOpen(false);
    forceRender((n) => n + 1);
  }

  function handleEnd() {
    endMirrorMode();
    document.body.classList.remove(MIRROR_CLASS);
    forceRender((n) => n + 1);
  }

  return (
    <>
      <button
        type="button"
        className="mirror-mode-toggle"
        aria-label={active ? `Spiegelschrift beenden (noch ${remainingMinutes(until)} Minuten)` : "Spiegelschrift freigeben (Lehrkraft-PIN nötig)"}
        onClick={active ? handleEnd : openDialog}
      >
        {active ? `🪞 ${remainingMinutes(until)}′` : "🪞"}
      </button>

      {dialogOpen &&
        createPortal(
          <div className="qr-overlay" role="dialog" aria-modal="true" aria-label="Spiegelschrift freigeben">
            <button type="button" className="qr-overlay__backdrop" onClick={() => setDialogOpen(false)} aria-label="Schließen" />
            <form className="lehrer-gate" onSubmit={handleGrant}>
              <h2>Spiegelschrift freigeben</h2>
              <p>Nur die Lehrkraft darf diesen Modus freischalten — er stellt sich nach der gewählten Zeit von selbst zurück.</p>
              {!hasMirrorPin() ? (
                <>
                  <label htmlFor="mirror-new-pin">Neue Freigabe-PIN für dieses Gerät</label>
                  <input id="mirror-new-pin" type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} minLength={4} required />
                  <label htmlFor="mirror-confirm-pin">PIN wiederholen</label>
                  <input id="mirror-confirm-pin" type="password" inputMode="numeric" autoComplete="off" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} minLength={4} required />
                </>
              ) : (
                <>
                  <label htmlFor="mirror-pin">Freigabe-PIN</label>
                  <input id="mirror-pin" type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} required />
                </>
              )}
              <label htmlFor="mirror-duration">Dauer</label>
              <select id="mirror-duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {MIRROR_DURATION_PRESETS_MIN.map((min) => (
                  <option key={min} value={min}>{min} Minuten</option>
                ))}
              </select>
              {error && <p role="alert" className="lehrer-gate__error">{error}</p>}
              <button className="button button--primary" type="submit">Freigeben</button>
              <button className="button button--quiet" type="button" onClick={() => setDialogOpen(false)}>Abbrechen</button>
            </form>
          </div>,
          document.body,
        )}
    </>
  );
}
