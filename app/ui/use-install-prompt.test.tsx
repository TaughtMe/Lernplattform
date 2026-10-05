import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useInstallPrompt } from "./use-install-prompt";

function mockStandalone(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

afterEach(() => {
  window.__installPrompt = undefined;
  vi.restoreAllMocks();
});

describe("useInstallPrompt", () => {
  it("is unavailable without an install prompt", () => {
    mockStandalone(false);
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.state).toBe("unavailable");
  });

  it("becomes available after beforeinstallprompt and installs on click", async () => {
    mockStandalone(false);
    const { result } = renderHook(() => useInstallPrompt());
    const prompt = vi.fn().mockResolvedValue(undefined);
    window.__installPrompt = Object.assign(new Event("beforeinstallprompt"), {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    });
    act(() => window.dispatchEvent(new Event("lernraum-install-ready")));
    expect(result.current.state).toBe("available");

    await act(() => result.current.install());
    expect(prompt).toHaveBeenCalledOnce();
    expect(result.current.state).toBe("installed");
  });

  it("shows iOS instructions on iPhone Safari", () => {
    mockStandalone(false);
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    );
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.state).toBe("ios");
  });

  it("is installed in standalone mode", () => {
    mockStandalone(true);
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.state).toBe("installed");
  });
});
