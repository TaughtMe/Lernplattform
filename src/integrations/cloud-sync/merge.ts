/**
 * Zusammenführen zweier Stände (lokal, remote). Reine Funktion ohne Datenbank
 * und Netz; sie ist kommutativ und idempotent und verliert keine Änderung:
 * Die unterlegene Fassung eines Konflikts bleibt in `conflicts` erhalten.
 *
 * Grundregel: Die jüngere Änderungsmarke (HLC) gewinnt. Ein Konflikt wird
 * gemeldet, wenn beide Geräte denselben Datensatz seit dem letzten Abgleich
 * verschieden geändert haben.
 */
import { contentHash } from "./hash";
import { compareHlc } from "./hlc";
import {
  keyOf,
  splitKey,
  type LocalSyncRecord,
  type SyncConflict,
  type SyncData,
  type SyncRecord,
  type SyncSecrets,
  type SyncTable,
  type SyncTombstone,
  type SyncVersion,
} from "./model";

export type MergeSide = {
  records: readonly SyncRecord[];
  tombstones: readonly SyncTombstone[];
  /** IDs schon entschiedener Konflikte. */
  resolved: readonly string[];
};

export type MergeInput = {
  local: Omit<MergeSide, "records"> & {
    records: readonly LocalSyncRecord[];
  };
  remote: MergeSide;
  /** Zeitpunkt für neue Konflikte (ISO). */
  now: string;
  /** Nachbearbeitung des zusammengeführten Stands, z. B. Doppelungen. */
  refine?: (state: RefineState) => RefineState & {
    conflicts: readonly SyncConflict[];
  };
};

export type RefineState = {
  records: SyncRecord[];
  tombstones: SyncTombstone[];
  resolved: readonly string[];
};

export type MergeResult = {
  records: SyncRecord[];
  tombstones: SyncTombstone[];
  resolved: string[];
  /** Datensätze, die lokal neu geschrieben werden müssen. */
  put: SyncRecord[];
  /** Datensätze, die lokal zu löschen sind. */
  remove: Array<{ table: SyncTable; id: string }>;
  conflicts: SyncConflict[];
  /** Der zusammengeführte Stand weicht vom Remote-Stand ab. */
  needsUpload: boolean;
};

const RELIEF_FIELDS = [
  "writingRelief",
  "writingReliefIssuedAt",
  "writingReliefSignature",
] as const;

function version(record: SyncRecord): SyncVersion {
  return { hlc: record.hlc, device: record.device, data: record.data };
}

/** Anzeigename eines Datensatzes für Konfliktlisten. */
export function recordLabel(record: Pick<SyncRecord, "table" | "id" | "data">) {
  const { data } = record;
  const text = (value: unknown) =>
    typeof value === "string" && value.trim() ? value : undefined;
  switch (record.table) {
    case "classes":
      return `Klasse ${text(data["name"]) ?? record.id}`;
    case "members":
      return `Kind ${text(data["displayName"]) ?? record.id}`;
    case "contentPackages":
      return `Material „${text(data["title"]) ?? record.id}“`;
    case "assignments":
      return `Aufgabe „${text(data["title"]) ?? record.id}“`;
    case "profiles":
      return "Lehrerprofil";
    case "classSettings":
      return "Klasseneinstellungen";
    case "submissions":
      return "Leistungsbrief";
  }
}

export function conflictId(
  kind: string,
  key: string,
  ...parts: readonly string[]
) {
  return contentHash([kind, key, ...parts].join("|")).slice(0, 24);
}

function newer<T extends { hlc: string }>(left: T, right: T) {
  return compareHlc(left.hlc, right.hlc) >= 0 ? left : right;
}

function sequenceOf(record: SyncRecord) {
  const value = record.data["sequence"];
  return typeof value === "number" ? value : 0;
}

/** Zwei verschiedene Fassungen eines Datensatzes zu einer vereinen. */
function resolve(left: SyncRecord, right: SyncRecord): SyncRecord {
  if (left.table === "submissions") {
    const difference = sequenceOf(left) - sequenceOf(right);
    if (difference !== 0) return difference > 0 ? left : right;
  }
  const winner = newer(left, right);
  if (left.table !== "members") return winner;
  // Schreiberleichterung: die später ausgestellte Freigabe gilt.
  const loser = winner === left ? right : left;
  const issued = (record: SyncRecord) =>
    typeof record.data["writingReliefIssuedAt"] === "string"
      ? record.data["writingReliefIssuedAt"]
      : undefined;
  const winnerIssued = issued(winner);
  const loserIssued = issued(loser);
  if (!loserIssued || (winnerIssued && winnerIssued >= loserIssued)) {
    return winner;
  }
  const data: SyncData = { ...winner.data };
  for (const field of RELIEF_FIELDS) {
    if (field in loser.data) data[field] = loser.data[field];
    else delete data[field];
  }
  return { ...winner, data, hash: contentHash(data) };
}

function sameSeal(left?: SyncSecrets, right?: SyncSecrets) {
  return left?.seal?.publicKey === right?.seal?.publicKey;
}

function mergeSecrets(
  local: SyncSecrets | undefined,
  remote: SyncSecrets | undefined,
): SyncSecrets | undefined {
  const seal = remote?.seal ?? local?.seal;
  const enrollmentToken = remote?.enrollmentToken ?? local?.enrollmentToken;
  if (!seal && !enrollmentToken) return undefined;
  return {
    ...(seal ? { seal } : {}),
    ...(enrollmentToken ? { enrollmentToken } : {}),
  };
}

function sameSecrets(left?: SyncSecrets, right?: SyncSecrets) {
  return (
    left?.seal?.publicKey === right?.seal?.publicKey &&
    left?.enrollmentToken === right?.enrollmentToken
  );
}

export function mergeStates(input: MergeInput): MergeResult {
  const { local, remote } = input;
  const localRecords = new Map<string, LocalSyncRecord>();
  const remoteRecords = new Map<string, SyncRecord>();
  const localTombstones = new Map<string, SyncTombstone>();
  const remoteTombstones = new Map<string, SyncTombstone>();
  for (const record of local.records) {
    localRecords.set(keyOf(record.table, record.id), record);
  }
  for (const record of remote.records) {
    remoteRecords.set(keyOf(record.table, record.id), record);
  }
  for (const tombstone of local.tombstones) {
    localTombstones.set(keyOf(tombstone.table, tombstone.id), tombstone);
  }
  for (const tombstone of remote.tombstones) {
    remoteTombstones.set(keyOf(tombstone.table, tombstone.id), tombstone);
  }
  const resolved = [...new Set([...local.resolved, ...remote.resolved])].sort();
  const known = new Set(resolved);

  const keys = [
    ...new Set([
      ...localRecords.keys(),
      ...remoteRecords.keys(),
      ...localTombstones.keys(),
      ...remoteTombstones.keys(),
    ]),
  ].sort();

  let records: SyncRecord[] = [];
  let tombstones: SyncTombstone[] = [];
  const conflicts: SyncConflict[] = [];

  const report = (conflict: Omit<SyncConflict, "detectedAt" | "status">) => {
    if (known.has(conflict.id)) return;
    conflicts.push({ ...conflict, detectedAt: input.now, status: "open" });
  };

  for (const key of keys) {
    const { table, id } = splitKey(key);
    const own = localRecords.get(key);
    const other = remoteRecords.get(key);
    const ownTombstone = localTombstones.get(key);
    const otherTombstone = remoteTombstones.get(key);

    let winner: SyncRecord | undefined;
    if (own && other) {
      if (own.hash === other.hash) {
        winner = other;
      } else {
        winner = resolve(own, other);
        const ownChanged = own.hash !== own.baseHash;
        const otherChanged = other.hash !== own.baseHash;
        if (table !== "submissions" && ownChanged && otherChanged) {
          const older = compareHlc(own.hlc, other.hlc) >= 0 ? other : own;
          const unterlegen =
            winner.hash === own.hash
              ? other
              : winner.hash === other.hash
                ? own
                : older;
          report({
            id: conflictId("changed", key, ...[own.hash, other.hash].sort()),
            kind: "changed",
            table,
            recordId: id,
            label: recordLabel(winner),
            kept: version(winner),
            other: version(unterlegen),
          });
        }
      }
    } else {
      winner = own ?? other;
    }

    let tombstone: SyncTombstone | undefined;
    if (ownTombstone && otherTombstone) {
      tombstone = newer(ownTombstone, otherTombstone);
    } else {
      tombstone = ownTombstone ?? otherTombstone;
    }

    if (winner && tombstone) {
      if (compareHlc(tombstone.hlc, winner.hlc) > 0) {
        winner = undefined;
      } else {
        // Später geändert als gelöscht: Der Datensatz bleibt, der Grabstein fällt.
        report({
          id: conflictId("deleted", key, tombstone.hlc, winner.hash),
          kind: "deleted",
          table,
          recordId: id,
          label: recordLabel(winner),
          kept: version(winner),
          other: null,
        });
        tombstone = undefined;
      }
    }

    if (!winner) {
      if (tombstone) tombstones.push(tombstone);
      continue;
    }

    const secrets = mergeSecrets(own?.secrets, other?.secrets);
    const merged: SyncRecord = {
      table: winner.table,
      id: winner.id,
      hlc: winner.hlc,
      device: winner.device,
      hash: winner.hash,
      data: winner.data,
      ...(secrets ? { secrets } : {}),
    };
    records.push(merged);

    if (
      table === "classes" &&
      own?.secrets?.seal &&
      other?.secrets?.seal &&
      !sameSeal(own.secrets, other.secrets)
    ) {
      report({
        id: conflictId(
          "seal",
          key,
          own.secrets.seal.publicKey,
          other.secrets.seal.publicKey,
        ),
        kind: "seal",
        table,
        recordId: id,
        label: recordLabel(merged),
        kept: version(merged),
        other: null,
      });
    }
  }

  if (input.refine) {
    const refined = input.refine({ records, tombstones, resolved });
    records = refined.records;
    tombstones = refined.tombstones;
    conflicts.push(...refined.conflicts.filter((c) => !known.has(c.id)));
  }

  const put = records.filter((record) => {
    const own = localRecords.get(keyOf(record.table, record.id));
    return (
      !own ||
      own.hash !== record.hash ||
      !sameSecrets(own.secrets, record.secrets)
    );
  });
  const finalKeys = new Set(records.map((r) => keyOf(r.table, r.id)));
  const remove = [...localRecords.values()]
    .filter((own) => !finalKeys.has(keyOf(own.table, own.id)))
    .map(({ table, id }) => ({ table, id }));

  // Betroffene Kinder eines ersetzten Klassenstempels.
  for (const conflict of conflicts) {
    if (conflict.kind !== "seal") continue;
    conflict.affectedMemberIds = records
      .filter(
        (record) =>
          record.table === "members" &&
          record.data["classId"] === conflict.recordId &&
          record.data["writingRelief"] === true,
      )
      .map((record) => record.id);
  }

  const remoteRecordSeen = records.every((record) => {
    const counterpart = remoteRecords.get(keyOf(record.table, record.id));
    return (
      counterpart !== undefined &&
      counterpart.hash === record.hash &&
      sameSecrets(counterpart.secrets, record.secrets)
    );
  });
  const mergedKeys = new Set(records.map((r) => keyOf(r.table, r.id)));
  const mergedTombstones = new Map(
    tombstones.map((t) => [keyOf(t.table, t.id), t]),
  );
  const needsUpload =
    !remoteRecordSeen ||
    [...remoteRecords.keys()].some((key) => !mergedKeys.has(key)) ||
    tombstones.some(
      (t) => remoteTombstones.get(keyOf(t.table, t.id))?.hlc !== t.hlc,
    ) ||
    [...remoteTombstones.keys()].some((key) => !mergedTombstones.has(key)) ||
    resolved.length !== new Set(remote.resolved).size;

  return {
    records,
    tombstones,
    resolved,
    put,
    remove,
    conflicts,
    needsUpload,
  };
}
