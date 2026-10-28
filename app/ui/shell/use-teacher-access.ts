"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  isAreaBlockedOnDevice,
  isAreaPinProtected,
  type TeacherDeviceArea,
  type TeacherDeviceType,
} from "../../../src/domain/teacher-device";
import { isLocked } from "../../../src/domain/teacher-lock";
import {
  lockSessionSnapshot,
  parsePinVerifier,
  pinVerifierSnapshot,
  subscribeLockSession,
  subscribePinVerifier,
  touchLockSession,
} from "../../../src/storage/teacher-lock";
import { useAreaVisible } from "../../release/release-context";
import { useTeacherDevice } from "../use-teacher-device";

/**
 * Was der Lehrerbereich auf diesem Gerät gerade zeigt (Regeln D3-1, D3-2,
 * D3-4): die Seite selbst, die Wahl des Gerätetyps, den Sperrblock der Tafel
 * oder die PIN-Abfrage. `loading` gilt nur kurz vor dem Hydrieren; der Server
 * kennt den Gerätetyp nicht.
 */
export type TeacherAccessPhase =
  "open" | "loading" | "choose" | "board-block" | "locked";

export type TeacherAccess = {
  phase: TeacherAccessPhase;
  device: TeacherDeviceType | null;
  pinSet: boolean;
  /** Klassen und andere Personenbereiche in Navigation und Leiste ausblenden. */
  hidePersonal: boolean;
};

const OPEN: TeacherAccess = {
  phase: "open",
  device: null,
  pinSet: false,
  hidePersonal: false,
};

const never = () => () => undefined;
const serverSnapshot = () => null;
/** So oft wird die Sperre neu bewertet; die Uhr ist injizierbar. */
const CHECK_INTERVAL_MS = 5_000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "wheel"];

export function useTeacherAccess(
  area: TeacherDeviceArea,
  clock: () => number = Date.now,
): TeacherAccess {
  const active = useAreaVisible("lehrer-geraet");
  const hydrated = useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
  const state = useTeacherDevice();
  const device = state?.type ?? null;
  const rawPin = useSyncExternalStore(
    subscribePinVerifier,
    () => pinVerifierSnapshot(),
    serverSnapshot,
  );
  const pinSet = useMemo(() => parsePinVerifier(rawPin) !== null, [rawPin]);
  const session = useSyncExternalStore(
    subscribeLockSession,
    lockSessionSnapshot,
    lockSessionSnapshot,
  );
  const [now, setNow] = useState(clock);
  const lockActive = active && device === "own" && pinSet;

  useEffect(() => {
    if (!lockActive) return undefined;
    const refresh = () => setNow(clock());
    const touch = () => touchLockSession(clock());
    refresh();
    const timer = window.setInterval(refresh, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", refresh);
    for (const name of ACTIVITY_EVENTS) {
      window.addEventListener(name, touch, { passive: true });
    }
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      for (const name of ACTIVITY_EVENTS)
        window.removeEventListener(name, touch);
    };
  }, [lockActive, clock]);

  if (!active) return OPEN;
  if (!hydrated) return { ...OPEN, phase: "loading" };
  if (device === null) {
    return { phase: "choose", device, pinSet, hidePersonal: true };
  }
  // Die Entsperrung zählt immer als „jetzt oder später“ (träge Uhrwerte).
  const current = Math.max(now, session.unlockedAt ?? 0);
  const locked =
    lockActive && isLocked({ pinSet: true, ...session, now: current });
  const blocked = isAreaBlockedOnDevice(device, area);
  const phase: TeacherAccessPhase = blocked
    ? "board-block"
    : locked && isAreaPinProtected(area)
      ? "locked"
      : "open";
  return {
    phase,
    device,
    pinSet,
    hidePersonal: device === "board" || locked,
  };
}
