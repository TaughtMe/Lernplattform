import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resolveStages, resolveVisibility } from "../../src/domain/release";
import { ReleaseProvider } from "../release/release-context";
import { PracticeOverview } from "./practice-overview";

afterEach(cleanup);

describe("PracticeOverview: Startpunkt, Training und Mein Stand", () => {
  it("verlinkt die drei Bereiche der Freigabe „diagnostik“", () => {
    render(<PracticeOverview />);
    const more = screen.getByRole("navigation", { name: "Wo stehe ich?" });
    const links = within(more).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/lernen/startpunkt",
      "/lernen/training",
      "/lernen/profil",
    ]);
    expect(
      within(more).getByRole("link", { name: /^Mein Stand/ }),
    ).toBeVisible();
    expect(screen.queryByText(/Kompetenzprofil/)).not.toBeInTheDocument();
  });

  it("blendet die Wege ohne Freigabe aus", () => {
    render(
      <ReleaseProvider
        value={resolveVisibility(resolveStages("diagnostik=vorschau"), false)}
      >
        <PracticeOverview />
      </ReleaseProvider>,
    );
    expect(
      screen.queryByRole("navigation", { name: "Wo stehe ich?" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^LernBox/ })).toBeVisible();
  });
});
