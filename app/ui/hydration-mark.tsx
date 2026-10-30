"use client";

import { useEffect } from "react";
import { useHydrated } from "./use-hydrated";

/**
 * Meldet am Dokument, dass React die Seite übernommen hat: `data-app-hydrated` an
 * `<html>` (Grundlage für die Sperre in base.css und `hydration-boot.ts`) und
 * `aria-busy` am `<body>` fällt weg. Bis dahin bedienen Kinder nur das
 * serverseitig gerenderte HTML, auf dem Knöpfe nichts tun.
 */
export function HydrationMark() {
  const hydrated = useHydrated();
  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.setAttribute("data-app-hydrated", "");
    document.body.removeAttribute("aria-busy");
  }, [hydrated]);
  return null;
}
