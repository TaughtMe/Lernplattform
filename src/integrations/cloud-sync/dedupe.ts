/**
 * Doppelungen nach dem Zusammenführen: derselbe Inhalt unter zwei IDs, etwa
 * dieselbe Klasse auf beiden Geräten vor dem ersten Abgleich angelegt.
 * Identischer Inhalt wird automatisch zusammengelegt (die ältere ID bleibt,
 * Verweise werden umgeschrieben); abweichender Inhalt wird als Vorschlag
 * gemeldet. Reine Funktion, deterministisch: Beide Geräte entscheiden gleich.
 */
import { contentHash } from "./hash";
import type { Hlc } from "./hlc";
import { conflictId, recordLabel } from "./merge";
import {
  keyOf,
  type SyncConflict,
  type SyncData,
  type SyncRecord,
  type SyncTable,
  type SyncTombstone,
} from "./model";

export type DedupeInput = {
  records: readonly SyncRecord[];
  tombstones: readonly SyncTombstone[];
  resolved: readonly string[];
  device: string;
  tick: () => Hlc;
  now: string;
};

export type DedupeResult = {
  records: SyncRecord[];
  tombstones: SyncTombstone[];
  conflicts: SyncConflict[];
  /** Zusammengelegte Datensätze: gelöschte ID → bleibende ID. */
  merged: Array<{ table: SyncTable; dropped: string; kept: string }>;
};

const normalize = (value: unknown) =>
  typeof value === "string"
    ? value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase()
    : "";

const str = (data: SyncData, field: string) => data[field];

/** Inhalt ohne Kennung und Zeitstempel. */
function bareContent(
  record: SyncRecord,
  ignore: readonly string[],
  textFields: readonly string[] = [],
) {
  const data: SyncData = { ...record.data };
  for (const field of textFields) data[field] = normalize(data[field]);
  for (const field of ["id", "createdAt", "updatedAt", ...ignore]) {
    delete data[field];
  }
  return contentHash(data);
}

function age(record: SyncRecord) {
  const created = str(record.data, "createdAt");
  return `${typeof created === "string" ? created : ""}|${record.id}`;
}

function byAge(left: SyncRecord, right: SyncRecord) {
  const a = age(left);
  const b = age(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

type Group = { key: string; members: SyncRecord[] };

function groupBy(
  records: readonly SyncRecord[],
  table: SyncTable,
  keyOfRecord: (record: SyncRecord) => string | undefined,
): Group[] {
  const groups = new Map<string, SyncRecord[]>();
  for (const record of records) {
    if (record.table !== table) continue;
    const key = keyOfRecord(record);
    if (key === undefined) continue;
    const list = groups.get(key) ?? [];
    list.push(record);
    groups.set(key, list);
  }
  return [...groups]
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({ key, members: list.sort(byAge) }));
}

/** Verweise eines Datensatzes auf eine gelöschte ID umschreiben. */
function rewriteReferences(
  record: SyncRecord,
  table: SyncTable,
  dropped: string,
  kept: string,
): SyncData | undefined {
  const data: SyncData = { ...record.data };
  let changed = false;
  const swap = (field: string) => {
    const value = data[field];
    if (value === dropped) {
      data[field] = kept;
      changed = true;
    } else if (Array.isArray(value) && value.includes(dropped)) {
      data[field] = [
        ...new Set(value.map((entry) => (entry === dropped ? kept : entry))),
      ];
      changed = true;
    }
  };
  if (table === "classes") {
    if (record.table === "contentPackages" || record.table === "assignments") {
      swap("classIds");
    }
    if (record.table === "members" || record.table === "submissions") {
      swap("classId");
    }
    if (record.table === "profiles") swap("lastLiveClassId");
  }
  if (table === "contentPackages" && record.table === "assignments") {
    swap("materialId");
  }
  return changed ? data : undefined;
}

export function dedupe(input: DedupeInput): DedupeResult {
  let records = [...input.records];
  const tombstones = [...input.tombstones];
  const conflicts: SyncConflict[] = [];
  const merged: DedupeResult["merged"] = [];
  const known = new Set(input.resolved);

  const suggest = (first: SyncRecord, second: SyncRecord) => {
    const id = conflictId(
      "duplicate",
      keyOf(first.table, first.id),
      keyOf(second.table, second.id),
    );
    if (known.has(id)) return;
    conflicts.push({
      id,
      kind: "duplicate",
      table: first.table,
      recordId: first.id,
      otherRecordId: second.id,
      label: recordLabel(first),
      kept: { hlc: first.hlc, device: first.device, data: first.data },
      other: { hlc: second.hlc, device: second.device, data: second.data },
      detectedAt: input.now,
      status: "open",
    });
  };

  const collapse = (table: SyncTable, keep: SyncRecord, drop: SyncRecord) => {
    merged.push({ table, dropped: drop.id, kept: keep.id });
    tombstones.push({
      table,
      id: drop.id,
      hlc: input.tick(),
      device: input.device,
    });
    records = records
      .filter((record) => !(record.table === table && record.id === drop.id))
      .map((record) => {
        const data = rewriteReferences(record, table, drop.id, keep.id);
        return data
          ? {
              ...record,
              data,
              hash: contentHash(data),
              hlc: input.tick(),
              device: input.device,
            }
          : record;
      });
  };

  // Klassen: gleicher Name (normalisiert) und Schuljahr.
  for (const group of groupBy(records, "classes", (record) => {
    const name = normalize(str(record.data, "name"));
    return name
      ? `${name}|${normalize(str(record.data, "schoolYear"))}`
      : undefined;
  })) {
    const [keep, ...others] = group.members as [SyncRecord, ...SyncRecord[]];
    for (const other of others) {
      const same =
        bareContent(keep, [], ["name"]) === bareContent(other, [], ["name"]);
      if (same) collapse("classes", keep, other);
      else suggest(keep, other);
    }
  }

  // Material: gleicher Titel; identisch, wenn auch Inhalt, Art und Sprachen passen.
  for (const group of groupBy(records, "contentPackages", (record) => {
    const title = normalize(str(record.data, "title"));
    return title || undefined;
  })) {
    const [keep, ...others] = group.members as [SyncRecord, ...SyncRecord[]];
    // Zuordnung, Revision und letzte Nutzung unterscheiden Fassungen nicht.
    const ignore = ["classIds", "revision", "lastUsedAt"];
    for (const other of others) {
      if (
        bareContent(keep, ignore, ["title"]) ===
        bareContent(other, ignore, ["title"])
      ) {
        collapse("contentPackages", keep, other);
      } else {
        suggest(keep, other);
      }
    }
  }

  // Kinder: gleiche Klasse und gleicher Anzeigename. Die Einschreibe-Schlüssel
  // unterscheiden sich meist; deshalb nie automatisch.
  for (const group of groupBy(records, "members", (record) => {
    const name = normalize(str(record.data, "displayName"));
    const classId = str(record.data, "classId");
    return name && typeof classId === "string"
      ? `${classId}|${name}`
      : undefined;
  })) {
    const [keep, ...others] = group.members as [SyncRecord, ...SyncRecord[]];
    for (const other of others) suggest(keep, other);
  }

  return { records, tombstones, conflicts, merged };
}
