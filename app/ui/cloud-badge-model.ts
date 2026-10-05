/**
 * Anzeige des Geräte-Abgleichs: Zustand → Symbol, Text und Ansage. Reine
 * Funktionen, damit Symbol, Statusmenü und Tests dieselben Texte nutzen.
 */
import type { IconName } from "./icons";

export type CloudBadgeStatus =
  | "idle"
  | "syncing"
  | "pending"
  | "offline"
  | "conflict"
  | "locked"
  | "reauth"
  | "error";

export type CloudBadgeDevice = {
  id: string;
  name: string;
  revision: number;
  seenAt: string;
  current: boolean;
};

export type CloudBadgeModel = {
  status: CloudBadgeStatus;
  /** Zähler „Stand“ der Cloud-Datei. */
  revision: number;
  lastSyncedAt: string | null;
  /** Zuletzt schreibendes Gerät. */
  writer: { name: string; at: string } | null;
  /** Lokale Änderungen, die noch warten. */
  pending: number;
  conflicts: number;
  error: string | null;
  /** Anzeigename des Anbieters, z. B. „OneDrive“. */
  providerLabel: string;
  deviceName: string;
  devices: readonly CloudBadgeDevice[];
  encrypted: boolean;
};

const ICONS: Record<CloudBadgeStatus, IconName> = {
  idle: "cloud-check",
  syncing: "cloud-sync",
  pending: "cloud-dot",
  offline: "cloud-off",
  conflict: "cloud-alert",
  locked: "cloud-lock",
  reauth: "cloud-key",
  error: "cloud-x",
};

export const cloudBadgeIcon = (status: CloudBadgeStatus): IconName =>
  ICONS[status];

/** Kurz und ohne Rundung auf Minuten für die ersten Sekunden: „vor 5 s“. */
export function formatAgo(from: string | null, now: number): string {
  if (!from) return "noch nie";
  const seconds = Math.max(0, Math.round((now - Date.parse(from)) / 1000));
  if (Number.isNaN(seconds)) return "noch nie";
  if (seconds < 5) return "gerade eben";
  if (seconds < 60) return `vor ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `vor ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} h`;
  return `vor ${Math.round(hours / 24)} d`;
}

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/** Text für Tooltip und Screenreader. */
export function cloudBadgeText(model: CloudBadgeModel, now: number): string {
  switch (model.status) {
    case "idle":
      return `Abgeglichen · Stand ${model.revision} · ${formatAgo(model.lastSyncedAt, now)}`;
    case "syncing":
      return "Wird abgeglichen …";
    case "pending":
      return model.pending === 1
        ? "1 Änderung wartet"
        : `${model.pending} Änderungen warten`;
    case "offline":
      return "Offline · Änderungen werden später gesendet";
    case "conflict":
      return `${plural(model.conflicts, "Konflikt", "Konflikte")} zu prüfen`;
    case "locked":
      return "Passwort nötig";
    case "reauth":
      return `Bei ${model.providerLabel} neu anmelden`;
    case "error":
      return model.error?.trim() || "Der Abgleich ist fehlgeschlagen.";
  }
}

/**
 * Was die Statusregion ansagt: nur Fehler, Konflikt, gesperrt, Anmeldung und
 * die Erholung davon, nicht jede Runde.
 */
export function cloudBadgeAnnouncement(
  previous: CloudBadgeStatus | null,
  model: CloudBadgeModel,
  now: number,
): string | null {
  if (previous === model.status) return null;
  const attention: ReadonlySet<CloudBadgeStatus> = new Set([
    "error",
    "conflict",
    "locked",
    "reauth",
  ]);
  if (attention.has(model.status)) {
    return `Cloud-Abgleich: ${cloudBadgeText(model, now)}`;
  }
  if (previous && attention.has(previous) && model.status === "idle") {
    return "Cloud-Abgleich wieder in Ordnung.";
  }
  return null;
}

/** Zustand fürs Symbol: Wartende Änderungen zeigen sich auch bei „bereit“. */
export function effectiveStatus(
  status: CloudBadgeStatus,
  pending: number,
): CloudBadgeStatus {
  return status === "idle" && pending > 0 ? "pending" : status;
}
