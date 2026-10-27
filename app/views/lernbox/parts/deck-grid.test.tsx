import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeckGrid } from "./deck-grid";
import type { LbDeck } from "./types";

function deck(overrides: Partial<LbDeck>): LbDeck {
  return {
    id: "stapel",
    title: "Englisch Tiere",
    folderId: null,
    total: 6,
    due: 0,
    fresh: 0,
    state: "done",
    boxes: [0, 0, 0, 0, 0],
    longUnpracticed: 0,
    sourceLabel: "eigene",
    frontLabel: "Deutsch",
    backLabel: "Englisch",
    ...overrides,
  };
}

function renderDeck(overrides: Partial<LbDeck>) {
  render(<DeckGrid decks={[deck(overrides)]} onStart={() => undefined} />);
}

describe("DeckGrid: Stand des Stapels", () => {
  it("nennt einen Stapel mit nie geübten Karten „neu“ und nie „erledigt“", () => {
    renderDeck({ state: "new", fresh: 6, boxes: [6, 0, 0, 0, 0] });
    expect(screen.getByText("6 neu")).toBeVisible();
    expect(screen.queryByText("erledigt")).not.toBeInTheDocument();
  });

  it("nennt fällige Karten „heute“", () => {
    renderDeck({ state: "due", due: 2, fresh: 1 });
    expect(screen.getByText("2 heute")).toBeVisible();
    expect(screen.queryByText(/neu|erledigt/)).not.toBeInTheDocument();
  });

  it("sagt „erledigt“ nur, wenn nichts fällig und nichts neu ist", () => {
    renderDeck({ state: "done" });
    expect(screen.getByText("erledigt")).toBeVisible();
  });

  it("zeigt bei einem leeren Stapel keine Angabe", () => {
    renderDeck({ total: 0 });
    expect(screen.queryByText(/erledigt|neu|heute/)).not.toBeInTheDocument();
  });
});
