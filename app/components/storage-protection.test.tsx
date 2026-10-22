import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InstallStorageHint } from "./storage-protection";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, "matchMedia");
});

describe("InstallStorageHint (Einstellungen)", () => {
  it("weist auf iPad im Browser dezent auf den getrennten Speicher hin", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
    );
    render(<InstallStorageHint />);
    expect(await screen.findByTestId("install-storage-hint")).toHaveTextContent(
      "Die App auf dem Home-Bildschirm hat einen eigenen Speicher",
    );
  });

  it("schweigt in der installierten App", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
    );
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    render(<InstallStorageHint />);
    expect(
      screen.queryByTestId("install-storage-hint"),
    ).not.toBeInTheDocument();
  });

  it("schweigt auf anderen Geräten", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537 Chrome/120 Safari/537",
    );
    render(<InstallStorageHint />);
    expect(
      screen.queryByTestId("install-storage-hint"),
    ).not.toBeInTheDocument();
  });
});
