/**
 * Datenmodell des Geräte-Abgleichs: ein Datensatz mit Änderungsmarke und Hash,
 * dazu Grabsteine für Gelöschtes und Konflikte. Die fachlichen Schemata
 * bleiben unverändert; alles Abgleich-Eigene liegt daneben.
 */
import type { ClassSeal } from "../../domain/class-seal";
import type { Hlc } from "./hlc";

export const SYNC_TABLES = [
  "profiles",
  "classes",
  "members",
  "classSettings",
  "contentPackages",
  "assignments",
  "submissions",
] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

/** Was die Lehrkraft abgleichen lässt (Abschnitt 4.1 des Plans). */
export const SYNC_AREAS = [
  "material",
  "assignments",
  "classes",
  "students",
  "results",
  "keys",
] as const;
export type SyncArea = (typeof SYNC_AREAS)[number];

export type SyncScope = Record<SyncArea, boolean>;

/** Voreinstellung: nichts mit Personenbezug oder Geheimnis. */
export const DEFAULT_SYNC_SCOPE: SyncScope = {
  material: true,
  assignments: true,
  classes: true,
  students: false,
  results: false,
  keys: false,
};

const TABLES_BY_AREA: Record<
  Exclude<SyncArea, "keys">,
  readonly SyncTable[]
> = {
  material: ["contentPackages"],
  assignments: ["assignments"],
  classes: ["classes", "classSettings", "profiles"],
  students: ["members"],
  results: ["submissions"],
};

export function tablesInScope(scope: SyncScope): ReadonlySet<SyncTable> {
  const tables = new Set<SyncTable>();
  for (const [area, list] of Object.entries(TABLES_BY_AREA)) {
    if (scope[area as keyof typeof TABLES_BY_AREA]) {
      for (const table of list) tables.add(table);
    }
  }
  return tables;
}

/** Platzhalter für den Einschreibe-Schlüssel, solange „Schlüssel“ aus ist. */
export const NO_ENROLLMENT_KEY = "0".repeat(32);

export function hasEnrollmentKey(member: { enrollmentToken: string }) {
  return member.enrollmentToken !== NO_ENROLLMENT_KEY;
}

export type SyncSecrets = {
  seal?: ClassSeal | undefined;
  enrollmentToken?: string | undefined;
};

export type SyncData = Record<string, unknown>;

export type SyncRecord = {
  table: SyncTable;
  id: string;
  hlc: Hlc;
  device: string;
  /** SHA-256 des Datensatzes ohne Geheimnisse. */
  hash: string;
  data: SyncData;
  secrets?: SyncSecrets | undefined;
};

/** Lokaler Datensatz; `baseHash` ist der Stand beim letzten Abgleich. */
export type LocalSyncRecord = SyncRecord & { baseHash?: string };

/** Was die Datenbank zu einem Datensatz merkt (ohne Inhalt). */
export type SyncStamp = Omit<LocalSyncRecord, "data" | "secrets">;

export type SyncTombstone = {
  table: SyncTable;
  id: string;
  hlc: Hlc;
  device: string;
};

export type SyncVersion = { hlc: Hlc; device: string; data: SyncData };

export type SyncConflictKind =
  /** Beide Geräte haben denselben Datensatz verschieden geändert. */
  | "changed"
  /** Gelöscht auf einem, später geändert auf dem anderen Gerät. */
  | "deleted"
  /** Gleicher Inhalt zweimal angelegt (verschiedene IDs). */
  | "duplicate"
  /** Ein anderer Klassenstempel hat sich durchgesetzt. */
  | "seal";

export type SyncConflict = {
  id: string;
  kind: SyncConflictKind;
  table: SyncTable;
  recordId: string;
  /** Zweiter Datensatz bei Doppelungen. */
  otherRecordId?: string;
  label: string;
  /** Vorläufig gültige Fassung; `null`, wenn gelöscht. */
  kept: SyncVersion | null;
  /** Unterlegene Fassung; `null`, wenn es keine gibt. */
  other: SyncVersion | null;
  /** Betroffene Kinder (nur Klassenstempel). */
  affectedMemberIds?: string[];
  detectedAt: string;
  status: "open" | "resolved";
  resolvedAt?: string;
};

export const keyOf = (table: SyncTable, id: string) => `${table}:${id}`;

export function splitKey(key: string): { table: SyncTable; id: string } {
  const index = key.indexOf(":");
  return {
    table: key.slice(0, index) as SyncTable,
    id: key.slice(index + 1),
  };
}
