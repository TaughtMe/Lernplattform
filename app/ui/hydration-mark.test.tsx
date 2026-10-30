import { readFileSync } from "node:fs";
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hydrationBootScript } from "./hydration-boot";
import { HydrationMark } from "./hydration-mark";

function beforeInput(target: Element) {
  const event = new Event("beforeinput", { bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}

beforeEach(() => {
  document.documentElement.removeAttribute("data-app-hydrated");
  document.body.setAttribute("aria-busy", "true");
});

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-app-hydrated");
  document.body.removeAttribute("aria-busy");
});

describe("HydrationMark", () => {
  it("setzt data-app-hydrated und nimmt aria-busy zurück, sobald React übernommen hat", async () => {
    render(<HydrationMark />);
    await waitFor(() =>
      expect(document.documentElement).toHaveAttribute("data-app-hydrated"),
    );
    expect(document.body).not.toHaveAttribute("aria-busy");
  });
});

describe("Eingabesperre vor der Hydration", () => {
  // Das Skript steht im Server-Render inline im <head>; hier wird es gleich
  // ausgeführt und danach wieder entfernt.
  it("sperrt Eingaben in Textfelder, bis data-app-hydrated gesetzt ist", () => {
    new Function(hydrationBootScript)();
    const input = document.createElement("input");
    const area = document.createElement("textarea");
    const button = document.createElement("button");
    document.body.append(input, area, button);

    expect(beforeInput(input)).toBe(true);
    expect(beforeInput(area)).toBe(true);
    // Andere Elemente bleiben unberührt (Knöpfe sperrt allein das CSS).
    expect(beforeInput(button)).toBe(false);

    document.documentElement.setAttribute("data-app-hydrated", "");
    expect(beforeInput(input)).toBe(false);
    expect(beforeInput(area)).toBe(false);
  });
});

describe("base.css", () => {
  const css = readFileSync("app/ui/base.css", "utf8");

  it("sperrt Knöpfe und Felder nur ohne data-app-hydrated und lässt Links frei", () => {
    const rule = css.match(
      /html:not\(\[data-app-hydrated\]\)\s*:where\(([^)]*)\)\s*\{([^}]*)\}/,
    );
    expect(rule).not.toBeNull();
    expect(rule?.[1]).toContain("button");
    expect(rule?.[1]).toContain("textarea");
    expect(rule?.[1]).not.toMatch(/\ba\b/);
    expect(rule?.[2]).toContain("pointer-events: none");
  });

  it("verändert den hydrierten Zustand nicht", () => {
    // Die Dämpfung hängt allein an html:not([data-app-hydrated]); keine Regel ohne
    // diese Bedingung nutzt die Animation.
    expect(css.match(/lr-hydration-wait/g)).toHaveLength(2);
  });
});
