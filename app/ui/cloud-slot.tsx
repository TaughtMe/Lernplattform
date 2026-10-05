"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Platz fürs Cloud-Symbol in Köpfen, die der Lehrerrahmen nicht selbst
 * zeichnet (Vollfläche des Live-Raums). Der Rahmen füllt ihn, die Ansicht
 * setzt `<CloudSlot />` neben den Hell/Dunkel-Schalter.
 */
const CloudSlotContext = createContext<ReactNode>(null);

export const CloudSlotProvider = CloudSlotContext.Provider;

export function CloudSlot() {
  return <>{useContext(CloudSlotContext)}</>;
}
