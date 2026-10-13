"use client";

import { useCallback, useEffect, useState } from "react";

export type InstallState = "unavailable" | "available" | "manual" | "installed";

/** Welche Anleitung zum Browser passt, wenn kein Installationsdialog existiert. */
export type InstallGuide =
  "ios-safari" | "ios-other" | "mac-safari" | "android" | "generic";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __installPrompt?: InstallPromptEvent | undefined;
  }
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  const { userAgent, platform, maxTouchPoints } = navigator;
  // iPadOS meldet sich als „MacIntel“, hat aber Touch.
  return (
    /iPhone|iPad|iPod/.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1)
  );
}

/**
 * Wählt die Anleitung für Browser ohne `beforeinstallprompt`. `null` heißt:
 * Der Browser kann keine Web-Apps installieren (Firefox am Desktop).
 */
export function detectGuide(): InstallGuide | null {
  const { userAgent } = navigator;
  if (isIos()) {
    // Chrome, Firefox, Edge und Opera auf iOS nutzen WebKit, haben aber
    // eigene Menüs; nur Safari selbst hat die Leiste mit „Teilen“ fest.
    return /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/.test(userAgent)
      ? "ios-other"
      : "ios-safari";
  }
  if (/Android/.test(userAgent)) return "android";
  if (/Firefox/.test(userAgent)) return null;
  if (/Safari/.test(userAgent) && !/Chrome|Chromium|Edg|OPR/.test(userAgent)) {
    return "mac-safari";
  }
  return "generic";
}

function detect(): { state: InstallState; guide: InstallGuide | null } {
  if (isStandalone()) return { state: "installed", guide: null };
  if (window.__installPrompt) return { state: "available", guide: null };
  const guide = detectGuide();
  return guide
    ? { state: "manual", guide }
    : { state: "unavailable", guide: null };
}

/**
 * Zustand der App-Installation. Vor der Hydration (und auf dem Server) ist er
 * „unavailable“, damit nichts springt. Das Ereignis `beforeinstallprompt`
 * fängt ein Skript im <head> früh ab.
 */
export function useInstallPrompt() {
  const [{ state, guide }, setDetected] = useState<{
    state: InstallState;
    guide: InstallGuide | null;
  }>({ state: "unavailable", guide: null });

  useEffect(() => {
    const update = () => setDetected(detect());
    update();
    window.addEventListener("lernraum-install-ready", update);
    window.addEventListener("appinstalled", () => {
      window.__installPrompt = undefined;
      setDetected({ state: "installed", guide: null });
    });
    return () => window.removeEventListener("lernraum-install-ready", update);
  }, []);

  const install = useCallback(async () => {
    const event = window.__installPrompt;
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    window.__installPrompt = undefined;
    setDetected(
      outcome === "accepted"
        ? { state: "installed", guide: null }
        : { state: "unavailable", guide: null },
    );
  }, []);

  return { state, guide, install };
}
