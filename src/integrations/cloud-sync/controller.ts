/**
 * Steuerung des Geräte-Abgleichs für die Oberfläche: einrichten, entsperren,
 * Passwort wechseln, ausschalten, Konflikte entscheiden und den Zustand fürs
 * Cloud-Symbol bereitstellen. Hält den Schlüssel im Arbeitsspeicher und
 * startet die Zeitsteuerung. Keine React-Abhängigkeit.
 */
import type { TeacherClassDatabase } from "../../storage/teacher-class-settings";
import {
  createTeacherSyncStore,
  type ConflictAction,
  type SyncStateRow,
  type SyncStatus,
} from "../../storage/teacher-sync-store";
import type { CredentialStore, WebDavConnection } from "./credentials";
import { statusForError, syncOnce, type RoundResult } from "./engine";
import {
  SYNC_FILE_V2,
  createSyncKey,
  readEnvelopeHeader,
  unlockSyncKey,
  type SyncEnvelopeHeader,
  type SyncKey,
} from "./envelope";
import type { SyncScope } from "./model";
import { createSyncScheduler, type SchedulerEnv } from "./scheduler";
import { createSyncTarget } from "./target";
import {
  CloudSyncError,
  type CloudProviderId,
  type CloudSyncTarget,
} from "./types";
import { createWebDavTarget } from "./webdav";

export type SyncSnapshot = {
  enabled: boolean;
  status: SyncStatus;
  error: string | null;
  pending: number;
  revision: number;
  lastSyncedAt: string | null;
  deviceId: string;
  deviceName: string;
  provider: CloudProviderId | null;
  scope: SyncScope;
  encrypted: boolean;
  devices: SyncStateRow["devices"];
  lastWriter: SyncStateRow["lastWriter"];
  openConflicts: number;
};

export type EnableOptions = {
  provider: CloudProviderId;
  scope: SyncScope;
  deviceName: string;
  /** WebDAV: Zugangsdaten (werden gespeichert). */
  webdav?: WebDavConnection;
  /** Passwort der Verschlüsselung; leer = unverschlüsselt. */
  password?: string;
  /** Schlüssel auf diesem Gerät merken (nicht für geteilte Geräte). */
  remember?: boolean;
};

export type RemoteInfo = {
  exists: boolean;
  header: SyncEnvelopeHeader | null;
};

export type ControllerDeps = {
  database: TeacherClassDatabase;
  credentials: CredentialStore;
  env: SchedulerEnv;
  /** Zum Prüfen der Verbindung und für Tests. */
  fetcher?: typeof fetch;
  /** Hohe Iterationszahl nur in Tests senken. */
  iterations?: number;
  /** Listen neu laden, wenn ein anderes Gerät etwas gebracht hat. */
  onData?: () => void;
};

export function createSyncController(deps: ControllerDeps) {
  const store = createTeacherSyncStore(deps.database);
  const listeners = new Set<(snapshot: SyncSnapshot) => void>();
  let memoryKey: SyncKey | null = null;
  let readKey: CryptoKey | null = null;

  async function snapshot(): Promise<SyncSnapshot> {
    const state = await store.getState();
    return {
      enabled: state.enabled,
      status: state.status,
      error: state.error,
      pending: state.pending,
      revision: state.lastRevision,
      lastSyncedAt: state.lastSyncedAt,
      deviceId: state.device,
      deviceName: state.deviceName,
      provider: state.provider,
      scope: state.scope,
      encrypted: state.encrypted,
      devices: state.devices,
      lastWriter: state.lastWriter,
      openConflicts: (await store.listConflicts()).length,
    };
  }

  /** Zustand verteilen; eine geschlossene Datenbank (Abmelden) ist kein Fehler. */
  async function emit() {
    if (listeners.size === 0) return;
    try {
      const current = await snapshot();
      for (const listener of listeners) listener(current);
    } catch {
      // Datenbank geschlossen oder gelöscht: nichts mehr anzuzeigen.
    }
  }

  async function currentKey(state: SyncStateRow) {
    if (!state.encrypted) return null;
    memoryKey ??= await deps.credentials.loadKey();
    return memoryKey;
  }

  async function failed(error: unknown, state: SyncStateRow) {
    const { status, message } = statusForError(error, state.provider);
    await store.patchState({ status, error: message });
    return {
      status,
      uploaded: false,
      received: false,
      revision: state.lastRevision,
      newConflicts: 0,
      error: message,
    } satisfies RoundResult;
  }

  /** Eine Runde mit frischem Ziel; Fehler werden zu Zuständen. */
  async function round(): Promise<RoundResult> {
    const state = await store.getState();
    if (!state.enabled || !state.provider) {
      return {
        status: "off",
        uploaded: false,
        received: false,
        revision: state.lastRevision,
        newConflicts: 0,
      };
    }
    let target: CloudSyncTarget;
    let key: SyncKey | null;
    try {
      key = await currentKey(state);
      if (state.encrypted && !key) {
        throw new CloudSyncError(
          "locked",
          "Passwort nötig, um den Abgleich fortzusetzen.",
        );
      }
      target = await createSyncTarget(
        state.provider,
        deps.credentials,
        key?.key ?? null,
        deps.fetcher,
      );
    } catch (error) {
      return failed(error, state);
    }
    const result = await syncOnce({
      database: deps.database,
      target,
      syncKey: key,
      readKey,
      onStart: () => void emit(),
    });
    if (result.status !== "off" && !result.error) readKey = null;
    return result;
  }

  const scheduler = createSyncScheduler({
    env: deps.env,
    round,
    onData: () => deps.onData?.(),
    onChange: () => void emit(),
    onError: () => undefined,
    onOffline: () => {
      void store
        .patchState({
          status: "offline",
          error: "Offline · Änderungen werden später gesendet",
        })
        .then(emit);
    },
  });

  /** Datei im Cloud-Ordner ansehen, ohne etwas zu ändern. */
  async function inspectRemote(
    provider: CloudProviderId,
    webdav?: WebDavConnection,
  ): Promise<RemoteInfo> {
    const target =
      provider === "webdav" && webdav
        ? createWebDavTarget(webdav, deps.fetcher)
        : await createSyncTarget(
            provider,
            deps.credentials,
            null,
            deps.fetcher,
          );
    const file = await target.read(SYNC_FILE_V2);
    if (!file) return { exists: false, header: null };
    return { exists: true, header: readEnvelopeHeader(file.text) };
  }

  async function keyFor(
    password: string,
    remote: RemoteInfo,
  ): Promise<SyncKey> {
    const encryption = remote.header?.encryption;
    return encryption
      ? unlockSyncKey(password, encryption)
      : createSyncKey(password, deps.iterations);
  }

  /** WebDAV-Zugang: mit dem bisherigen Schlüssel lesen oder aus dem Passwort-Feld. */
  async function readConnection(
    webdavPassword?: string,
  ): Promise<WebDavConnection | undefined> {
    const old = memoryKey ?? (await deps.credentials.loadKey());
    const stored = await deps.credentials
      .loadWebDav(old?.key ?? null)
      .catch(() => null);
    if (stored) return stored;
    const parts = await deps.credentials.loadWebDavParts();
    return parts && webdavPassword
      ? { ...parts, password: webdavPassword }
      : undefined;
  }

  async function rememberKey(key: SyncKey | null, remember: boolean) {
    memoryKey = key;
    if (key) await deps.credentials.saveMeta(key.encryption);
    if (key && remember) await deps.credentials.saveKey(key);
    else await deps.credentials.clearKey();
  }

  return {
    snapshot,
    subscribe(listener: (snapshot: SyncSnapshot) => void) {
      listeners.add(listener);
      void snapshot()
        .then(listener)
        .catch(() => undefined);
      return () => void listeners.delete(listener);
    },
    inspectRemote,

    /** Passwort gegen die vorhandene Cloud-Datei prüfen (zweites Gerät). */
    async checkPassword(password: string, remote: RemoteInfo) {
      const encryption = remote.header?.encryption;
      if (encryption) await unlockSyncKey(password, encryption);
    },

    /** Beim Start der App: war der Abgleich an, geht er weiter. */
    async resume() {
      const state = await store.getState();
      if (!state.enabled) return;
      if (state.encrypted) {
        memoryKey = await deps.credentials.loadKey();
        if (!memoryKey) {
          await store.patchState({
            status: "locked",
            error: "Passwort nötig, um den Abgleich fortzusetzen.",
          });
          await emit();
          return;
        }
      }
      scheduler.start();
    },

    async enable(options: EnableOptions) {
      const remote = await inspectRemote(options.provider, options.webdav);
      const remoteEncrypted = remote.header?.encryption != null;
      const password = options.password?.trim() ?? "";
      if (remoteEncrypted && !password) {
        throw new CloudSyncError(
          "locked",
          "Die Cloud-Datei ist verschlüsselt. Bitte das Passwort eingeben.",
        );
      }
      const key = password ? await keyFor(password, remote) : null;
      const remember = options.remember ?? true;
      await rememberKey(key, remember);
      if (options.webdav) {
        await deps.credentials.saveWebDav(options.webdav, key?.key ?? null);
      }
      await store.patchState({
        enabled: true,
        provider: options.provider,
        scope: options.scope,
        deviceName: options.deviceName.trim() || "Dieses Gerät",
        encrypted: key !== null,
        status: "syncing",
        error: null,
        dirty: true,
      });
      scheduler.start();
      const result = await scheduler.syncNow().then(() => snapshot());
      return result;
    },

    /**
     * Gesperrt: Passwort eingeben (z. B. nach Neustart oder weil es auf einem
     * anderen Gerät geändert wurde). Ohne gemerkten Schlüssel liegt das
     * WebDAV-Passwort unlesbar; dann muss es mit angegeben werden.
     */
    async unlock(password: string, webdavPassword?: string) {
      const state = await store.getState();
      if (!state.provider) return;
      const meta = await deps.credentials.loadMeta();
      if (!meta) {
        throw new CloudSyncError(
          "locked",
          "Es sind keine Verschlüsselungsdaten gespeichert. Bitte den Abgleich neu einrichten.",
        );
      }
      let key: SyncKey;
      try {
        key = await unlockSyncKey(password, meta);
      } catch (error) {
        if (!(error instanceof CloudSyncError)) throw error;
        // Das Passwort wurde auf einem anderen Gerät geändert: Kopf der Datei lesen.
        const remote = await inspectRemote(
          state.provider,
          await readConnection(webdavPassword),
        ).catch(() => null);
        if (!remote?.header?.encryption) throw error;
        key = await unlockSyncKey(password, remote.header.encryption);
      }
      const connection = await readConnection(webdavPassword);
      await rememberKey(key, true);
      if (connection) await deps.credentials.saveWebDav(connection, key.key);
      await store.patchState({ status: "idle", error: null, dirty: true });
      scheduler.start();
      await scheduler.syncNow();
      await emit();
    },

    /** Passwort ändern, einschalten (`password`) oder ausschalten (`null`). */
    async setPassword(password: string | null, remember = true) {
      const state = await store.getState();
      readKey = (await currentKey(state))?.key ?? null;
      const key = password
        ? await createSyncKey(password, deps.iterations)
        : null;
      await rememberKey(key, remember);
      if (key) {
        const connection = await deps.credentials.loadWebDav(readKey);
        if (connection) await deps.credentials.saveWebDav(connection, key.key);
      } else {
        const connection = await deps.credentials.loadWebDav(readKey);
        if (connection) await deps.credentials.saveWebDav(connection, null);
      }
      await store.patchState({ encrypted: key !== null, dirty: true });
      await scheduler.syncNow();
      await emit();
    },

    async setDeviceName(name: string) {
      await store.patchState({
        deviceName: name.trim() || "Dieses Gerät",
        dirty: true,
      });
      scheduler.notifyChange();
      await emit();
    },

    syncNow: () => scheduler.syncNow(),
    /** Nach lokalen Änderungen: Entprellung starten. */
    notifyChange: () => scheduler.notifyChange(),

    async resolveConflict(id: string, action: ConflictAction) {
      await store.resolveConflict(id, action);
      scheduler.notifyChange();
      await emit();
    },
    listConflicts: store.listConflicts,
    /** Anzeigenamen von Kindern (für Hinweise im Konfliktdialog). */
    async memberNames(ids: readonly string[]) {
      const rows = await deps.database.members.bulkGet([...ids]);
      return Object.fromEntries(
        rows.flatMap((row) => (row ? [[row.id, row.displayName]] : [])),
      );
    },

    /** Ausschalten; optional auch die Cloud-Datei löschen. */
    async disable(options: { deleteRemote?: boolean } = {}) {
      const state = await store.getState();
      scheduler.stop();
      if (options.deleteRemote && state.provider) {
        const key = await currentKey(state);
        const target = await createSyncTarget(
          state.provider,
          deps.credentials,
          key?.key ?? null,
          deps.fetcher,
        );
        await target.remove(SYNC_FILE_V2);
      }
      await deps.credentials.clear();
      memoryKey = null;
      await store.patchState({
        enabled: false,
        status: "off",
        error: null,
        pending: 0,
        dirty: false,
        encrypted: false,
        lastEtag: null,
      });
      await emit();
    },

    stop: () => scheduler.stop(),
  };
}

export type SyncController = ReturnType<typeof createSyncController>;
