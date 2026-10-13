import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { detectGuide, useInstallPrompt } from "./use-install-prompt";

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
  it("is unavailable in browsers that cannot install apps", () => {
    mockStandalone(false);
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
    );
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

  it("shows manual instructions on iPhone Safari", () => {
    mockStandalone(false);
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    );
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.state).toBe("manual");
    expect(result.current.guide).toBe("ios-safari");
  });

  it.each([
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) CriOS/120 Mobile/15E148",
      "ios-other",
    ],
    [
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) FxiOS/120 Mobile/15E148",
      "ios-other",
    ],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605 Version/17.0 Safari/605",
      "mac-safari",
    ],
    [
      "Mozilla/5.0 (Android 14; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0",
      "android",
    ],
    [
      "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
      null,
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537 Chrome/120 Safari/537",
      "generic",
    ],
  ])("picks a guide for %s", (userAgent, guide) => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
    expect(detectGuide()).toBe(guide);
  });

  it("is installed in standalone mode", () => {
    mockStandalone(true);
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.state).toBe("installed");
  });
});
