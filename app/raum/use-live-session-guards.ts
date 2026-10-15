"use client";

import { useEffect } from "react";

export function useLiveSessionGuards(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const warnBeforeExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeExit);
    return () => window.removeEventListener("beforeunload", warnBeforeExit);
  }, [active]);

  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let released = false;
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      if (released || document.visibilityState !== "visible") return;
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        // Nicht jedes Schulgerät erlaubt Wake Lock; das Spiel bleibt bedienbar.
      }
    };
    const onVisibility = () => void acquire();
    void acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void lock?.release();
    };
  }, [active]);
}
