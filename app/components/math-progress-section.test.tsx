import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type {
  CompetenceEntry,
  CompetenceProfile,
} from "../../src/domain/competence-profile";
import { resolveStages, resolveVisibility } from "../../src/domain/release";
import { ReleaseProvider } from "../release/release-context";
import { MathProgressSection } from "./math-progress-section";

const entry: CompetenceEntry = {
  id: "rechenart:multiply:normal:reihe-7",
  kind: "rechenart",
  module: "mathematics",
  label: "Mal: Reihe 7",
  route: "/frei/mathematics",
  level: "sicher",
  reason: { code: "safe" },
  objects: 14,
  started: 14,
  safe: 12,
  needed: 5,
  open: 0,
  cleanDays: 3,
};

const profile = (entries: CompetenceEntry[]): CompetenceProfile => ({
  entries,
  objectAreas: new Map(),
});

function setup(load: () => Promise<CompetenceProfile>, stages = "mathe=frei") {
  return render(
    <ReleaseProvider value={resolveVisibility(resolveStages(stages), false)}>
      <MathProgressSection load={load} />
    </ReleaseProvider>,
  );
}

describe("MathProgressSection", () => {
  it("zeigt je Familie, was schon geht, mit Üben-Verweis", async () => {
    setup(async () => profile([entry]));
    expect(await screen.findByText("Mal: Reihe 7")).toBeInTheDocument();
    expect(
      screen.getByText(
        "12 Aufgaben richtig gerechnet · an 3 Tagen ohne Hilfe richtig",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("sicher")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Mal: Reihe 7 üben" }),
    ).toHaveAttribute("href", "/frei/mathematics");
    expect(document.body.textContent).not.toMatch(/%/);
  });

  it("zeigt ohne Übung einen leeren Zustand", async () => {
    setup(async () => profile([]));
    expect(
      await screen.findByText("Noch nichts gerechnet"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Kopfrechnen üben" }),
    ).toHaveAttribute("href", "/frei/mathematics");
  });

  it("meldet einen Ladefehler, ohne ihn als leer zu zeigen", async () => {
    setup(async () => {
      throw new Error("kaputt");
    });
    expect(
      await screen.findByText(/gerade nicht verfügbar/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Noch nichts gerechnet")).not.toBeInTheDocument();
  });

  it("bleibt unsichtbar, wenn Mathe nicht freigegeben ist", () => {
    const { container } = setup(async () => profile([entry]), "mathe=aus");
    expect(container).toBeEmptyDOMElement();
  });
});
