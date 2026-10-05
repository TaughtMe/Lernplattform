"use client";

import { useEffect, useState } from "react";
import {
  createSyncController,
  type SyncController,
  type SyncSnapshot,
} from "../../src/integrations/cloud-sync/controller";
import { createCredentialStore } from "../../src/integrations/cloud-sync/credentials";
import { createBrowserEnv } from "../../src/integrations/cloud-sync/scheduler";
import { watchDatabaseChanges } from "../../src/integrations/cloud-sync/watch";
import { LOCAL_DATA_AREAS } from "../../src/storage/local-data-boundaries";
import { TeacherClassDatabase } from "../../src/storage/teacher-class-settings";

let instance: SyncController | null = null;

/**
 * Der eine Abgleich dieses Browsers: Datenbank, Zugangsdaten und Zeitsteuerung
 * werden einmal angelegt und von Kopf, Einstellungen und Konfliktdialog geteilt.
 * Lokale Änderungen (auch über andere Instanzen und Tabs) stoßen die
 * Entprellung an.
 */
export function getSyncController(): SyncController {
  if (!instance) {
    const controller = createSyncController({
      database: new TeacherClassDatabase(),
      credentials: createCredentialStore(),
      env: createBrowserEnv(),
      onData: () => window.dispatchEvent(new Event("teacher-data-changed")),
    });
    watchDatabaseChanges(LOCAL_DATA_AREAS.teacher, () =>
      controller.notifyChange(),
    );
    instance = controller;
  }
  return instance;
}

/**
 * Zustand des Abgleichs; `null`, bis er gelesen ist. Startet ihn bei Bedarf.
 * Mit `active = false` (Bereich `geraete-sync` nicht freigegeben) bleibt alles
 * aus: nichts wird gelesen, nichts gestartet.
 */
export function useSyncSnapshot(active = true): {
  snapshot: SyncSnapshot | null;
  controller: SyncController | null;
} {
  const [state, setState] = useState<{
    snapshot: SyncSnapshot | null;
    controller: SyncController | null;
  }>({ snapshot: null, controller: null });
  useEffect(() => {
    if (!active) return undefined;
    const controller = getSyncController();
    void controller.resume();
    const unsubscribe = controller.subscribe((snapshot) =>
      setState({ snapshot, controller }),
    );
    return unsubscribe;
  }, [active]);
  return active ? state : { snapshot: null, controller: null };
}
