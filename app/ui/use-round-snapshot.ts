"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type * as z from "zod";
import {
  buildRoundSnapshot,
  parseRoundSnapshot,
  type RoundSnapshot,
  type RoundSnapshotModule,
} from "../../src/domain/round-snapshot";
import {
  clearRoundSnapshot,
  readRoundSnapshotRaw,
  saveRoundSnapshot,
} from "../../src/storage/round-snapshot";

const CHANGE_EVENT = "lernraum-round-snapshot-change";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  // Eine andere Registerkarte kann den Zwischenstand ändern oder verwerfen.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Prüft den rohen Eintrag; der Ablauf zählt ab dem Moment des Lesens. */
function readSnapshot<State>(
  raw: string | null,
  module: RoundSnapshotModule,
  schema: z.ZodType<State>,
): RoundSnapshot<State> | null {
  return parseRoundSnapshot(raw, { module, now: new Date(), state: schema });
}

export type RoundSnapshotInput<State> = {
  roundId: string;
  startedAt: string;
  done: number;
  total: number;
  state: State;
};

/**
 * Zwischenstand der laufenden Runde eines Moduls (Befund C-001). `snapshot` ist
 * der gespeicherte Stand, der beim nächsten Öffnen als „Weitermachen“ angeboten
 * wird (auf dem Server und vor der Hydration `null`). `save` und `clear` halten
 * ihn aktuell; ohne Speicher passiert nichts.
 */
export function useRoundSnapshot<State>(
  module: RoundSnapshotModule,
  schema: z.ZodType<State>,
) {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRoundSnapshotRaw(module),
    () => null,
  );
  const snapshot = useMemo(
    () => readSnapshot(raw, module, schema),
    [raw, module, schema],
  );

  const save = useCallback(
    (input: RoundSnapshotInput<State>) => {
      saveRoundSnapshot(
        buildRoundSnapshot({ module, now: new Date(), ...input }),
      );
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [module],
  );
  const clear = useCallback(() => {
    clearRoundSnapshot(module);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, [module]);

  return { snapshot, save, clear };
}
