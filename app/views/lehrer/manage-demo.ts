/**
 * Beispieldaten der Verwalten-Seiten (Lehrerbereich v2, 17a–c) für Katalog
 * und Designvergleich. Werte wie in docs/design/lehrerbereich-v2.dc.html.
 */
import type {
  DeviceStats,
  ProfileValues,
  SyncDeviceItem,
  SyncProviderOption,
} from "./settings-screen";

/** Einträge unter „Verwalten“ in der Leiste. */
export const DEMO_MANAGE = [
  { id: "classes", label: "Klassen" },
  { id: "material", label: "Freigabe an Schüler" },
  { id: "assignments", label: "Aufgaben" },
  { id: "houses", label: "Häuser" },
  { id: "settings", label: "Einstellungen" },
] as const;

// ---------- 17a Einstellungen ----------

/**
 * Die Vorlage zeigt die Profilfelder leer mit Platzhaltern (ihre
 * `defaultValue` greifen im Canvas nicht); das Referenzbild ebenso.
 */
export const DEMO_PROFILE: ProfileValues = {
  displayName: "",
  school: "",
  email: "",
  subjects: "",
  lernboxTag: "",
};

export const DEMO_PROVIDERS: readonly SyncProviderOption[] = [
  { id: "onedrive", name: "OneDrive", sub: "Aktiv", emphasized: true },
  {
    id: "google-drive",
    name: "Google Drive",
    sub: "Nicht verbunden",
    disabled: true,
  },
  { id: "webdav", name: "WebDAV", sub: "Eigener Server", disabled: true },
];

export const DEMO_SYNC_STAND = "Stand 16 · zuletzt von „X8“ vor 12 Tagen";

export const DEMO_DEVICES: readonly SyncDeviceItem[] = [
  {
    id: "desktop",
    name: "DerDesktop",
    current: true,
    meta: "Stand 13 · vor 12 Tagen",
  },
  { id: "x8", name: "X8", current: false, meta: "Stand 16 · vor 12 Tagen" },
];

export const DEMO_SCOPE = [
  "Material",
  "Aufgaben",
  "Klassen und Einstellungen",
  "Schülerliste",
  "Ergebnisse",
] as const;

export const DEMO_STATS: DeviceStats = {
  classes: 3,
  students: 16,
  materials: 18,
  assignments: 4,
};
