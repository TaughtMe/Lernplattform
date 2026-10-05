"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { OAuthClientIds } from "../../src/integrations/cloud-sync/oauth";

const NONE: OAuthClientIds = { onedrive: null, "google-drive": null };

const CloudClientIdsContext = createContext<OAuthClientIds>(NONE);

/** Reicht die serverseitig gelesenen Client-IDs an die Sync-Oberfläche. */
export function CloudClientIdsProvider({
  value,
  children,
}: {
  value: OAuthClientIds;
  children: ReactNode;
}) {
  return (
    <CloudClientIdsContext.Provider value={value}>
      {children}
    </CloudClientIdsContext.Provider>
  );
}

export function useCloudClientIds() {
  return useContext(CloudClientIdsContext);
}
