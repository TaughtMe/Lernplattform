import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StudentFrame } from "./student-frame";

const items = [
  { href: "/lernen", label: "Lernen", icon: "learn", active: true },
] as const;

function renderFrame(hideNav: boolean | "mobile") {
  render(
    <StudentFrame items={items} profileHref="/profil" hideNav={hideNav}>
      <p>Inhalt</p>
    </StudentFrame>,
  );
  return screen.getByText("Inhalt").closest("[class*='layout']")!;
}

describe("StudentFrame", () => {
  it("lässt die Navigation im Baum, wenn sie nur mobil ausgeblendet wird", () => {
    const layout = renderFrame("mobile");
    expect(layout.className).toMatch(/navHiddenMobile/);
    const nav = screen.getByRole("navigation", { name: "Hauptnavigation" });
    expect(nav).not.toHaveAttribute("hidden");
  });

  it("blendet die Navigation bei „true“ ganz aus", () => {
    const layout = renderFrame(true);
    expect(layout.className).toMatch(/noNav/);
    expect(layout.className).not.toMatch(/navHiddenMobile/);
    expect(document.querySelector("nav")).toHaveAttribute("hidden");
  });

  it("zeigt die Navigation ohne Vollbild", () => {
    const layout = renderFrame(false);
    expect(layout.className).not.toMatch(/noNav|navHiddenMobile/);
    expect(
      screen.getByRole("navigation", { name: "Hauptnavigation" }),
    ).toBeVisible();
  });
});
