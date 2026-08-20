"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Reports `false` during SSR and during the client's hydration pass so the
 * two match, then flips to `true` on the next client render once hydration
 * is safely done — the React-recommended way to gate browser-only state
 * without a setState-in-effect hydration mismatch.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
