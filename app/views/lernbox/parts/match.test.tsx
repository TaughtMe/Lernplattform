import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  MatchRound,
  MatchTile,
} from "../../../../src/domain/learning-box-forms";
import { Match } from "./match";
import type { LbMatch, LernBoxScreenProps } from "./types";
import styles from "../lernbox-screen.module.css";

function round(pairs: [string, string][]): MatchRound {
  const tiles: MatchTile[] = pairs.flatMap(([term, meaning]) => [
    { id: `${term}:term`, cardId: term, side: "term", text: term },
    { id: `${term}:meaning`, cardId: term, side: "meaning", text: meaning },
  ]);
  return { tiles, pairs: pairs.length };
}

const match: LbMatch = {
  title: "Englisch Tiere",
  gameKey: "spiel-1",
  rounds: [
    round([
      ["Haus", "house"],
      ["Hund", "dog"],
    ]),
    round([
      ["Baum", "tree"],
      ["Katze", "cat"],
    ]),
  ],
};

function setup() {
  const handlers = {
    onEndSession: vi.fn(),
    onMatchAgain: vi.fn(),
    onFormFinished: vi.fn(),
  };
  const props = {
    theme: "light",
    ...handlers,
  } as unknown as LernBoxScreenProps;
  render(<Match {...props} match={match} />);
  return handlers;
}

const tile = (name: string) => screen.getByRole("button", { name });
const status = () => screen.getByRole("status");

afterEach(() => {
  vi.useRealTimers();
});

describe("Zuordnen (Ansicht)", () => {
  it("zeigt zwei Kacheln je Paar als Knöpfe und markiert die erste Wahl", async () => {
    setup();
    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(4);
    await userEvent.click(tile("Haus"));
    expect(tile("Haus")).toHaveAttribute("aria-pressed", "true");
  });

  it("lässt ein richtiges Paar verschwinden und gibt einer offenen Kachel den Fokus", async () => {
    setup();
    await userEvent.click(tile("Haus"));
    await userEvent.click(tile("house"));
    expect(screen.queryByRole("button", { name: "Haus" })).toBeNull();
    expect(screen.queryByRole("button", { name: "house" })).toBeNull();
    expect(status()).toHaveTextContent("Richtig: Haus – house");
    const focused = document.activeElement as HTMLElement;
    expect(focused.tagName).toBe("BUTTON");
    expect(["Hund", "dog"]).toContain(focused.textContent);
  });

  it("zeigt bei einem falschen Paar Rückmeldung und räumt sie nach 1,2 Sekunden ab", async () => {
    vi.useFakeTimers();
    setup();
    act(() => tile("Haus").click());
    act(() => tile("dog").click());
    expect(status()).toHaveTextContent(
      "Das passt nicht zusammen. Versuch es noch einmal.",
    );
    expect(tile("Haus")).toHaveClass(styles.matchTileWrong!);
    expect(tile("dog")).toHaveClass(styles.matchTileWrong!);
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(tile("Haus")).not.toHaveClass(styles.matchTileWrong!);
    expect(tile("dog")).not.toHaveClass(styles.matchTileWrong!);
    // Der Text bleibt stehen, bis der nächste Zug ihn ersetzt.
    expect(status()).toHaveTextContent("Das passt nicht zusammen");
  });

  it("führt durch Runden bis zum Ergebnis und meldet das Ende genau einmal", async () => {
    const { onFormFinished } = setup();
    await userEvent.click(tile("Haus"));
    await userEvent.click(tile("dog"));
    await userEvent.click(tile("Haus"));
    await userEvent.click(tile("house"));
    await userEvent.click(tile("Hund"));
    await userEvent.click(tile("dog"));
    expect(
      screen.getByRole("heading", { name: "Runde 1 von 2 geschafft" }),
    ).toBeVisible();
    expect(tile("Nächste Runde")).toHaveFocus();
    await userEvent.click(tile("Nächste Runde"));
    await userEvent.click(tile("Baum"));
    await userEvent.click(tile("tree"));
    await userEvent.click(tile("Katze"));
    await userEvent.click(tile("cat"));
    expect(
      screen.getByRole("heading", { name: "Alle Paare gefunden" }),
    ).toHaveFocus();
    expect(status()).toHaveTextContent("4 Paare · 1 Fehlversuch");
    expect(onFormFinished).toHaveBeenCalledTimes(1);
  });

  it("sagt „ohne Fehlversuch“, wenn nichts schiefging", async () => {
    setup();
    for (const [term, meaning] of [
      ["Haus", "house"],
      ["Hund", "dog"],
    ] as const) {
      await userEvent.click(tile(term));
      await userEvent.click(tile(meaning));
    }
    await userEvent.click(tile("Nächste Runde"));
    for (const [term, meaning] of [
      ["Baum", "tree"],
      ["Katze", "cat"],
    ] as const) {
      await userEvent.click(tile(term));
      await userEvent.click(tile(meaning));
    }
    expect(status()).toHaveTextContent("4 Paare · ohne Fehlversuch");
  });

  it("startet mit „Noch einmal“ neu und geht mit „Zur LernBox“ zurück", async () => {
    const { onMatchAgain, onEndSession } = setup();
    for (const pair of [
      ["Haus", "house"],
      ["Hund", "dog"],
    ] as const) {
      await userEvent.click(tile(pair[0]));
      await userEvent.click(tile(pair[1]));
    }
    await userEvent.click(tile("Nächste Runde"));
    for (const pair of [
      ["Baum", "tree"],
      ["Katze", "cat"],
    ] as const) {
      await userEvent.click(tile(pair[0]));
      await userEvent.click(tile(pair[1]));
    }
    await userEvent.click(tile("Noch einmal"));
    expect(onMatchAgain).toHaveBeenCalledTimes(1);
    await userEvent.click(tile("Zur LernBox"));
    expect(onEndSession).toHaveBeenCalledTimes(1);
  });

  it("ändert die Meldung bei jedem Fehlversuch, damit sie neu angesagt wird", async () => {
    setup();
    await userEvent.click(tile("Haus"));
    await userEvent.click(tile("dog"));
    const first = status().textContent;
    await userEvent.click(tile("Haus"));
    await userEvent.click(tile("dog"));
    expect(status().textContent).not.toBe(first);
    expect(status()).toHaveTextContent("Das passt nicht zusammen");
  });
});
