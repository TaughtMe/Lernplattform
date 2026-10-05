"use client";

import { useCallback, useEffect, useState } from "react";
import type { SyncConflict } from "../../src/integrations/cloud-sync/model";
import { useTick } from "../ui/cloud-badge";
import { Sheet } from "../ui/sheet";
import { SyncConflictList, type ConflictChoice } from "../ui/sync-conflicts";
import { useAreaVisible } from "../release/release-context";
import { getSyncController, useSyncSnapshot } from "./cloud-sync-client";

/** Ereignis, mit dem Symbol und Einstellungen den Dialog öffnen. */
export const OPEN_CONFLICTS_EVENT = "cloud-sync-open-conflicts";

/**
 * Konfliktdialog des Geräte-Abgleichs. Sitzt im Lehrerrahmen, damit das
 * Cloud-Symbol ihn von jeder Seite öffnen kann.
 */
export function SyncConflictsHost() {
  const { snapshot } = useSyncSnapshot(useAreaVisible("geraete-sync"));
  const [open, setOpen] = useState(false);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  const now = useTick(10_000, true);
  // Zählt hoch, wenn neu geladen werden soll (Öffnen, Entscheidung, neue Konflikte).
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    const show = () => {
      setOpen(true);
      reload();
    };
    window.addEventListener(OPEN_CONFLICTS_EVENT, show);
    return () => window.removeEventListener(OPEN_CONFLICTS_EVENT, show);
  }, [reload]);

  // Konflikte laden, solange der Dialog offen ist; auch nach jeder Runde.
  const openConflicts = snapshot?.openConflicts ?? 0;
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    void (async () => {
      const controller = getSyncController();
      const list = await controller.listConflicts();
      const members = await controller.memberNames(
        list.flatMap((conflict) => conflict.affectedMemberIds ?? []),
      );
      if (cancelled) return;
      setConflicts(list);
      setNames(members);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, openConflicts, version]);

  if (!snapshot) return null;
  const deviceNames = Object.fromEntries(
    snapshot.devices.map((device) => [device.id, device.name]),
  );

  async function resolve(conflict: SyncConflict, choice: ConflictChoice) {
    const controller = getSyncController();
    const label = `Fassung ${deviceNames[conflict.other?.device ?? ""] ?? "andere"}`;
    await controller.resolveConflict(
      conflict.id,
      choice.type === "keep-both" ? { type: "keep-both", label } : choice,
    );
    window.dispatchEvent(new Event("teacher-data-changed"));
    reload();
  }

  return (
    <Sheet
      open={open}
      title="Konflikte beim Abgleich"
      onClose={() => setOpen(false)}
    >
      <SyncConflictList
        conflicts={conflicts}
        memberNames={names}
        deviceNames={deviceNames}
        now={now}
        onResolve={(conflict, choice) => void resolve(conflict, choice)}
      />
    </Sheet>
  );
}
