"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Nur auf diesem Gerät; „0“ = Sterne aus. Ohne Eintrag gilt wie bisher: an. */
export const LAUFDIKTAT_STARS_KEY = "lernraum-laufdiktat-sterne";
const CHANGE_EVENT = "lernraum-laufdiktat-sterne-change";

/** Gemerkter Wert; bei gesperrtem Speicher oder ohne Eintrag: Sterne an. */
export function readStarsPreference(): boolean {
  try {
    return window.localStorage.getItem(LAUFDIKTAT_STARS_KEY) !== "0";
  } catch {
    return true;
  }
}

function writeStarsPreference(show: boolean) {
  try {
    if (show) window.localStorage.removeItem(LAUFDIKTAT_STARS_KEY);
    else window.localStorage.setItem(LAUFDIKTAT_STARS_KEY, "0");
  } catch {
    // Ohne Speicher gilt die Wahl nur, bis die Seite neu lädt.
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
 * „Sterne am Ende zeigen“ im Laufdiktat allein (Befund D-012). Die Sterne
 * bleiben Standard; wer sie nicht möchte, schaltet sie hier ab. Der
 * Server-Stand ist „an“, damit Server und Browser zuerst dasselbe zeigen.
 */
export function useLaufdiktatStars() {
  const show = useSyncExternalStore(subscribe, readStarsPreference, () => true);
  const setShow = useCallback(
    (next: boolean) => writeStarsPreference(next),
    [],
  );
  return [show, setShow] as const;
}
