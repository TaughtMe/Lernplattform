"use client";

import { useCallback, useEffect, useState } from "react";

/** Darstellung der Eingabe: Heft mit Linien (Standard) oder ruhiger Vollbildmodus. */
export type TextboxLayout = "heft" | "vollbild";

export const TEXTBOX_LAYOUT_KEY = "textbox-layout";

function load(): TextboxLayout {
  try {
    return window.localStorage.getItem(TEXTBOX_LAYOUT_KEY) === "vollbild"
      ? "vollbild"
      : "heft";
  } catch {
    return "heft";
  }
}

/** Merkt die Wahl pro Gerät; gelesen wird erst nach der Hydrierung. */
export function useTextboxLayout() {
  const [layout, setLayout] = useState<TextboxLayout>("heft");
  useEffect(() => {
    // Erst nach dem Mounten lesen, damit Server- und Browser-Ansicht übereinstimmen.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Server und Browser müssen zuerst dieselbe Vorgabe rendern; der gespeicherte Wert wird erst nach dem Mounten gelesen
    setLayout(load());
  }, []);
  const choose = useCallback((next: TextboxLayout) => {
    setLayout(next);
    try {
      window.localStorage.setItem(TEXTBOX_LAYOUT_KEY, next);
    } catch {
      // Ohne Speicher gilt die Wahl nur für diese Sitzung.
    }
  }, []);
  return [layout, choose] as const;
}
