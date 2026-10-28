"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  activeMs,
  activeTimeStatus,
  reduceActiveTime,
  startActiveTime,
  type ActiveTimeEvent,
  type ActiveTimeState,
  type ActiveTimeStatus,
} from "../../src/domain/active-time";

/** Eingaben, die zeigen, dass jemand am Gerät ist. */
const INPUT_EVENTS = ["pointerdown", "keydown", "touchstart", "input"] as const;

/**
 * Misst aktive Zeit (D2-5) mit der reinen Funktion aus `active-time`. Der Hook
 * bindet nur Seitensichtbarkeit, Eingaben und einen Takt an; die Uhr ist
 * einspeisbar (`now`), damit Tests sie fälschen können.
 *
 * `running = false` pausiert wie eine verdeckte Seite (z. B. im Abschluss).
 * Beim Zurückkommen läuft die Uhr weiter; verworfen wird nur Zeit.
 */
export function useActiveTime({
  running = true,
  now = Date.now,
  tickMs = 1000,
}: {
  running?: boolean;
  now?: () => number;
  tickMs?: number;
} = {}): {
  activeMs: number;
  status: ActiveTimeStatus;
  /** Beginnt eine neue Messung (neue Sitzung). */
  restart: () => void;
} {
  const nowRef = useRef(now);
  useEffect(() => {
    nowRef.current = now;
  }, [now]);

  const stateRef = useRef<ActiveTimeState | null>(null);
  const [snapshot, setSnapshot] = useState<{
    activeMs: number;
    status: ActiveTimeStatus;
  }>({ activeMs: 0, status: "running" });

  const publish = useCallback((state: ActiveTimeState) => {
    stateRef.current = state;
    setSnapshot((current) => {
      const next = {
        activeMs: activeMs(state),
        status: activeTimeStatus(state),
      };
      return current.activeMs === next.activeMs &&
        current.status === next.status
        ? current
        : next;
    });
  }, []);

  const dispatch = useCallback(
    (type: ActiveTimeEvent["type"]) => {
      const at = nowRef.current();
      publish(
        reduceActiveTime(stateRef.current ?? startActiveTime(at), {
          type,
          at,
        }),
      );
    },
    [publish],
  );

  const restart = useCallback(() => {
    publish(startActiveTime(nowRef.current()));
  }, [publish]);

  useEffect(() => {
    if (stateRef.current === null) restart();
  }, [restart]);

  useEffect(() => {
    if (!running) {
      dispatch("hidden");
      return;
    }
    // Zurück aus der Pause oder von Anfang an sichtbar.
    dispatch(document.visibilityState === "hidden" ? "hidden" : "visible");
    const onVisibility = () =>
      dispatch(document.visibilityState === "hidden" ? "hidden" : "visible");
    const onInput = () => dispatch("input");
    document.addEventListener("visibilitychange", onVisibility);
    for (const name of INPUT_EVENTS) {
      document.addEventListener(name, onInput, { passive: true });
    }
    const timer = window.setInterval(() => dispatch("tick"), tickMs);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      for (const name of INPUT_EVENTS) {
        document.removeEventListener(name, onInput);
      }
      window.clearInterval(timer);
    };
  }, [running, tickMs, dispatch]);

  return { ...snapshot, restart };
}
