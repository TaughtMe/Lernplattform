"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  resolveStages,
  resolveVisibility,
  type ReleaseAreaId,
  type ReleaseVisibility,
} from "../../src/domain/release";

// Ohne Provider (z. B. in Komponententests) gelten die Schulbetrieb-Standards.
const ReleaseContext = createContext<ReleaseVisibility>(
  resolveVisibility(resolveStages(undefined), false),
);

export function ReleaseProvider({
  value,
  children,
}: {
  value: ReleaseVisibility;
  children: ReactNode;
}) {
  return (
    <ReleaseContext.Provider value={value}>{children}</ReleaseContext.Provider>
  );
}

export function useRelease() {
  return useContext(ReleaseContext);
}

export function useAreaVisible(area: ReleaseAreaId) {
  return useContext(ReleaseContext)[area];
}
