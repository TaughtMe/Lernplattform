import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCompetenceProfile } from "../../../src/domain/competence-profile";
import type { DailyPlanItem } from "../../../src/domain/daily-plan";
import type { DailyTrainingSource } from "../../../src/storage/daily-training";
import { DailyTrainingApp } from "./daily-training-app";

function item(
  key: string,
  kind: DailyPlanItem["kind"],
  module: DailyPlanItem["module"],
): DailyPlanItem {
  return { key, kind, module, objectIds: [key] };
}

function source(
  items: DailyPlanItem[],
  total = items.length,
): DailyTrainingSource {
  return {
    openItems: items,
    done: total - items.length,
    total,
    profile: buildCompetenceProfile({
      now: 0,
      events: [],
      cards: [],
      decks: [],
      words: [],
      wordBoxes: [],
    }),
  };
}

let clock = 0;
const now = () => clock;

beforeEach(() => {
  clock = 1_000_000;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Tagestraining: Container", () => {
  it("plant für die gewählte Dauer und fasst Module zu Abschnitten zusammen", async () => {
    const user = userEvent.setup();
    const items = [
      item("mathematics:a", "error", "mathematics"),
      item("mathematics:b", "review", "mathematics"),
      ...Array.from({ length: 20 }, (_, index) =>
        item(`german:${index}`, "review", "german"),
      ),
    ];
    render(<DailyTrainingApp load={async () => source(items)} now={now} />);

    const list = await screen.findByRole("list", { name: "Deine Aufgaben" });
    const first = within(list).getAllByRole("listitem");
    expect(first[0]).toHaveTextContent("1. Kopfrechnen");
    expect(first[0]).toHaveTextContent("2 Aufgaben");
    expect(first[1]).toHaveTextContent("2. Rechtschreibung");
    // 10 Minuten: 150 s Mathe + 45 s je Wort bis 600 s => 10 Wörter.
    expect(first[1]).toHaveTextContent("10 Aufgaben");

    await user.click(screen.getByRole("button", { name: "20 Minuten" }));
    const second = within(
      await screen.findByRole("list", { name: "Deine Aufgaben" }),
    ).getAllByRole("listitem");
    expect(second[1]).toHaveTextContent("20 Aufgaben");
  });

  it("zeigt bei erledigter Portion die Freude statt einer Liste", async () => {
    render(<DailyTrainingApp load={async () => source([], 5)} now={now} />);
    expect(
      await screen.findByText("Dein Teil für heute ist geschafft"),
    ).toBeInTheDocument();
  });

  it("zeigt ohne Portion, dass nichts dran ist", async () => {
    render(<DailyTrainingApp load={async () => source([], 0)} now={now} />);
    expect(
      await screen.findByText("Heute ist noch nichts dran"),
    ).toBeInTheDocument();
  });

  it("sagt kurz Bescheid, wenn der Lernstand nicht lesbar ist", async () => {
    render(
      <DailyTrainingApp
        load={async () => {
          throw new Error("kaputt");
        }}
        now={now}
      />,
    );
    expect(await screen.findByText(/nicht verfügbar/)).toBeInTheDocument();
  });

  it("misst aktive Zeit, pausiert ohne Eingabe und schließt nach Ablauf ab", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <DailyTrainingApp
        load={async () => source([item("german:1", "review", "german")])}
        now={now}
      />,
    );
    const start = await screen.findByRole("button", {
      name: "Training starten",
    });
    await act(async () => {
      start.click();
    });

    function advance(ms: number, input = true) {
      clock += ms;
      act(() => {
        if (input) document.dispatchEvent(new Event("keydown"));
        vi.advanceTimersByTime(ms);
      });
    }

    advance(30_000);
    expect(screen.getByText("0:30")).toBeInTheDocument();

    // 4 Minuten ohne Eingabe: Die Uhr hält an, diese Zeit zählt nicht.
    advance(4 * 60_000, false);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Die Uhr ist angehalten",
    );
    expect(screen.getByText("0:30")).toBeInTheDocument();

    // Die erste Eingabe danach zählt nicht rückwirkend; 9,5 aktive Minuten
    // folgen, dann sind es 10 und der Abschluss kommt.
    advance(60_000);
    for (let minute = 0; minute < 9; minute += 1) advance(60_000);
    expect(screen.queryByText("Geschafft!", { exact: false })).toBeNull();
    advance(30_000);
    expect(screen.getByRole("status")).toHaveTextContent("Geschafft!");
    expect(screen.getByText("10:00")).toBeInTheDocument();
  });
});
