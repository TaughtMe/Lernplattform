"use client";

import { useEffect, useState } from "react";

export function PilotConnectionNotice({ configured }: { configured: boolean }) {
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
      <p className="pilot-status is-offline" role="status">
        Du bist offline. Bereits geladene Seiten bleiben sichtbar, aber einem
        Live-Raum kannst du erst mit Internetverbindung beitreten.
      </p>
    );
  }
  if (!configured) {
    return (
      <p className="pilot-status is-limited" role="status">
        Der Live-Raumdienst ist in dieser Umgebung noch nicht eingerichtet.
      </p>
    );
  }
  return (
    <p className="pilot-status" role="status">
      Live-Räume sind verfügbar. Raumdaten sind kurzlebig und werden automatisch
      gelöscht.
    </p>
  );
}
