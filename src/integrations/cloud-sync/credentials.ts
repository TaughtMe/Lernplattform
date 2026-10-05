/**
 * Zugangsdaten und gemerkter Schlüssel für den automatischen Abgleich. Sie
 * müssen ein Neuladen überleben, liegen aber in einer eigenen IndexedDB, nie
 * in der Lehrer-Datenbank (die in Sicherungen und Cloud-Dateien wandert).
 *
 * Der Passwort-Schlüssel ist ein nicht exportierbarer `CryptoKey`. Ist die
 * Verschlüsselung an, liegt auch das WebDAV-Passwort nur damit verschlüsselt.
 */
import Dexie, { type Table } from "dexie";
import { decryptText, encryptText } from "../crypto/passphrase";
import type { SyncEncryption, SyncKey } from "./envelope";
import { CloudSyncError } from "./types";

export type WebDavConnection = {
  url: string;
  username: string;
  password: string;
  folder?: string;
};

type StoredWebDav = {
  url: string;
  username: string;
  folder?: string;
  password: { plain: string } | { nonce: string; ciphertext: string };
};

type Entry =
  | { id: "key"; value: SyncKey }
  | { id: "meta"; value: SyncEncryption }
  | { id: "webdav"; value: StoredWebDav };

class CredentialDatabase extends Dexie {
  entries!: Table<Entry, string>;
  constructor(name: string) {
    super(name);
    this.version(1).stores({ entries: "id" });
  }
}

export const CREDENTIAL_DATABASE = "lernraum:sync-credentials:v1";

export function createCredentialStore(name = CREDENTIAL_DATABASE) {
  const database = new CredentialDatabase(name);

  return {
    async saveKey(key: SyncKey) {
      await database.entries.put({ id: "key", value: key });
    },
    async loadKey(): Promise<SyncKey | null> {
      const entry = await database.entries.get("key");
      return entry?.id === "key" ? entry.value : null;
    },
    async clearKey() {
      await database.entries.delete("key");
    },
    /** Salz und Prüfwert (nicht geheim): damit das Passwort ohne gemerkten Schlüssel entsperren kann. */
    async saveMeta(meta: SyncEncryption) {
      await database.entries.put({ id: "meta", value: meta });
    },
    async loadMeta(): Promise<SyncEncryption | null> {
      const entry = await database.entries.get("meta");
      return entry?.id === "meta" ? entry.value : null;
    },
    /** Mit Schlüssel wird das Passwort verschlüsselt abgelegt. */
    async saveWebDav(connection: WebDavConnection, key?: CryptoKey | null) {
      const password = key
        ? await encryptText(key, connection.password)
        : { plain: connection.password };
      await database.entries.put({
        id: "webdav",
        value: {
          url: connection.url,
          username: connection.username,
          ...(connection.folder ? { folder: connection.folder } : {}),
          password,
        },
      });
    },
    async loadWebDav(key?: CryptoKey | null): Promise<WebDavConnection | null> {
      const entry = await database.entries.get("webdav");
      if (entry?.id !== "webdav") return null;
      const { password, ...rest } = entry.value;
      if ("plain" in password) return { ...rest, password: password.plain };
      if (!key) {
        throw new CloudSyncError(
          "locked",
          "Das WebDAV-Passwort ist verschlüsselt. Bitte zuerst das Abgleich-Passwort eingeben.",
        );
      }
      try {
        return {
          ...rest,
          password: await decryptText(key, password.nonce, password.ciphertext),
        };
      } catch {
        throw new CloudSyncError(
          "locked",
          "Das Abgleich-Passwort passt nicht zu den gespeicherten Zugangsdaten.",
        );
      }
    },
    /** Adresse und Benutzername (nicht geheim), auch wenn das Passwort fehlt. */
    async loadWebDavParts() {
      const entry = await database.entries.get("webdav");
      if (entry?.id !== "webdav") return null;
      const { url, username, folder } = entry.value;
      return { url, username, ...(folder ? { folder } : {}) };
    },
    async clear() {
      await database.entries.clear();
    },
    close: () => database.close(),
    delete: () => database.delete(),
  };
}

export type CredentialStore = ReturnType<typeof createCredentialStore>;
