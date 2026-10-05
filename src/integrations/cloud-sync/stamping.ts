/**
 * Änderungen erkennen, ohne die Repositorys zu ändern: Die Datensätze werden
 * bei jeder Runde mit den Stempeln des letzten Abgleichs verglichen. Ein
 * anderer Hash heißt „geändert“, ein fehlender Datensatz mit Stempel heißt
 * „gelöscht“. Reine Funktionen; die Datenbank liegt in `storage/sync-stamps.ts`.
 */
import { contentHash } from "./hash";
import { formatHlc, type Hlc } from "./hlc";
import {
  keyOf,
  type LocalSyncRecord,
  type SyncData,
  type SyncStamp,
  type SyncSecrets,
  type SyncTable,
  type SyncTombstone,
} from "./model";
import type { MergeResult } from "./merge";

export type LocalRow = {
  table: SyncTable;
  id: string;
  /** Ohne Geheimnisse (siehe `toSyncData`). */
  data: SyncData;
  secrets?: SyncSecrets;
};

export type ReconcileInput = {
  rows: readonly LocalRow[];
  previous: readonly SyncStamp[];
  tombstones: readonly SyncTombstone[];
  device: string;
  tick: () => Hlc;
  /**
   * Zeitpunkt (ms) einer noch nie gestempelten Zeile, z. B. aus `updatedAt`.
   * So gewinnt beim ersten Abgleich nicht die Zeile, die zufällig zuerst
   * gesehen wurde, sondern die zuletzt wirklich bearbeitete.
   */
  firstSeenMs?: (row: LocalRow) => number | undefined;
};

export function reconcileLocal(input: ReconcileInput): {
  records: LocalSyncRecord[];
  tombstones: SyncTombstone[];
} {
  const previous = new Map(
    input.previous.map((record) => [keyOf(record.table, record.id), record]),
  );
  const tombstones = new Map(
    input.tombstones.map((entry) => [keyOf(entry.table, entry.id), entry]),
  );
  const seen = new Set<string>();
  const records: LocalSyncRecord[] = [];
  for (const row of input.rows) {
    const key = keyOf(row.table, row.id);
    seen.add(key);
    const hash = contentHash(row.data);
    const before = previous.get(key);
    const secrets = row.secrets ? { secrets: row.secrets } : {};
    if (before && before.hash === hash) {
      records.push({
        table: row.table,
        id: row.id,
        hlc: before.hlc,
        device: before.device,
        hash,
        data: row.data,
        ...(before.baseHash !== undefined ? { baseHash: before.baseHash } : {}),
        ...secrets,
      });
      continue;
    }
    // Geändert oder neu. Taucht ein Gelöschtes wieder auf, fällt der Grabstein.
    tombstones.delete(key);
    const origin = before ? undefined : input.firstSeenMs?.(row);
    records.push({
      table: row.table,
      id: row.id,
      hlc:
        origin === undefined
          ? input.tick()
          : formatHlc({ ms: origin, counter: 0, device: input.device }),
      device: input.device,
      hash,
      data: row.data,
      ...(before?.baseHash !== undefined ? { baseHash: before.baseHash } : {}),
      ...secrets,
    });
  }
  for (const [key, before] of previous) {
    if (seen.has(key) || before.baseHash === undefined) continue;
    // Schon einmal abgeglichen und jetzt weg: Grabstein.
    tombstones.set(key, {
      table: before.table,
      id: before.id,
      hlc: input.tick(),
      device: input.device,
    });
  }
  return { records, tombstones: [...tombstones.values()] };
}

/**
 * Stempel nach einer Runde: Was der Remote-Stand enthält, gilt als abgeglichen
 * (`baseHash = hash`). Ist der Upload nicht gelungen, bleiben lokale
 * Änderungen offen.
 */
export function markSynced(
  merged: Pick<MergeResult, "records" | "put" | "needsUpload">,
  uploaded: boolean,
): LocalSyncRecord[] {
  const taken = new Set(merged.put.map((r) => keyOf(r.table, r.id)));
  const settled = uploaded || !merged.needsUpload;
  return merged.records.map((record) => ({
    ...record,
    ...(settled || taken.has(keyOf(record.table, record.id))
      ? { baseHash: record.hash }
      : {}),
  }));
}

/** Anzahl lokaler Änderungen, die noch nicht abgeglichen sind. */
export function countPending(records: readonly LocalSyncRecord[]) {
  return records.filter((record) => record.hash !== record.baseHash).length;
}
