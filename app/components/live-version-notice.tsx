"use client";
import { useCallback, useEffect, useState } from "react";
import { LIVE_APP_VERSION } from "../../src/app-version";
import {
  compareLiveVersions,
  updateBeforeLiveRound,
} from "../../src/integrations/laufdiktat/version-compatibility";

export function LiveVersionNotice({
  required,
  code,
}: {
  required: string;
  code: string;
}) {
  const [status, setStatus] = useState("");
  const older = compareLiveVersions(LIVE_APP_VERSION, required) === -1;
  const update = useCallback(async () => {
    setStatus("Aktualisierung wird gesucht …");
    try {
      if (!(await updateBeforeLiveRound(code)))
        setStatus(
          "Noch kein Update verfügbar. Bitte erneut versuchen oder die Lehrkraft fragen.",
        );
    } catch {
      setStatus(
        "Aktualisierung nicht erreichbar. Bitte die Verbindung prüfen und erneut versuchen.",
      );
    }
  }, [code]);
  useEffect(() => {
    if (!older) return;
    const timer = window.setTimeout(() => void update(), 0);
    return () => window.clearTimeout(timer);
  }, [older, update]);
  return (
    <div className="live-room-page">
      <section className="live-room-state" aria-live="polite">
        <h1>Die App-Versionen passen noch nicht zusammen.</h1>
        <p>
          {older
            ? "Dein Gerät benötigt eine Aktualisierung, bevor die Runde starten kann."
            : "Bitte die Lehrkraft bitten, ihre App zu aktualisieren und eine neue Runde zu starten."}
        </p>
        <p>
          Dieses Gerät: {LIVE_APP_VERSION} · Unterrichtsrunde: {required}
        </p>
        {older ? (
          <button
            className="button button--primary"
            onClick={() => void update()}
          >
            Aktualisierung erneut prüfen
          </button>
        ) : null}
        {status ? <p role="status">{status}</p> : null}
        <p>
          Dein Raumcode {code} und deine Zuordnung bleiben auf diesem Gerät
          erhalten.
        </p>
      </section>
    </div>
  );
}
