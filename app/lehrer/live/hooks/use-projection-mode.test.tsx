import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PROJECTION_MODE_KEY, useProjectionMode } from "./use-projection-mode";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("useProjectionMode", () => {
  it("ist ohne gemerkten Wert aus", () => {
    const { result } = renderHook(() => useProjectionMode());
    expect(result.current[0]).toBe(false);
  });

  it("merkt den Schalter auf diesem Gerät", () => {
    const first = renderHook(() => useProjectionMode());
    act(() => first.result.current[1](true));
    expect(first.result.current[0]).toBe(true);
    expect(window.localStorage.getItem(PROJECTION_MODE_KEY)).toBe("1");
    first.unmount();

    const second = renderHook(() => useProjectionMode());
    expect(second.result.current[0]).toBe(true);
    act(() => second.result.current[1](false));
    expect(second.result.current[0]).toBe(false);
    expect(window.localStorage.getItem(PROJECTION_MODE_KEY)).toBeNull();
  });

  it("bleibt bei gesperrtem Speicher aus und wirft nicht", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("gesperrt");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("gesperrt");
    });
    const { result } = renderHook(() => useProjectionMode());
    expect(result.current[0]).toBe(false);
    expect(() => act(() => result.current[1](true))).not.toThrow();
  });
});
