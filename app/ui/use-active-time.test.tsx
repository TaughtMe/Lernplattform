import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useActiveTime } from "./use-active-time";

let clock = 0;
const now = () => clock;

function advance(ms: number) {
  clock += ms;
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  clock = 1_000_000;
  setVisibility("visible");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useActiveTime", () => {
  it("zählt Sekunden mit, solange Eingaben kommen", () => {
    const { result } = renderHook(() => useActiveTime({ now }));
    advance(10_000);
    act(() => {
      document.dispatchEvent(new Event("keydown"));
    });
    advance(5_000);
    expect(result.current.activeMs).toBe(15_000);
    expect(result.current.status).toBe("running");
  });

  it("pausiert nach 3 Minuten ohne Eingabe und zählt diese Zeit nicht", () => {
    const { result } = renderHook(() => useActiveTime({ now }));
    advance(20_000);
    act(() => {
      document.dispatchEvent(new Event("pointerdown"));
    });
    advance(3 * 60_000 + 1_000);
    expect(result.current.status).toBe("idle");
    expect(result.current.activeMs).toBe(20_000);
    act(() => {
      document.dispatchEvent(new Event("pointerdown"));
    });
    expect(result.current.status).toBe("running");
    advance(5_000);
    expect(result.current.activeMs).toBe(25_000);
  });

  it("pausiert sofort, wenn die Seite verdeckt wird, und läuft danach weiter", () => {
    const { result } = renderHook(() => useActiveTime({ now }));
    advance(10_000);
    setVisibility("hidden");
    expect(result.current.status).toBe("hidden");
    advance(60_000);
    expect(result.current.activeMs).toBe(10_000);
    setVisibility("visible");
    advance(4_000);
    expect(result.current.activeMs).toBe(14_000);
    expect(result.current.status).toBe("running");
  });

  it("pausiert mit running = false und läuft beim Zurückkommen weiter", () => {
    const { result, rerender } = renderHook(
      ({ running }) => useActiveTime({ now, running }),
      { initialProps: { running: true } },
    );
    advance(8_000);
    rerender({ running: false });
    advance(30_000);
    expect(result.current.activeMs).toBe(8_000);
    rerender({ running: true });
    advance(2_000);
    expect(result.current.activeMs).toBe(10_000);
  });

  it("beginnt mit restart() eine neue Messung", () => {
    const { result } = renderHook(() => useActiveTime({ now }));
    advance(12_000);
    expect(result.current.activeMs).toBe(12_000);
    act(() => result.current.restart());
    expect(result.current.activeMs).toBe(0);
    advance(3_000);
    expect(result.current.activeMs).toBe(3_000);
  });

  it("räumt Zuhörer und Takt beim Entfernen auf", () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useActiveTime({ now }));
    unmount();
    expect(remove).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
    expect(vi.getTimerCount()).toBe(0);
  });
});
