/**
 * Die Lehrer-Datenbank für den Geräte-Abgleich: Datensätze in den Abgleich
 * lesen, Stempel und Grabsteine führen, zusammengeführte Stände anwenden und
 * Konflikte aufbewahren. Die Repositorys der fachlichen Tabellen bleiben
 * unverändert; Änderungen werden beim Abgleich am Hash erkannt.
 */
import type { SyncDeviceEntry } from "../integrations/cloud-sync/envelope";
import { rewriteReferences } from "../integrations/cloud-sync/dedupe";
import { createClock, type Hlc } from "../integrations/cloud-sync/hlc";
import {
  mergeStates,
  type MergeResult,
} from "../integrations/cloud-sync/merge";
import {
  DEFAULT_SYNC_SCOPE,
  SYNC_TABLES,
  keyOf,
  tablesInScope,
  type LocalSyncRecord,
  type SyncConflict,
  type SyncData,
  type SyncScope,
  type SyncStamp,
  type SyncTable,
  type SyncTombstone,
} from "../integrations/cloud-sync/model";
import {
  markSynced,
  reconcileLocal,
  type LocalRow,
} from "../integrations/cloud-sync/stamping";
import type { CloudProviderId } from "../integrations/cloud-sync/types";
import type { TeacherWorkspaceBackup } from "../domain/teacher-workspace";
import type { TeacherClassDatabase } from "./teacher-class-settings";
import {
  SYNC_SCHEMAS,
  firstSeenMs,
  recordsFromBackup,
  rowFromRecord,
  toLocalRow,
} from "./teacher-sync-rows";

export { rowFromRecord, toLocalRow };

export type SyncStatus =
  | "off"
  | "idle"
  | "syncing"
  | "pending"
  | "offline"
  | "conflict"
  | "locked"
  | "reauth"
  | "error";

export type SyncStateRow = {
  id: "main";
  device: string;
  deviceName: string;
  enabled: boolean;
  provider: CloudProviderId | null;
  scope: SyncScope;
  encrypted: boolean;
  /** Version der Cloud-Datei beim letzten Abgleich. */
  lastEtag: string | null;
  /** Zuletzt übernommener Stand (Versionszähler). */
  lastRevision: number;
  lastSyncedAt: string | null;
  /** Zuletzt vergebene Änderungsmarke dieses Geräts. */
  clock: string | null;
  /** IDs entschiedener Konflikte; wandern in die Cloud-Datei. */
  resolved: string[];
  status: SyncStatus;
  error: string | null;
  pending: number;
  /** Etwas wartet auf den Upload (entschiedener Konflikt, Umfang geändert …). */
  dirty: boolean;
  /** Anzahl Grabsteine beim letzten gelungenen Abgleich. */
  settledTombstones: number;
  devices: SyncDeviceEntry[];
  lastWriter: { name: string; at: string } | null;
};

export function createDefaultSyncState(
  deviceName = "Dieses Gerät",
): SyncStateRow {
  return {
    id: "main",
    device: `d-${crypto.randomUUID().slice(0, 8)}`,
    deviceName,
    enabled: false,
    provider: null,
    scope: { ...DEFAULT_SYNC_SCOPE },
    encrypted: false,
    lastEtag: null,
    lastRevision: 0,
    lastSyncedAt: null,
    clock: null,
    resolved: [],
    status: "off",
    error: null,
    pending: 0,
    dirty: false,
    settledTombstones: 0,
    devices: [],
    lastWriter: null,
  };
}

export type LocalState = {
  records: LocalSyncRecord[];
  tombstones: SyncTombstone[];
};

export type ApplyResult = {
  /** Datensätze, die die Prüfung nicht bestanden haben und übersprungen wurden. */
  rejected: string[];
};

type AnyTable = import("dexie").Table<
  Record<string, unknown> & { id: string },
  string
>;

export function createTeacherSyncStore(database: TeacherClassDatabase) {
  const table = (name: SyncTable) => database.table(name) as AnyTable;
  const allTables = () => SYNC_TABLES.map((name) => table(name));

  async function getState(): Promise<SyncStateRow> {
    const stored = await database.syncState.get("main");
    if (stored) return stored;
    const created = createDefaultSyncState();
    // Parallele Erstzugriffe dürfen keine zweite Geräte-ID vergeben.
    return database.transaction("rw", database.syncState, async () => {
      const latest = await database.syncState.get("main");
      if (latest) return latest;
      await database.syncState.put(created);
      return created;
    });
  }

  async function patchState(patch: Partial<Omit<SyncStateRow, "id">>) {
    const state = await getState();
    const next = { ...state, ...patch };
    await database.syncState.put(next);
    return next;
  }

  /**
   * Datensätze lesen, mit den Stempeln vergleichen und Änderungen, Neues und
   * Gelöschtes stempeln. Schreibt nur Stempel und Grabsteine.
   */
  async function prepare(options: {
    scope: SyncScope;
    device: string;
    tick: () => Hlc;
  }): Promise<LocalState> {
    const tables = [...tablesInScope(options.scope)];
    const rows: LocalRow[] = [];
    for (const name of tables) {
      for (const row of await table(name).toArray()) {
        rows.push(toLocalRow(name, row, options.scope));
      }
    }
    const inScope = new Set<string>(tables);
    const [stamps, tombstones] = await Promise.all([
      database.syncStamps.toArray(),
      database.tombstones.toArray(),
    ]);
    const result = reconcileLocal({
      rows,
      previous: stamps.filter((stamp) => inScope.has(stamp.table)),
      tombstones: tombstones.filter((entry) => inScope.has(entry.table)),
      device: options.device,
      tick: options.tick,
      firstSeenMs,
    });
    await database.transaction(
      "rw",
      database.syncStamps,
      database.tombstones,
      async () => {
        await replaceStamps(result.records, inScope);
        await replaceTombstones(result.tombstones, inScope);
      },
    );
    return result;
  }

  async function replaceStamps(
    records: readonly LocalSyncRecord[],
    inScope: ReadonlySet<string>,
  ) {
    const keep = new Set(records.map((r) => keyOf(r.table, r.id)));
    const existing = await database.syncStamps.toArray();
    await database.syncStamps.bulkDelete(
      existing
        .filter((stamp) => inScope.has(stamp.table) && !keep.has(stamp.key))
        .map((stamp) => stamp.key),
    );
    await database.syncStamps.bulkPut(
      records.map((record) => ({
        key: keyOf(record.table, record.id),
        ...toStamp(record),
      })),
    );
  }

  async function replaceTombstones(
    tombstones: readonly SyncTombstone[],
    inScope: ReadonlySet<string>,
  ) {
    const keep = new Set(tombstones.map((t) => keyOf(t.table, t.id)));
    const existing = await database.tombstones.toArray();
    await database.tombstones.bulkDelete(
      existing
        .filter((entry) => inScope.has(entry.table) && !keep.has(entry.key))
        .map((entry) => entry.key),
    );
    await database.tombstones.bulkPut(
      tombstones.map((entry) => ({
        key: keyOf(entry.table, entry.id),
        ...entry,
      })),
    );
  }

  /** Zusammengeführten Stand lokal anwenden, mit Stempeln und Konflikten. */
  async function apply(
    merged: Pick<
      MergeResult,
      "records" | "put" | "remove" | "tombstones" | "needsUpload" | "conflicts"
    >,
    options: { scope: SyncScope; resolved: readonly string[] },
  ): Promise<ApplyResult> {
    const inScope = new Set<string>(tablesInScope(options.scope));
    const rejected: string[] = [];
    await database.transaction(
      "rw",
      [
        ...allTables(),
        database.syncStamps,
        database.tombstones,
        database.syncConflicts,
        database.syncState,
      ],
      async () => {
        for (const { table: name, id } of merged.remove) {
          await table(name).delete(id);
          if (name === "classes") {
            await database.members.where("classId").equals(id).delete();
            await database.submissions.where("classId").equals(id).delete();
          }
        }
        for (const record of merged.put) {
          const existing = await table(record.table).get(record.id);
          const candidate = rowFromRecord(record, existing, options.scope);
          const parsed = SYNC_SCHEMAS[record.table].safeParse(candidate);
          if (!parsed.success) {
            rejected.push(keyOf(record.table, record.id));
            continue;
          }
          await table(record.table).put(parsed.data as never);
        }
        const accepted = merged.records.filter(
          (record) => !rejected.includes(keyOf(record.table, record.id)),
        );
        const stamped = markSynced(
          {
            records: accepted,
            put: merged.put,
            needsUpload: merged.needsUpload,
          },
          false,
        );
        await replaceStamps(stamped, inScope);
        await replaceTombstones(merged.tombstones, inScope);
        for (const conflict of merged.conflicts) {
          if (!(await database.syncConflicts.get(conflict.id))) {
            await database.syncConflicts.put(conflict);
          }
        }
        const state = await getState();
        await database.syncState.put({
          ...state,
          resolved: [...options.resolved],
        });
      },
    );
    return { rejected };
  }

  /** Nach gelungenem Upload: Alles gilt als abgeglichen. */
  async function confirm(
    merged: Pick<MergeResult, "records" | "put" | "needsUpload">,
    scope: SyncScope,
  ) {
    const inScope = new Set<string>(tablesInScope(scope));
    const known = new Set(
      (await database.syncStamps.toArray()).map((stamp) => stamp.key),
    );
    const settled = markSynced(merged, true).filter((record) =>
      known.has(keyOf(record.table, record.id)),
    );
    await database.syncStamps.bulkPut(
      settled
        .filter((record) => inScope.has(record.table))
        .map((record) => ({
          key: keyOf(record.table, record.id),
          ...toStamp(record),
        })),
    );
  }

  /**
   * Datei-Sicherung mit den Daten dieses Geräts zusammenführen: Die jüngere
   * Fassung gewinnt, nichts Neueres geht verloren, Gelöschtes kommt nicht
   * zurück. Konflikte landen in der Liste.
   */
  async function importBackup(
    backup: TeacherWorkspaceBackup,
    now: () => number = Date.now,
  ) {
    const scope: SyncScope = {
      material: true,
      assignments: true,
      classes: true,
      students: true,
      results: true,
      keys: true,
    };
    const state = await getState();
    const clock = createClock(state.device, state.clock ?? undefined);
    const local = await prepare({
      scope,
      device: state.device,
      tick: () => clock.tick(now()),
    });
    const merged = mergeStates({
      local: { ...local, resolved: state.resolved },
      remote: {
        records: recordsFromBackup(backup, scope, "datei"),
        tombstones: [],
        resolved: [],
      },
      now: new Date(now()).toISOString(),
    });
    // Eine ältere Datei, die einer neueren lokalen Fassung unterliegt, ist kein
    // Konflikt, sondern der Normalfall beim Zurückspielen. Gemerkt wird nur,
    // was die Datei lokal überschrieben hat.
    const conflicts = merged.conflicts.filter(
      (conflict) =>
        conflict.kind !== "changed" || conflict.kept?.device === "datei",
    );
    await apply({ ...merged, conflicts }, { scope, resolved: merged.resolved });
    // Mit aktivem Abgleich muss der neue Stand beim nächsten Mal in die Cloud.
    await patchState({
      clock: clock.last() ?? null,
      ...(state.enabled ? { dirty: true } : {}),
    });
    return merged;
  }

  async function markResolved(conflict: SyncConflict) {
    const state = await getState();
    await database.syncConflicts.put({
      ...conflict,
      status: "resolved",
      resolvedAt: new Date().toISOString(),
    });
    await database.syncState.put({
      ...state,
      resolved: [...new Set([...state.resolved, conflict.id])],
      dirty: true,
    });
  }

  /**
   * Konflikt entscheiden. Die Entscheidung wird als gewöhnliche Änderung
   * geschrieben und beim nächsten Abgleich verteilt; die ID des Konflikts
   * wandert mit, damit das andere Gerät ihn nicht erneut zeigt.
   */
  async function resolveConflict(
    id: string,
    action: ConflictAction,
  ): Promise<void> {
    const conflict = await database.syncConflicts.get(id);
    if (!conflict || conflict.status === "resolved") return;
    await database.transaction(
      "rw",
      [...allTables(), database.syncConflicts, database.syncState],
      async () => {
        const target = table(conflict.table);
        switch (action.type) {
          case "keep":
            break;
          case "use-other": {
            if (!conflict.other) break;
            const existing = await target.get(conflict.recordId);
            const row = rowFromRecord(
              { table: conflict.table, data: conflict.other.data },
              existing,
              { keys: false },
            );
            const parsed = SYNC_SCHEMAS[conflict.table].safeParse(row);
            if (!parsed.success) {
              throw new Error("Die andere Fassung ist nicht mehr gültig.");
            }
            await target.put(parsed.data as never);
            break;
          }
          case "keep-both": {
            if (!conflict.other || !COPYABLE.has(conflict.table)) break;
            const copyId = crypto.randomUUID();
            const label = action.label ?? "andere Fassung";
            const data: SyncData = {
              ...conflict.other.data,
              id: copyId,
              title:
                `${String(conflict.other.data["title"] ?? "")} (${label})`.slice(
                  0,
                  160,
                ),
            };
            const parsed = SYNC_SCHEMAS[conflict.table].safeParse(data);
            if (!parsed.success) {
              throw new Error("Die Kopie ist nicht gültig.");
            }
            await target.put(parsed.data as never);
            break;
          }
          case "delete":
            await target.delete(conflict.recordId);
            break;
          case "remove":
            await target.delete(action.id);
            break;
          case "merge": {
            if (!conflict.otherRecordId) break;
            await mergeInto(
              conflict.table,
              conflict.recordId,
              conflict.otherRecordId,
            );
            break;
          }
        }
        await markResolved(conflict);
      },
    );
  }

  /** `other` in `kept` zusammenlegen: Verweise umschreiben, `other` löschen. */
  async function mergeInto(name: SyncTable, kept: string, dropped: string) {
    const holders: SyncTable[] =
      name === "classes"
        ? [
            "contentPackages",
            "assignments",
            "members",
            "submissions",
            "profiles",
          ]
        : name === "contentPackages"
          ? ["assignments"]
          : [];
    for (const holder of holders) {
      for (const row of await table(holder).toArray()) {
        const data = rewriteReferences(
          {
            table: holder,
            id: row.id,
            hlc: "",
            device: "",
            hash: "",
            data: row,
          },
          name,
          dropped,
          kept,
        );
        if (data) await table(holder).put(data as never);
      }
    }
    await table(name).delete(dropped);
  }

  const listConflicts = (status: SyncConflict["status"] = "open") =>
    database.syncConflicts.where("status").equals(status).toArray();

  return {
    getState,
    patchState,
    prepare,
    apply,
    confirm,
    importBackup,
    resolveConflict,
    listConflicts,
    table,
  };
}

export type ConflictAction =
  /** Die vorläufig gültige Fassung bleibt. */
  | { type: "keep" }
  /** Die unterlegene Fassung wird übernommen. */
  | { type: "use-other" }
  /** Die unterlegene Fassung wird als Kopie angelegt (Material, Aufgaben). */
  | { type: "keep-both"; label?: string }
  /** Gelöscht gegen geändert: doch löschen. */
  | { type: "delete" }
  /** Doppelung: einen der beiden Datensätze entfernen. */
  | { type: "remove"; id: string }
  /** Doppelung: zusammenlegen. */
  | { type: "merge" };

const COPYABLE: ReadonlySet<SyncTable> = new Set([
  "contentPackages",
  "assignments",
]);

export type TeacherSyncStore = ReturnType<typeof createTeacherSyncStore>;

function toStamp(record: LocalSyncRecord): SyncStamp {
  return {
    table: record.table,
    id: record.id,
    hlc: record.hlc,
    device: record.device,
    hash: record.hash,
    ...(record.baseHash !== undefined ? { baseHash: record.baseHash } : {}),
  };
}
