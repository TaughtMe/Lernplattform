"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { LocalDataArea } from "@/src/storage/local-data-boundaries";
import { readValue, subscribe, writeValue } from "@/src/storage/local-store";
import { ensureSeed } from "@/src/storage/personal";

/** Liest einen lokal gespeicherten Wert und rendert bei Änderungen neu (auch aus anderen Tabs). */
export function useStored<T>(area: LocalDataArea, key: string, fallback: T): [T, (value: T | ((prev: T) => T)) => void] {
  const fallbackRef = useRef(fallback);
  const value = useSyncExternalStore(
    useCallback((listener) => subscribe(area, key, listener), [area, key]),
    () => readValue(area, key, fallbackRef.current),
    () => fallbackRef.current,
  );
  const set = useCallback((next: T | ((prev: T) => T)) => writeValue(area, key, next, fallbackRef.current), [area, key]);
  return [value, set];
}

/** Legt beim ersten Besuch Profil und Beispielinhalte an. */
export function useSeed(): void {
  useEffect(() => { ensureSeed(); }, []);
}

/** true nach dem ersten Client-Render – für Inhalte, die nur lokal existieren. */
export function useHydrated(): boolean {
  return useSyncExternalStore(() => () => {}, () => true, () => false);
}
