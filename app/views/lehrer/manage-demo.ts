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

// ---------- 17b Freigabe an Schüler ----------

export const DEMO_PACKAGES = [
  {
    id: "a",
    title: "Englisch · Unit 3 School",
    meta: "7 Paare · geändert 14.10.",
  },
  {
    id: "b",
    title: "Englisch · Unit 2 Family",
    meta: "5 Paare · geändert 02.10.",
  },
  {
    id: "c",
    title: "Französisch · Les couleurs",
    meta: "6 Paare · geändert 19.10.",
    live: "noch 6 h",
  },
] as const;

/** „Läuft gerade“: die Freigabe von „Les couleurs“ läuft seit 18 Stunden. */
export const DEMO_LIVE = [
  {
    id: "c",
    title: "Französisch · Les couleurs",
    meta: "6 Paare · Code 4K2P …",
    left: "noch 6 h · bis 20:05",
    fraction: 0.25,
  },
] as const;

export const DEMO_ROWS = [
  { a: "school", b: "Schule", tag: "Unit 3" },
  { a: "classroom", b: "Klassenzimmer", tag: "Unit 3" },
  { a: "library", b: "Bibliothek", tag: "Unit 3" },
  { a: "teacher", b: "Lehrer", tag: "" },
  { a: "pupil", b: "Schüler", tag: "" },
  { a: "break", b: "Pause", tag: "" },
  { a: "homework", b: "Hausaufgaben", tag: "" },
] as const;

// ---------- 17c Klassen ----------

export const DEMO_CLASS_LIST = [
  { id: "7b", name: "7b", sub: "10 Schüler · 2026/27", label: "7b, 2026/27" },
  { id: "8a", name: "8a", sub: "0 Schüler · 2026/27", label: "8a, 2026/27" },
  { id: "5c", name: "5c", sub: "6 Schüler · 2026/27", label: "5c, 2026/27" },
] as const;

export const DEMO_STUDENTS = [
  "Alex",
  "Ben",
  "Clara",
  "Deniz",
  "Emma",
  "Finn",
  "Hanna",
  "Jonas",
  "Lea",
  "Mats",
].map((name) => ({ id: name, name, writingRelief: false }));

/** Bereiche der Klasse 7b: Vokabeln, Deutsch und Laufdiktat sind an. */
export const DEMO_AREAS = [
  { id: "vocabulary", label: "Vokabeln", on: true },
  { id: "german", label: "Deutsch", on: true },
  { id: "mathematics", label: "Kopfrechnen", on: false },
  { id: "typing", label: "Tipptraining", on: false },
  { id: "running-dictation", label: "Laufdiktat", on: true },
];
