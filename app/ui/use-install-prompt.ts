"use client";

import { useCallback, useEffect, useState } from "react";

export type InstallState = "unavailable" | "available" | "ios" | "installed";

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

function detect(): InstallState {
  if (isStandalone()) return "installed";
  if (window.__installPrompt) return "available";
  if (isIos()) return "ios";
  return "unavailable";
}

/**
 * Zustand der App-Installation. Vor der Hydration (und auf dem Server) ist er
 * „unavailable“, damit nichts springt. Das Ereignis `beforeinstallprompt`
 * fängt ein Skript im <head> früh ab.
 */
export function useInstallPrompt() {
  const [state, setState] = useState<InstallState>("unavailable");

  useEffect(() => {
    const update = () => setState(detect());
    update();
    window.addEventListener("lernraum-install-ready", update);
    window.addEventListener("appinstalled", () => {
      window.__installPrompt = undefined;
      setState("installed");
    });
    return () => window.removeEventListener("lernraum-install-ready", update);
  }, []);

  const install = useCallback(async () => {
    const event = window.__installPrompt;
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    window.__installPrompt = undefined;
    setState(outcome === "accepted" ? "installed" : "unavailable");
  }, []);

  return { state, install };
}
