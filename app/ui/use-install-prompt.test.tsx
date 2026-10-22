import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  detectGuide,
  isIosDevice,
  isStandaloneDisplay,
  useInstallPrompt,
} from "./use-install-prompt";

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

describe("Geräteerkennung mit eingespeisten Werten", () => {
  const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)";
  const MAC_SAFARI =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605 Version/17.0 Safari/605";

  it.each([
    ["iPhone", IPHONE, "iPhone", 5, true],
    [
      "iPad mit iPad-Kennung",
      "Mozilla/5.0 (iPad; CPU OS 17_0)",
      "iPad",
      5,
      true,
    ],
    // iPadOS gibt sich als Mac aus, hat aber Touch.
    ["iPadOS mit Desktop-Kennung", MAC_SAFARI, "MacIntel", 5, true],
    ["Mac ohne Touch", MAC_SAFARI, "MacIntel", 0, false],
    ["Mac mit einem Touchpunkt", MAC_SAFARI, "MacIntel", 1, false],
    ["Android", "Mozilla/5.0 (Linux; Android 14)", "Linux armv81", 5, false],
  ])("%s", (_name, userAgent, platform, maxTouchPoints, expected) => {
    expect(isIosDevice({ userAgent, platform, maxTouchPoints })).toBe(expected);
  });

  it("wählt für iPadOS mit Desktop-Kennung die Safari-Anleitung für iOS", () => {
    expect(
      detectGuide({
        userAgent: MAC_SAFARI,
        platform: "MacIntel",
        maxTouchPoints: 5,
      }),
    ).toBe("ios-safari");
    expect(
      detectGuide({
        userAgent: MAC_SAFARI,
        platform: "MacIntel",
        maxTouchPoints: 0,
      }),
    ).toBe("mac-safari");
  });

  it("erkennt die installierte App an Anzeigemodus oder navigator.standalone", () => {
    expect(isStandaloneDisplay({ displayModeStandalone: false })).toBe(false);
    expect(
      isStandaloneDisplay({
        displayModeStandalone: false,
        navigatorStandalone: false,
      }),
    ).toBe(false);
    expect(isStandaloneDisplay({ displayModeStandalone: true })).toBe(true);
    expect(
      isStandaloneDisplay({
        displayModeStandalone: false,
        navigatorStandalone: true,
      }),
    ).toBe(true);
  });
});
