"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  isMirrorReadingActive,
  mirrorReadingUntil,
} from "../../src/domain/mirror-reading";
import { useAreaVisible } from "../release/release-context";

/** Nur auf diesem Gerät; nie in Cloud-Abgleich, Sicherung oder Lehrkraftansicht. */
const STORAGE_KEY = "lernraum-spiegelschrift-bis";
const CHANGE_EVENT = "lernraum-spiegelschrift-change";

function removeStored() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Speicher gesperrt: dann bleibt die Spiegelschrift aus.
  }
}

/** Gespeicherter Ablauf; abgelaufene oder kaputte Werte werden entfernt. */
function readUntil(): string | null {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (stored === null) return null;
  if (!isMirrorReadingActive(stored, new Date())) {
    removeStored();
    return null;
  }
  return stored;
}

function notify() {
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

// setTimeout verträgt höchstens 2^31 - 1 ms; 7 Tage liegen weit darunter.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * Spiegelschrift im Lesetext der Textbox (Einprägen), vom Kind selbst
 * geschaltet, 7 Tage gültig. Ohne Freigabe immer aus.
 */
export function useMirrorReading() {
  const visible = useAreaVisible("spiegelschrift");
  const stored = useSyncExternalStore(subscribe, readUntil, () => null);
  const until = visible ? stored : null;

  useEffect(() => {
    if (!until) return;
    const wait = Math.min(
      Math.max(0, Date.parse(until) - Date.now()),
      MAX_TIMEOUT_MS,
    );
    // Beim Ablauf Wert entfernen und Abonnenten benachrichtigen, damit eine
    // offene Seite ohne Neuladen wieder normal erscheint.
    const timer = window.setTimeout(() => {
      readUntil();
      notify();
    }, wait + 50);
    return () => window.clearTimeout(timer);
  }, [until]);

  const turnOn = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mirrorReadingUntil(new Date()));
    } catch {
      return;
    }
    notify();
  }, []);

  const turnOff = useCallback(() => {
    removeStored();
    notify();
  }, []);

  return { active: until !== null, until, turnOn, turnOff };
}
