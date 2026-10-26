"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clearStudentData } from "../../src/storage/clear-student-data";
import {
  decideGuestCleanup,
  readGuestMode,
} from "../../src/storage/guest-mode";
import { Button, Notice } from "./primitives";
import { Sheet } from "./sheet";
import { useGuestMode } from "./use-guest-mode";

/** Nach dem Löschen: Startseite (Beenden) bzw. dieselbe Seite neu laden (Bereinigung). */
export type GuestLeave = (target: "start" | "reload") => void;

const defaultLeave: GuestLeave = (target) => {
  if (target === "start") window.location.assign("/");
  else window.location.reload();
};

/**
 * Sitzt im Root-Layout und kümmert sich um den Gastmodus eines geteilten
 * Geräts: Beim App-Start beendet und löscht er einen Gastmodus, der länger als
 * 12 Stunden läuft. Solange ein Gastmodus läuft, zeigt er ein dezentes Etikett
 * mit „Gastmodus beenden“; erst nach Bestätigung werden die Schülerdaten
 * gelöscht (`clearStudentData`).
 */
export function GuestModeHost({
  now = () => new Date(),
  leave = defaultLeave,
}: {
  now?: () => Date;
  leave?: GuestLeave;
}) {
  const guest = useGuestMode();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const cleaned = useRef(false);

  const clear = useCallback(
    async (target: "start") => {
      setBusy(true);
      setFailed(false);
      const result = await clearStudentData().catch(() => null);
      if (result?.complete) {
        leave(target);
        return;
      }
      setBusy(false);
      setFailed(true);
    },
    [leave],
  );

  // Frühe Initialisierung: einmal pro App-Start über die Zeit entscheiden. Ohne
  // Zustand in der Oberfläche; scheitert das Löschen, bleibt der Gastzustand
  // stehen und der nächste Start versucht es erneut.
  useEffect(() => {
    if (cleaned.current) return;
    cleaned.current = true;
    if (decideGuestCleanup(readGuestMode(), now()) !== "end") return;
    void clearStudentData()
      .then((result) => {
        if (result.complete) leave("reload");
      })
      .catch(() => {});
  }, [leave, now]);

  if (!guest) return null;
  return (
    <>
      <div className="ui ui-guest-band" role="region" aria-label="Gastmodus">
        <span className="ui-guest-band__label">Gastmodus</span>
        <button
          type="button"
          className="ui-guest-band__end"
          onClick={() => setConfirming(true)}
        >
          Gastmodus beenden
        </button>
      </div>
      <Sheet
        open={confirming}
        title="Gastmodus beenden?"
        onClose={() => {
          if (!busy) setConfirming(false);
        }}
      >
        <p className="ui-small">
          Alles, was auf diesem Gerät gespeichert ist, wird jetzt gelöscht:
          Lernstand, Klasse und Einstellungen. Das lässt sich nicht rückgängig
          machen.
        </p>
        {failed ? (
          <Notice tone="bad" role="alert">
            Es konnte nicht alles gelöscht werden. Bitte versuche es noch
            einmal.
          </Notice>
        ) : null}
        <div className="ui-grid2">
          <Button
            variant="bad"
            disabled={busy}
            onClick={() => void clear("start")}
          >
            {busy ? "Wird gelöscht …" : "Ja, alles löschen"}
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => setConfirming(false)}
          >
            Abbrechen
          </Button>
        </div>
      </Sheet>
    </>
  );
}
