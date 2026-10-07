"use client";

import { useCallback, useEffect, useState } from "react";

/** Einstellungen der Übungstastatur (Zahnrad oben rechts). */
export type KeyboardSettings = {
  /** Große (zweizeilige) oder kleine (einzeilige) Entertaste. */
  enterKey: "large" | "small";
  /** Nächste Taste und passenden Finger hervorheben. */
  showNext: boolean;
  /** Tasten in Fingerfarben einfärben. */
  fingerColors: boolean;
};

export const DEFAULT_KEYBOARD_SETTINGS: KeyboardSettings = {
  enterKey: "large",
  showNext: true,
  fingerColors: true,
};

const STORAGE_KEY = "tastenwelt-keyboard-settings";

function load(): KeyboardSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_KEYBOARD_SETTINGS;
    const data = JSON.parse(raw) as Partial<KeyboardSettings>;
    return {
      enterKey: data.enterKey === "small" ? "small" : "large",
      showNext: data.showNext !== false,
      fingerColors: data.fingerColors !== false,
    };
  } catch {
    return DEFAULT_KEYBOARD_SETTINGS;
  }
}

/** Lädt und speichert die Tastatureinstellungen im Browser. */
export function useKeyboardSettings() {
  const [settings, setSettings] = useState(DEFAULT_KEYBOARD_SETTINGS);
  useEffect(() => {
    // Erst nach dem Mounten lesen, damit Server- und Browser-Ansicht übereinstimmen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(load());
  }, []);
  const update = useCallback((patch: Partial<KeyboardSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ohne Speicher gilt die Einstellung nur für diese Sitzung.
      }
      return next;
    });
  }, []);
  return [settings, update] as const;
}
