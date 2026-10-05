"use client";

import { useMemo } from "react";
import type { SyncSnapshot } from "../../src/integrations/cloud-sync/controller";
import { CloudBadge } from "../ui/cloud-badge";
import {
  effectiveStatus,
  type CloudBadgeModel,
  type CloudBadgeStatus,
} from "../ui/cloud-badge-model";
import { useSyncSnapshot } from "./cloud-sync-client";

const PROVIDER_LABELS = {
  webdav: "WebDAV",
  onedrive: "OneDrive",
  "google-drive": "Google Drive",
} as const;

/** Zustand des Controllers → Anzeige des Cloud-Symbols. */
export function toBadgeModel(snapshot: SyncSnapshot): CloudBadgeModel {
  const status: CloudBadgeStatus =
    snapshot.status === "off" ? "idle" : snapshot.status;
  return {
    status: effectiveStatus(status, snapshot.pending),
    revision: snapshot.revision,
    lastSyncedAt: snapshot.lastSyncedAt,
    writer: snapshot.lastWriter,
    pending: snapshot.pending,
    conflicts: snapshot.openConflicts,
    error: snapshot.error,
    providerLabel: snapshot.provider
      ? PROVIDER_LABELS[snapshot.provider]
      : "Cloud",
    deviceName: snapshot.deviceName,
    devices: snapshot.devices.map((device) => ({
      ...device,
      current: device.id === snapshot.deviceId,
    })),
    encrypted: snapshot.encrypted,
  };
}

/**
 * Cloud-Symbol mit Anbindung an den Abgleich. Ohne aktiven Abgleich erscheint
 * nichts. Wird als Platzhalter in den Kopf des Lehrerrahmens gesetzt.
 */
export function CloudBadgeConnected() {
  const { snapshot, controller } = useSyncSnapshot();
  const model = useMemo(
    () => (snapshot?.enabled ? toBadgeModel(snapshot) : null),
    [snapshot],
  );
  if (!model || !controller) return null;
  return (
    <CloudBadge
      model={model}
      actions={{
        onSyncNow: () => void controller.syncNow(),
        onOpenConflicts: () =>
          window.dispatchEvent(new Event("cloud-sync-open-conflicts")),
        settingsHref: "/lehrer/einstellungen#cloud-abgleich",
      }}
    />
  );
}
