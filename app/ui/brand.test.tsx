import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  BRAND_DOTS_MIN_HEIGHT,
  BrandLogo,
  BrandSymbol,
  brandAsset,
} from "./brand";

describe("brandAsset", () => {
  it("nimmt unter 32 px die Kleinvariante ohne Punkte", () => {
    expect(brandAsset("symbol", BRAND_DOTS_MIN_HEIGHT - 1).src).toBe(
      "/brand/symbol-small.svg",
    );
    expect(brandAsset("lockup", 28).src).toBe(
      "/brand/logo-horizontal-small.svg",
    );
  });

  it("nimmt ab 32 px die Variante mit Punkten", () => {
    expect(brandAsset("symbol", BRAND_DOTS_MIN_HEIGHT).src).toBe(
      "/brand/mark.svg",
    );
    expect(brandAsset("lockup", 48).src).toBe("/brand/logo-horizontal.svg");
  });

  it("wählt auf dunklem Grund die helle Ausführung", () => {
    expect(brandAsset("symbol", 24, true).src).toBe(
      "/brand/symbol-small-reversed.svg",
    );
    expect(brandAsset("symbol", 64, true).src).toBe("/brand/mark-reversed.svg");
    expect(brandAsset("lockup", 24, true).src).toBe(
      "/brand/logo-horizontal-small-reversed.svg",
    );
    expect(brandAsset("lockup", 64, true).src).toBe(
      "/brand/logo-horizontal-reversed.svg",
    );
  });
});

describe("Brand-Komponenten", () => {
  it("schmückt ohne Alternativtext und wird dann versteckt", () => {
    const { container } = render(<BrandSymbol height={28} />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("aria-hidden", "true");
    expect(img).toHaveAttribute("height", "28");
  });

  it("zeigt das Logo mit Alternativtext", () => {
    render(<BrandLogo height={40} label="Lernraum" />);
    const img = screen.getByRole("img", { name: "Lernraum" });
    expect(img).toHaveAttribute("src", "/brand/logo-horizontal.svg");
  });
});
