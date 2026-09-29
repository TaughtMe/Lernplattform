import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeButton } from "./theme-button";

const mediaListeners = new Set<() => void>();

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addEventListener: (_type: string, listener: () => void) =>
        mediaListeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) =>
        mediaListeners.delete(listener),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  mediaListeners.clear();
});

describe("ThemeButton", () => {
  it("cycles through system, light and dark and stores the preference", async () => {
    const user = userEvent.setup();
    render(<ThemeButton />);

    const toggle = screen.getByRole("button", {
      name: "Darstellung wechseln, aktuell System",
    });
    expect(document.documentElement).toHaveAttribute("data-theme", "light");

    await user.click(toggle);
    expect(window.localStorage.getItem("theme-preference")).toBe("light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");

    await user.click(
      screen.getByRole("button", {
        name: "Darstellung wechseln, aktuell Hell",
      }),
    );
    expect(window.localStorage.getItem("theme-preference")).toBe("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("loads a saved dark preference", async () => {
    window.localStorage.setItem("theme-preference", "dark");
    render(<ThemeButton />);

    expect(
      await screen.findByRole("button", {
        name: "Darstellung wechseln, aktuell Dunkel",
      }),
    ).toBeVisible();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });
});
