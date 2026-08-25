"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { APP_VERSION } from "../../src/app-version";

type UpdateState = "idle" | "checking" | "current" | "ready" | "error";

const UPDATE_INTERVAL_MS = 5 * 60 * 1000;

export function ServiceWorkerManager() {
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const reloading = useRef(false);
  const [state, setState] = useState<UpdateState>("idle");

  const markReady = useCallback(() => setState("ready"), []);

  const watchRegistration = useCallback(
    (nextRegistration: ServiceWorkerRegistration) => {
      registration.current = nextRegistration;
      if (nextRegistration.waiting) markReady();

      const handleUpdateFound = () => {
        const installing = nextRegistration.installing;
        installing?.addEventListener("statechange", () => {
          if (
            installing.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            markReady();
          }
        });
      };
      nextRegistration.addEventListener("updatefound", handleUpdateFound);
      return () =>
        nextRegistration.removeEventListener("updatefound", handleUpdateFound);
    },
    [markReady],
  );

  const checkForUpdate = useCallback(async (showFeedback = false) => {
    const currentRegistration = registration.current;
    if (!currentRegistration) return;
    if (currentRegistration.waiting) {
      setState("ready");
      return;
    }

    if (showFeedback) setState("checking");
    try {
      await currentRegistration.update();
      if (currentRegistration.waiting) {
        setState("ready");
      } else if (showFeedback) {
        setState("current");
        window.setTimeout(
          () => setState((value) => (value === "current" ? "idle" : value)),
          2000,
        );
      }
    } catch {
      if (showFeedback) setState("error");
    }
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;
    let stopWatchingRegistration = () => {};

    const handleControllerChange = () => {
      if (reloading.current) return;
      reloading.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((nextRegistration) => {
        if (cancelled) return;
        stopWatchingRegistration = watchRegistration(nextRegistration);
        void nextRegistration.update();
      })
      .catch(() => setState("error"));

    const interval = window.setInterval(
      () => void checkForUpdate(false),
      UPDATE_INTERVAL_MS,
    );
    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") void checkForUpdate(false);
    };
    const checkWhenOnline = () => void checkForUpdate(false);
    document.addEventListener("visibilitychange", checkWhenVisible);
    window.addEventListener("online", checkWhenOnline);

    return () => {
      cancelled = true;
      stopWatchingRegistration();
      window.clearInterval(interval);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
      document.removeEventListener("visibilitychange", checkWhenVisible);
      window.removeEventListener("online", checkWhenOnline);
    };
  }, [checkForUpdate, watchRegistration]);

  function handleClick() {
    if (state === "ready") {
      registration.current?.waiting?.postMessage({ type: "SKIP_WAITING" });
      return;
    }
    void checkForUpdate(true);
  }

  const label =
    state === "ready"
      ? "Update laden"
      : state === "checking"
        ? "Suche …"
        : state === "current"
          ? "Aktuell ✓"
          : state === "error"
            ? `v${APP_VERSION} · offline`
            : `v${APP_VERSION}`;

  return (
    <button
      type="button"
      className={`version-button${state === "ready" ? " is-update-ready" : ""}`}
      onClick={handleClick}
      title={
        state === "ready"
          ? "Neue Version verfügbar – klicken zum Aktualisieren"
          : "Nach einer neuen Version suchen"
      }
      aria-live="polite"
    >
      {state === "ready" ? <span aria-hidden="true">●</span> : null}
      {label}
    </button>
  );
}
