"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Nur auf diesem Gerät: Ob die Lehrkraft die Liveansicht gerade projiziert. */
export const PROJECTION_MODE_KEY = "lernraum:lehrer:projektion";
const CHANGE_EVENT = "lernraum-projektion-change";

/** Gemerkter Zustand; ohne Eintrag oder bei gesperrtem Speicher: aus. */
export function readProjectionMode(): boolean {
  try {
    return window.localStorage.getItem(PROJECTION_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeProjectionMode(active: boolean) {
  try {
    if (active) window.localStorage.setItem(PROJECTION_MODE_KEY, "1");
    else window.localStorage.removeItem(PROJECTION_MODE_KEY);
  } catch {
    // Ohne Speicher gilt der Schalter nur, bis die Seite neu lädt.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/**
 * Projektionsmodus „Für die Tafel“ der Lehrer-Liveansicht, je Gerät gemerkt,
 * Standard aus. Der Server-Stand ist immer „aus“, damit Server und Browser
 * zuerst dasselbe zeigen.
 */
export function useProjectionMode() {
  const active = useSyncExternalStore(
    subscribe,
    readProjectionMode,
    () => false,
  );
  const setActive = useCallback(
    (next: boolean) => writeProjectionMode(next),
    [],
  );
  return [active, setActive] as const;
}
