import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TEXTBOX_LAYOUT_KEY, useTextboxLayout } from "./use-textbox-layout";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("useTextboxLayout", () => {
  it("startet mit dem Heft", () => {
    const { result } = renderHook(() => useTextboxLayout());
    expect(result.current[0]).toBe("heft");
  });

  it("speichert die Wahl und übernimmt sie nach dem Neuladen", () => {
    const first = renderHook(() => useTextboxLayout());
    act(() => first.result.current[1]("vollbild"));
    expect(first.result.current[0]).toBe("vollbild");
    expect(window.localStorage.getItem(TEXTBOX_LAYOUT_KEY)).toBe("vollbild");
    first.unmount();
    const second = renderHook(() => useTextboxLayout());
    expect(second.result.current[0]).toBe("vollbild");
  });

  it("ignoriert unbekannte Werte", () => {
    window.localStorage.setItem(TEXTBOX_LAYOUT_KEY, "quatsch");
    const { result } = renderHook(() => useTextboxLayout());
    expect(result.current[0]).toBe("heft");
  });

  it("bleibt ohne Speicher benutzbar", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("gesperrt");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("gesperrt");
    });
    const { result } = renderHook(() => useTextboxLayout());
    expect(result.current[0]).toBe("heft");
    act(() => result.current[1]("vollbild"));
    expect(result.current[0]).toBe("vollbild");
  });
});
