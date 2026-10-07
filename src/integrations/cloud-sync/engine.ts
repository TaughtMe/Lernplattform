/**
 * Eine Abgleichrunde (`syncOnce`) zwischen der Lehrer-Datenbank und der
 * Cloud-Datei. Ziel, Uhr und Datenbank werden hineingegeben, damit Tests mit
 * Kunstzeit und Speicherziel im Arbeitsspeicher laufen.
 *
 * Fail-safe: Jeder Fehler hält den Abgleich an, lokale Daten bleiben, wie sie
 * sind; fremde Stände werden nur in einer einzigen Transaktion angewendet.
 */
import { recordsFromBackup } from "../../storage/teacher-sync-rows";
import {
  createTeacherSyncStore,
  type SyncStateRow,
  type SyncStatus,
  type TeacherSyncStore,
} from "../../storage/teacher-sync-store";
import type { TeacherClassDatabase } from "../../storage/teacher-class-settings";
import { dedupe } from "./dedupe";
import {
  SYNC_FILE_V2,
  openEnvelope,
  parseLegacyBackup,
  serializeEnvelope,
  type SyncDeviceEntry,
  type SyncKey,
  type SyncPayload,
} from "./envelope";
import { createClock, parseHlc } from "./hlc";
import { mergeStates } from "./merge";
import {
  tablesInScope,
  type SyncConflict,
  type SyncRecord,
  type SyncTable,
} from "./model";
import { countPending } from "./stamping";
import { SYNC_FILES } from "./sync";
import { CloudSyncError, type CloudSyncTarget } from "./types";

/** Grabsteine werden nach dieser Zeit entfernt. */
export const TOMBSTONE_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
/** So oft wird bei verlorenem Wettlauf (412) neu gelesen und zusammengeführt. */
export const MAX_WRITE_ATTEMPTS = 3;

export type EngineDeps = {
  database: TeacherClassDatabase;
  target: CloudSyncTarget;
  /** Passwort-Schlüssel; ohne ihn wird unverschlüsselt gelesen und geschrieben. */
  syncKey?: SyncKey | null;
  /**
   * Nur beim Passwortwechsel: Schlüssel, mit dem die vorhandene Datei noch
   * verschlüsselt ist. Gelesen wird damit, geschrieben mit `syncKey`.
   */
  readKey?: CryptoKey | null;
  now?: () => number;
  /** Datei im Cloud-Ordner. */
  fileName?: string;
  /** Die Runde beginnt (Zustand „läuft“ ist gespeichert). */
  onStart?: () => void;
};

export type RoundResult = {
  status: SyncStatus;
  /** Es wurde geschrieben (neuer Stand in der Cloud). */
  uploaded: boolean;
  /** Anderes Gerät hat Änderungen gebracht (lokal angewendet). */
  received: boolean;
  revision: number;
  newConflicts: number;
  error?: string;
};

/** Anbieter-Fehler → Zustand des Cloud-Symbols. */
export function statusForError(
  error: unknown,
  provider: SyncStateRow["provider"],
): { status: SyncStatus; message: string } {
  if (error instanceof CloudSyncError) {
    if (error.code === "locked") {
      return { status: "locked", message: error.message };
    }
    if (error.code === "reauth") {
      return { status: "reauth", message: error.message };
    }
    if (error.code === "unauthorized" && provider !== "webdav") {
      return { status: "reauth", message: error.message };
    }
    if (error.code === "network") {
      return { status: "offline", message: error.message };
    }
    return { status: "error", message: error.message };
  }
  return {
    status: "error",
    message:
      error instanceof Error
        ? error.message
        : "Der Abgleich ist fehlgeschlagen.",
  };
}

type Remote = {
  payload: SyncPayload;
  revision: number;
  etag: string | null;
  exists: boolean;
  /** Salz der Verschlüsselung der vorhandenen Datei; `null`, wenn unverschlüsselt. */
  salt: string | null;
};

const EMPTY_PAYLOAD: SyncPayload = {
  records: [],
  tombstones: [],
  resolved: [],
  devices: [],
};

async function loadRemote(
  deps: EngineDeps,
  state: SyncStateRow,
  fileName: string,
): Promise<Remote> {
  const file = await deps.target.read(fileName);
  if (!file) {
    // Noch keine v2-Datei: die bisherige v1-Sicherung einmalig als Ausgangsstand.
    const legacyText = await deps.target.download(SYNC_FILES.teacher);
    const legacy = legacyText ? parseLegacyBackup(legacyText) : null;
    if (!legacy) {
      return {
        payload: EMPTY_PAYLOAD,
        revision: 0,
        etag: null,
        exists: false,
        salt: null,
      };
    }
    return {
      payload: {
        records: recordsFromBackup(legacy, state.scope, "v1-sicherung"),
        tombstones: [],
        resolved: [],
        devices: [],
      },
      revision: 0,
      etag: null,
      exists: false,
      salt: null,
    };
  }
  const opened = await openEnvelope(
    file.text,
    deps.readKey ?? deps.syncKey?.key,
  );
  return {
    payload: opened.payload,
    revision: opened.header.revision,
    etag: file.etag,
    exists: true,
    salt: opened.header.encryption?.salt ?? null,
  };
}

function inScope(table: SyncTable, tables: ReadonlySet<SyncTable>) {
  return tables.has(table);
}

/** Eine Runde: holen, zusammenführen, anwenden, bei Bedarf schreiben. */
export async function syncOnce(
  deps: EngineDeps,
  options: { force?: boolean } = {},
): Promise<RoundResult> {
  const store = createTeacherSyncStore(deps.database);
  const now = deps.now ?? Date.now;
  const fileName = deps.fileName ?? SYNC_FILE_V2;
  let state = await store.getState();
  if (!state.enabled) {
    return {
      status: "off",
      uploaded: false,
      received: false,
      revision: state.lastRevision,
      newConflicts: 0,
    };
  }
  try {
    state = await store.patchState({ status: "syncing", error: null });
    deps.onStart?.();
    const result = await runRound(deps, store, fileName, now, options.force);
    return result;
  } catch (error) {
    const { status, message } = statusForError(error, state.provider);
    await store.patchState({ status, error: message });
    return {
      status,
      uploaded: false,
      received: false,
      revision: state.lastRevision,
      newConflicts: 0,
      error: message,
    };
  }
}

async function runRound(
  deps: EngineDeps,
  store: TeacherSyncStore,
  fileName: string,
  now: () => number,
  force = false,
): Promise<RoundResult> {
  let received = false;
  let newConflicts = 0;
  for (let attempt = 1; ; attempt += 1) {
    const state = await store.getState();
    const scope = state.scope;
    const tables = tablesInScope(scope);
    const clock = createClock(state.device, state.clock ?? undefined);
    const tick = () => clock.tick(now());

    const local = await store.prepare({ scope, device: state.device, tick });
    const pending =
      countPending(local.records) +
      Math.max(0, local.tombstones.length - state.settledTombstones);

    if (pending !== state.pending) await store.patchState({ pending });

    // Schneller Weg: Version unverändert und nichts Eigenes offen.
    const sameEncryption =
      Boolean(deps.syncKey) === state.encrypted && !deps.readKey;
    if (
      !force &&
      !state.dirty &&
      pending === 0 &&
      attempt === 1 &&
      sameEncryption
    ) {
      const stat = await deps.target.stat(fileName);
      if (stat && stat.etag !== null && stat.etag === state.lastEtag) {
        // Offene Konflikte bleiben sichtbar, auch wenn sich nichts geändert hat.
        const status = await settledStatus(store);
        await store.patchState({
          status,
          error: null,
          pending: 0,
          lastSyncedAt: new Date(now()).toISOString(),
        });
        return {
          status,
          uploaded: false,
          received: false,
          revision: state.lastRevision,
          newConflicts: 0,
        };
      }
    }

    const remote = await loadRemote(deps, state, fileName);
    for (const entry of [
      ...remote.payload.records,
      ...remote.payload.tombstones,
    ]) {
      clock.observe(entry.hlc, now());
    }
    const remoteIn = remote.payload.records.filter((r) =>
      inScope(r.table, tables),
    );
    const remoteOut = remote.payload.records.filter(
      (r) => !inScope(r.table, tables),
    );
    const remoteTombIn = remote.payload.tombstones.filter((t) =>
      inScope(t.table, tables),
    );
    const remoteTombOut = remote.payload.tombstones.filter(
      (t) => !inScope(t.table, tables),
    );

    const merged = mergeStates({
      local: {
        records: local.records,
        tombstones: local.tombstones,
        resolved: state.resolved,
      },
      remote: {
        records: remoteIn,
        tombstones: remoteTombIn,
        resolved: remote.payload.resolved,
      },
      now: new Date(now()).toISOString(),
      refine: (current) => {
        const result = dedupe({
          ...current,
          device: state.device,
          tick,
          now: new Date(now()).toISOString(),
        });
        return {
          records: result.records,
          tombstones: result.tombstones,
          resolved: current.resolved,
          conflicts: result.conflicts,
        };
      },
    });

    const applied = merged.put.length > 0 || merged.remove.length > 0;
    await store.apply(merged, { scope, resolved: merged.resolved });
    received ||= applied;
    newConflicts += merged.conflicts.length;

    const registered = remote.payload.devices.some(
      (d) => d.id === state.device,
    );
    const nameChanged = remote.payload.devices.some(
      (d) => d.id === state.device && d.name !== state.deviceName,
    );
    const encryptionChanged =
      remote.exists &&
      (Boolean(deps.syncKey) !== state.encrypted ||
        (deps.syncKey !== null &&
          deps.syncKey !== undefined &&
          remote.salt !== null &&
          remote.salt !== deps.syncKey.encryption.salt));
    const needsWrite =
      merged.needsUpload ||
      force ||
      state.dirty ||
      !registered ||
      nameChanged ||
      encryptionChanged ||
      !remote.exists;

    let revision = remote.revision;
    let etag = remote.etag;
    let uploaded = false;
    if (needsWrite) {
      revision = remote.revision + 1;
      const at = new Date(now()).toISOString();
      const cutoff = now() - TOMBSTONE_RETENTION_MS;
      const payload: SyncPayload = {
        records: [...merged.records, ...remoteOut] as SyncRecord[],
        tombstones: [...merged.tombstones, ...remoteTombOut].filter(
          (t) => parseHlc(t.hlc).ms >= cutoff,
        ),
        resolved: merged.resolved,
        devices: upsertDevice(remote.payload.devices, {
          id: state.device,
          name: state.deviceName,
          revision,
          seenAt: at,
        }),
      };
      const text = await serializeEnvelope({
        revision,
        writtenBy: { device: state.device, name: state.deviceName, at },
        payload,
        ...(deps.syncKey ? { key: deps.syncKey } : {}),
      });
      try {
        const result = await deps.target.upload(fileName, text, {
          ifMatch: remote.exists ? remote.etag : null,
        });
        etag = result.etag ?? (await deps.target.stat(fileName))?.etag ?? null;
        uploaded = true;
      } catch (error) {
        if (
          error instanceof CloudSyncError &&
          error.code === "precondition" &&
          attempt < MAX_WRITE_ATTEMPTS
        ) {
          continue;
        }
        if (error instanceof CloudSyncError && error.code === "precondition") {
          throw new CloudSyncError(
            "precondition",
            "Konflikt beim Schreiben: Ein anderes Gerät war schneller. Der nächste Abgleich versucht es erneut.",
            { cause: error },
          );
        }
        throw error;
      }
      await store.confirm(merged, scope);
    }

    const open = await store.listConflicts();
    const status: SyncStatus = open.length > 0 ? "conflict" : "idle";
    const lastTombstones = merged.tombstones.length;
    const devices = needsWrite
      ? upsertDevice(remote.payload.devices, {
          id: state.device,
          name: state.deviceName,
          revision,
          seenAt: new Date(now()).toISOString(),
        })
      : remote.payload.devices;
    await store.patchState({
      status,
      error: null,
      pending: 0,
      dirty: false,
      settledTombstones: lastTombstones,
      lastEtag: etag,
      lastRevision: revision,
      lastSyncedAt: new Date(now()).toISOString(),
      clock: clock.last() ?? null,
      encrypted: Boolean(deps.syncKey),
      devices,
      lastWriter: uploaded
        ? { name: state.deviceName, at: new Date(now()).toISOString() }
        : writerFrom(remote.payload.devices, revision),
    });
    return { status, uploaded, received, revision, newConflicts };
  }
}

function writerFrom(devices: readonly SyncDeviceEntry[], revision: number) {
  const latest = [...devices]
    .filter((device) => device.revision === revision)
    .sort((a, b) => (a.seenAt < b.seenAt ? 1 : -1))[0];
  return latest ? { name: latest.name, at: latest.seenAt } : null;
}

async function settledStatus(store: TeacherSyncStore): Promise<SyncStatus> {
  return (await store.listConflicts()).length > 0 ? "conflict" : "idle";
}

export function upsertDevice(
  devices: readonly SyncDeviceEntry[],
  entry: SyncDeviceEntry,
): SyncDeviceEntry[] {
  return [...devices.filter((device) => device.id !== entry.id), entry].sort(
    (a, b) => (a.id < b.id ? -1 : 1),
  );
}

export type { SyncConflict };
