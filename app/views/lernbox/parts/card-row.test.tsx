import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardRow } from "./card-row";
import { Home } from "./home";
import type { LbCard, LbDeck, LernBoxScreenProps } from "./types";

const CARD: LbCard = {
  id: "card-1",
  question: "house",
  answer: "Haus",
  tag: null,
  box: 2,
  longUnpracticed: false,
  deckId: "deck-1",
  deckTitle: "Unit 1",
};

function renderRow(card: LbCard) {
  const props = { decks: [] } as unknown as LernBoxScreenProps;
  return render(
    <table>
      <tbody>
        <CardRow {...props} card={card} />
      </tbody>
    </table>,
  );
}

describe("Kennzeichnung „lange nicht geübt“ in der Kartenzeile", () => {
  it("zeigt die wirksame Box ohne Kennzeichnung bei aktiven Karten", () => {
    renderRow(CARD);
    expect(screen.getByText(/Box 2/)).toBeInTheDocument();
    expect(screen.queryByText("lange nicht geübt")).not.toBeInTheDocument();
  });

  it("zeigt die Kennzeichnung als Text, einmal je Karte", () => {
    renderRow({ ...CARD, box: 1, longUnpracticed: true });
    expect(screen.getByText(/Box 1/)).toBeInTheDocument();
    expect(screen.getAllByText("lange nicht geübt")).toHaveLength(1);
    // Kein Fehler-Alarm: weder Rolle „alert“ noch „status“.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("Zahl „lange nicht geübt“ in der Boxübersicht", () => {
  const deck = (id: string, longUnpracticed: number): LbDeck => ({
    id,
    title: id,
    folderId: null,
    total: 5,
    due: 0,
    fresh: 0,
    state: "done",
    boxes: [1, 1, 1, 1, 1],
    longUnpracticed,
    sourceLabel: "eigene",
    frontLabel: "Deutsch",
    backLabel: "Englisch",
  });

  function renderHome(decks: LbDeck[]) {
    const props = {
      decks,
      folders: [],
      dueTotal: 0,
      errorCount: 0,
      loading: false,
      notice: "",
    } as unknown as LernBoxScreenProps;
    return render(<Home {...props} />);
  }

  it("addiert die Karten über alle Stapel", () => {
    renderHome([deck("a", 1), deck("b", 2)]);
    expect(screen.getByText(/^3 lange nicht geübt/)).toBeInTheDocument();
  });

  it("zeigt nichts, wenn keine Karte lange nicht geübt ist", () => {
    renderHome([deck("a", 0)]);
    expect(screen.queryByText(/lange nicht geübt/)).not.toBeInTheDocument();
  });
});
