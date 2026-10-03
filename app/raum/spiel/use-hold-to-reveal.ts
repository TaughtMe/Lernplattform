"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
  anyRevealKeyHeld,
  EMPTY_HOLD,
  holdReducer,
  isHolding,
  isRevealKey,
  type HoldAction,
  type HoldState,
} from "../../../src/domain/hold-to-reveal";

type Options = {
  /** Aus (z. B. beim Laden oder nach richtiger Antwort): nichts deckt auf. */
  enabled: boolean;
  /** Im Schreibzustand löst A + L nicht aus, solange der Fokus im Feld liegt. */
  phase: "wait" | "read" | "write";
  onReveal: () => void;
  onRelease: () => void;
};

function isTextField(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLInputElement ||
    target.isContentEditable
  );
}

/**
 * Eine Quelle für „Wort zeigen“ und „Wort verdecken“: zwei Finger auf der
 * Spielfläche oder die Tasten A und L. Die Maus deckt nicht auf. Der Hook
 * kennt weder Spielstand noch Spicker; er meldet nur den Übergang.
 */
export function useHoldToReveal(
  surfaceRef: RefObject<HTMLElement | null>,
  options: Options,
) {
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });
  const state = useRef<HoldState>(EMPTY_HOLD);
  const { enabled } = options;

  useEffect(() => {
    const surface = surfaceRef.current;
    state.current = EMPTY_HOLD;
    if (!enabled || !surface) return;

    function apply(action: HoldAction) {
      const before = isHolding(state.current);
      state.current = holdReducer(state.current, action);
      const after = isHolding(state.current);
      if (!before && after) latest.current.onReveal();
      if (before && !after) latest.current.onRelease();
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse") return;
      apply({
        type: "pointerdown",
        id: event.pointerId,
        pointerType: event.pointerType,
      });
      if (state.current.contacts.length < 2) return;
      // Ab jetzt landen Loslassen und Abbruch an der Spielfläche, auch wenn das
      // berührte Element beim Aufdecken aus dem DOM verschwindet.
      for (const id of state.current.contacts) {
        try {
          surface?.setPointerCapture?.(id);
        } catch {
          // Kontakt ist schon beendet.
        }
      }
    }
    function onPointerEnd(event: PointerEvent) {
      apply({ type: "pointerup", id: event.pointerId });
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!isRevealKey(event.code)) return;
      const held = state.current.keys.includes(event.code);
      if (event.repeat || held) {
        // Wiederholung einer noch gehaltenen Taste: nichts tippen, nichts scrollen.
        if (held) event.preventDefault();
        return;
      }
      // Normales Tippen („alle“, „Ball“) im Antwortfeld deckt nie auf.
      if (latest.current.phase === "write" && isTextField(event.target)) return;
      const modified = event.ctrlKey || event.altKey || event.metaKey;
      if (modified) return;
      event.preventDefault();
      apply({ type: "keydown", code: event.code });
    }
    function onKeyUp(event: KeyboardEvent) {
      if (!isRevealKey(event.code)) return;
      if (state.current.keys.includes(event.code)) event.preventDefault();
      apply({ type: "keyup", code: event.code });
    }
    // Nur WebKit (iOS): Pinch-Zoom zusätzlich zu touch-action abfangen.
    function onGesture(event: Event) {
      event.preventDefault();
    }
    function onBlur() {
      apply({ type: "blur" });
    }
    function onVisibility() {
      if (document.hidden) apply({ type: "blur" });
    }

    surface.addEventListener("pointerdown", onPointerDown, true);
    surface.addEventListener("pointerup", onPointerEnd, true);
    surface.addEventListener("pointercancel", onPointerEnd, true);
    surface.addEventListener("lostpointercapture", onPointerEnd, true);
    surface.addEventListener("gesturestart", onGesture, { passive: false });
    surface.addEventListener("gesturechange", onGesture, { passive: false });
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      surface.removeEventListener("pointerdown", onPointerDown, true);
      surface.removeEventListener("pointerup", onPointerEnd, true);
      surface.removeEventListener("pointercancel", onPointerEnd, true);
      surface.removeEventListener("lostpointercapture", onPointerEnd, true);
      surface.removeEventListener("gesturestart", onGesture);
      surface.removeEventListener("gesturechange", onGesture);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, surfaceRef]);

  return {
    /** Noch eine der Tasten A/L gedrückt: Antwortfeld noch nicht fokussieren. */
    keysHeld: () => anyRevealKeyHeld(state.current),
  };
}
