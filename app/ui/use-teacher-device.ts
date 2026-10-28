"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  parseTeacherDevice,
  subscribeTeacherDevice,
  teacherDeviceSnapshot,
  type TeacherDeviceState,
} from "../../src/storage/teacher-device";
import { useAreaVisible } from "../release/release-context";

const serverSnapshot = () => null;

/** Gewählter Gerätetyp dieses Geräts; auf dem Server und vor der Wahl null. */
export function useTeacherDevice(): TeacherDeviceState | null {
  const raw = useSyncExternalStore(
    subscribeTeacherDevice,
    () => teacherDeviceSnapshot(),
    serverSnapshot,
  );
  return useMemo(() => parseTeacherDevice(raw), [raw]);
}

/**
 * Ist dieses Gerät eine Tafel (Regel D3-2)? Nur, solange der Bereich
 * `lehrer-geraet` freigegeben ist; sonst gilt jedes Gerät als eigenes.
 */
export function useIsBoardDevice(): boolean {
  const active = useAreaVisible("lehrer-geraet");
  const device = useTeacherDevice();
  return active && device?.type === "board";
}
