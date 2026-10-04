"use client";

import { useEffect } from "react";

/**
 * Registriert den Service Worker auf jeder Seite, auch auf der Startseite
 * (`start_url` der installierten App). Update-Anzeige: `VersionButton`.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .catch(() => {});
  }, []);
  return null;
}
