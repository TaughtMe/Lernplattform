"use client";
import { useCallback, useEffect, useState } from "react";
import { LIVE_APP_VERSION } from "../../src/app-version";
import {
  compareLiveVersions,
  updateBeforeLiveRound,
} from "../../src/integrations/laufdiktat/version-compatibility";
import { Icon } from "../ui/icons";
import { Button } from "../ui/primitives";
import { RoomFrame } from "../ui/room-frame";

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
    <RoomFrame code={code} animal={null}>
      <section className="ui-card ui-room__card" aria-live="polite">
        <span className="ui-room__mark ui-room__mark--bad" aria-hidden="true">
          <Icon name="refresh" size={28} />
        </span>
        <h1 className="ui-room__title">
          Die App-Versionen passen noch nicht zusammen.
        </h1>
        <p className="ui-muted">
          {older
            ? "Dein Gerät benötigt eine Aktualisierung, bevor die Runde starten kann."
            : "Bitte die Lehrkraft bitten, ihre App zu aktualisieren und eine neue Runde zu starten."}
        </p>
        <p className="ui-small ui-muted">
          Dieses Gerät: {LIVE_APP_VERSION} · Unterrichtsrunde: {required}
        </p>
        {older ? (
          <Button block onClick={() => void update()}>
            Aktualisierung erneut prüfen
          </Button>
        ) : null}
        {status ? (
          <p className="ui-notice" role="status">
            {status}
          </p>
        ) : null}
        <p className="ui-tiny ui-muted">
          Dein Raumcode {code} und deine Zuordnung bleiben auf diesem Gerät
          erhalten.
        </p>
      </section>
    </RoomFrame>
  );
}
