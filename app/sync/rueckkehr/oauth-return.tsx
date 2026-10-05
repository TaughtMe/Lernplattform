"use client";

import { useEffect, useRef, useState } from "react";
import { completeConnect } from "../../../src/integrations/cloud-sync/session";
import { CloudSyncError } from "../../../src/integrations/cloud-sync/types";

/** Rückleitungsseite der Cloud-Anmeldung: Token tauschen, dann zurück. */
export function OAuthReturn() {
  const [message, setMessage] = useState("Anmeldung wird abgeschlossen …");
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    completeConnect(window.location.search)
      .then(({ returnTo }) => window.location.replace(returnTo))
      .catch((error: unknown) => {
        setFailed(true);
        setMessage(
          error instanceof CloudSyncError
            ? error.message
            : "Die Anmeldung ist fehlgeschlagen.",
        );
      });
  }, []);

  return (
    <div className="ui-page">
      <p className="ui-notice" role={failed ? "alert" : "status"}>
        {message}
      </p>
      {failed ? (
        <a href="/lehrer/einstellungen">Zurück zu den Einstellungen</a>
      ) : null}
    </div>
  );
}
