"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Kleines Popup in der Ecke, sobald eine neue Version bereitsteht. „Später“
 * blendet es bis zum nächsten Seitenaufruf aus; die manuelle Suche bleibt im
 * `VersionButton` im Seitenfuß.
 */
export function UpdateToast() {
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const reloading = useRef(false);
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;
    let stopWatching = () => {};

    const handleControllerChange = () => {
      if (!reloading.current) return;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    void navigator.serviceWorker.ready
      .then((next) => {
        if (cancelled) return;
        registration.current = next;
        if (next.waiting) setReady(true);
        const handleUpdateFound = () => {
          const installing = next.installing;
          installing?.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setReady(true);
            }
          });
        };
        next.addEventListener("updatefound", handleUpdateFound);
        stopWatching = () =>
          next.removeEventListener("updatefound", handleUpdateFound);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      stopWatching();
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, []);

  if (!ready || dismissed) return null;

  function update() {
    reloading.current = true;
    setApplying(true);
    registration.current?.waiting?.postMessage({ type: "SKIP_WAITING" });
  }

  return (
    <div className="ui ui-update-toast" role="status" aria-live="polite">
      <p className="ui-update-toast__text">
        <strong>Neue Version verfügbar</strong>
        <span>Jetzt aktualisieren oder später.</span>
      </p>
      <div className="ui-update-toast__actions">
        <button
          type="button"
          className="ui-update-toast__later"
          onClick={() => setDismissed(true)}
          disabled={applying}
        >
          Später
        </button>
        <button
          type="button"
          className="ui-update-toast__update"
          onClick={update}
          disabled={applying}
        >
          {applying ? "Lädt …" : "Aktualisieren"}
        </button>
      </div>
    </div>
  );
}
