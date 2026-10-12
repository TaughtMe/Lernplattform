"use client";

import { createContext, useContext, useEffect } from "react";

/**
 * Wie weit die Navigation ausgeblendet wird: gar nicht (`false`), überall
 * (`"all"`, z. B. laufende Runde) oder nur auf kleinen Bildschirmen (`"mobile"`).
 */
export type FullscreenMode = false | "all" | "mobile";

/** Schalter des Rahmens: Navigation für Vollbild-Screens ausblenden. */
export const FullscreenContext = createContext<(mode: FullscreenMode) => void>(
  () => {},
);

/** Blendet die Navigation aus, solange die Komponente sichtbar ist (z. B. laufende Runde). */
export function useFullscreenFrame(
  active = true,
  mode: "all" | "mobile" = "all",
) {
  const setFullscreen = useContext(FullscreenContext);
  useEffect(() => {
    if (!active) return;
    setFullscreen(mode);
    return () => setFullscreen(false);
  }, [active, mode, setFullscreen]);
}
