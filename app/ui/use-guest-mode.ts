"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  guestModeSnapshot,
  parseGuestMode,
  subscribeGuestMode,
  type GuestModeState,
} from "../../src/storage/guest-mode";

const serverSnapshot = () => null;

/** Laufender Gastmodus dieses Geräts; auf dem Server und vor dem Laden null. */
export function useGuestMode(): GuestModeState | null {
  const raw = useSyncExternalStore(
    subscribeGuestMode,
    () => guestModeSnapshot(),
    serverSnapshot,
  );
  return useMemo(() => parseGuestMode(raw), [raw]);
}
