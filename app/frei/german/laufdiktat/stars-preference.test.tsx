import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LAUFDIKTAT_STARS_KEY, useLaufdiktatStars } from "./stars-preference";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("useLaufdiktatStars", () => {
  it("zeigt die Sterne wie bisher, solange nichts gemerkt ist", () => {
    const { result } = renderHook(() => useLaufdiktatStars());
    expect(result.current[0]).toBe(true);
  });

  it("merkt das Abschalten auf diesem Gerät und das Wiedereinschalten", () => {
    const first = renderHook(() => useLaufdiktatStars());
    act(() => first.result.current[1](false));
    expect(first.result.current[0]).toBe(false);
    expect(window.localStorage.getItem(LAUFDIKTAT_STARS_KEY)).toBe("0");
    first.unmount();

    const second = renderHook(() => useLaufdiktatStars());
    expect(second.result.current[0]).toBe(false);
    act(() => second.result.current[1](true));
    expect(second.result.current[0]).toBe(true);
    expect(window.localStorage.getItem(LAUFDIKTAT_STARS_KEY)).toBeNull();
  });

  it("bleibt bei gesperrtem Speicher an und wirft nicht", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("gesperrt");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("gesperrt");
    });
    const { result } = renderHook(() => useLaufdiktatStars());
    expect(result.current[0]).toBe(true);
    expect(() => act(() => result.current[1](false))).not.toThrow();
  });
});
