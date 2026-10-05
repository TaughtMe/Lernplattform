/**
 * Lokale Änderungen der Lehrer-Datenbank bemerken, auch wenn sie über eine
 * andere Dexie-Instanz oder einen anderen Tab geschehen (Repositorys legen
 * ihre eigene Instanz an). Dexie meldet dazu `storagemutated`. Stempel und
 * Abgleichzustand zählen nicht, sonst würde jede Runde die nächste auslösen.
 */
import Dexie from "dexie";

const INTERNAL = new Set([
  "syncStamps",
  "tombstones",
  "syncConflicts",
  "syncState",
]);

/** Gibt die Abmeldung zurück. */
export function watchDatabaseChanges(
  databaseName: string,
  onChange: () => void,
): () => void {
  const handler = (parts: Record<string, unknown>) => {
    const prefix = `idb://${databaseName}/`;
    for (const key of Object.keys(parts)) {
      if (!key.startsWith(prefix)) continue;
      const table = key.slice(prefix.length).split("/")[0] ?? "";
      if (!INTERNAL.has(table)) {
        onChange();
        return;
      }
    }
  };
  const events = Dexie.on as unknown as {
    (name: "storagemutated", fn: typeof handler): void;
    (name: "storagemutated"): { unsubscribe(fn: typeof handler): void };
  };
  events("storagemutated", handler);
  return () => {
    (
      Dexie.on as unknown as {
        storagemutated: { unsubscribe: (fn: typeof handler) => void };
      }
    ).storagemutated.unsubscribe(handler);
  };
}
