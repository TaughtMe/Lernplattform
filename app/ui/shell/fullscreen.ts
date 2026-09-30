"use client";

import { createContext, useContext, useEffect } from "react";

/** Schalter des Rahmens: Navigation für Vollbild-Screens ausblenden. */
export const FullscreenContext = createContext<(fullscreen: boolean) => void>(
  () => {},
);

/** Blendet die Navigation aus, solange die Komponente sichtbar ist (z. B. laufende Runde). */
export function useFullscreenFrame(active = true) {
  const setFullscreen = useContext(FullscreenContext);
  useEffect(() => {
    if (!active) return;
    setFullscreen(true);
    return () => setFullscreen(false);
  }, [active, setFullscreen]);
}
