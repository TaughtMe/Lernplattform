"use client";

import { useEffect, useState } from "react";

/** Hinweis zur Verfügbarkeit des Live-Raumdienstes auf der Startseite. */
export function ConnectionNotice({ configured }: { configured: boolean }) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!online) {
    return (
      <p className="ui-notice ui-notice--bad ui-small" role="status">
        Du bist offline. Bereits geladene Seiten bleiben sichtbar, aber einem
        Live-Raum kannst du erst mit Internetverbindung beitreten.
      </p>
    );
  }
  if (!configured) {
    return (
      <p className="ui-notice ui-small" role="status">
        Der Live-Raumdienst ist in dieser Umgebung noch nicht eingerichtet.
      </p>
    );
  }
  return (
    <p className="ui-small ui-muted ui-center" role="status">
      Live-Räume sind verfügbar. Raumdaten sind kurzlebig und werden automatisch
      gelöscht.
    </p>
  );
}
