import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TEXTBOX_TEXTS } from "../../../src/domain/textbox-library";
import type { TextboxTextSummary } from "../../../src/domain/textbox-progress";
import { TextDetailScreen } from "./text-detail-screen";

const text = TEXTBOX_TEXTS[0]!;
/** Je Durchgang ein einziger Versuch. */
const single = (rounds: number[]) => rounds.map((percent) => [{ percent }]);
const summary: TextboxTextSummary = {
  textId: text.id,
  sessions: 3,
  bestPercent: 90,
  lastPercent: 60,
  lastPracticedAt: "2026-10-03T08:00:00.000Z",
  history: [
    {
      trainingId: "a",
      completedAt: "2026-10-01T08:00:00.000Z",
      percent: 70,
      rounds: [100, 90, 80, 70],
      attempts: single([100, 90, 80, 70]),
    },
    {
      trainingId: "b",
      completedAt: "2026-10-02T08:00:00.000Z",
      percent: 90,
      rounds: [100, 100, 95, 90],
      attempts: single([100, 100, 95, 90]),
    },
    {
      trainingId: "c",
      completedAt: "2026-10-03T08:00:00.000Z",
      percent: 60,
      rounds: [90, 80, 70, 60],
      attempts: single([90, 80, 70, 60]),
    },
  ],
};

function setup(value: TextboxTextSummary | null = summary) {
  const handlers = { onPractice: vi.fn(), onBack: vi.fn() };
  render(
    <TextDetailScreen text={text} summary={value ?? undefined} {...handlers} />,
  );
  return handlers;
}

describe("TextDetailScreen", () => {
  it("trennt Bestwert und letztes Ergebnis", () => {
    setup();
    const stats = screen.getByText("Bestwert").closest("dl")!;
    expect(within(stats).getByText("Bestwert").nextSibling).toHaveTextContent(
      "90 %",
    );
    expect(
      within(stats).getByText("Letztes Ergebnis").nextSibling,
    ).toHaveTextContent("60 %");
    expect(within(stats).getByText("Übungen").nextSibling).toHaveTextContent(
      "3",
    );
  });

  it("schaltet zwischen Linie und Säulen um und nutzt dieselben Daten", async () => {
    const user = userEvent.setup();
    setup();
    const accessibleName =
      "Dein Ergebnis in Durchgang 4: 3 Werte, von 70 Prozent auf 60 Prozent gesunken, Bestwert 90 Prozent.";
    const line = screen.getByRole("img");
    expect(line).toHaveAccessibleName(accessibleName);
    expect(line.querySelector("path[class*=line]")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Linie" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Säulen" }));
    const bars = screen.getByRole("img");
    expect(bars).toHaveAccessibleName(accessibleName);
    expect(bars.querySelector("path[class*=line]")).toBeNull();
    expect(bars.querySelectorAll("path[class*=bar]")).toHaveLength(3);
  });

  it("listet alle Übungen, neueste zuerst, mit den vier Durchgängen", () => {
    setup();
    const list = screen.getByRole("list", { name: "Alle Übungen" });
    const items = within(list)
      .getAllByRole("listitem", { hidden: true })
      .filter((li) => li.querySelector("details"));
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("60 %");
    expect(items[2]).toHaveTextContent("70 %");
    expect(items[0]).toHaveTextContent("Durchgang 4: 60 %");
    expect(items[1]).toHaveTextContent("Durchgang 1: 100 %");
  });

  it("zeigt je Durchgang alle Versuche in Reihenfolge mit Zeitpunkt", () => {
    setup({
      ...summary,
      sessions: 1,
      history: [
        {
          trainingId: "x",
          completedAt: "2026-10-04T08:00:00.000Z",
          percent: 100,
          rounds: [80, 100, 70, 100],
          attempts: [
            [{ percent: 80 }],
            [
              { percent: 25, at: "2026-10-04T07:50:00.000Z" },
              { percent: 27, at: "2026-10-04T07:52:00.000Z" },
              { percent: 100, at: "2026-10-04T07:55:00.000Z" },
            ],
            [{ percent: 70 }],
            [{ percent: 100 }],
          ],
        },
      ],
    });
    const second = screen.getByText(/Durchgang 2:/);
    expect(second).toHaveTextContent("Durchgang 2: 25 % → 27 % → 100 %");
    expect(second).toHaveTextContent("großer Sprung");
    expect(second).toHaveTextContent("Versuch 1: 25 %, ");
    expect(second).toHaveTextContent("Versuch 3: 100 %, ");
    // Einzelne Versuche und kleine Schritte bleiben unmarkiert.
    const first = screen.getByText(/Durchgang 1:/);
    expect(first).toHaveTextContent("Durchgang 1: 80 %");
    expect(first).not.toHaveTextContent("Sprung");
    expect(first).not.toHaveTextContent("Versuch");
    expect(screen.getAllByText("großer Sprung")).toHaveLength(1);
  });

  it("hält die Reflexionsfragen zunächst geschlossen", async () => {
    setup();
    const box = screen
      .getByText("Schau dir dein Diagramm an")
      .closest("details")!;
    expect(box).not.toHaveAttribute("open");
    await userEvent.click(screen.getByText("Schau dir dein Diagramm an"));
    expect(box).toHaveAttribute("open");
    expect(within(box).getAllByRole("listitem")).toHaveLength(4);
  });

  it("blendet die Fragen bei nur einer Übung aus", () => {
    setup({ ...summary, sessions: 1, history: summary.history.slice(0, 1) });
    expect(
      screen.queryByText("Schau dir dein Diagramm an"),
    ).not.toBeInTheDocument();
  });

  it("zeigt ohne Übungen einen leeren Zustand und bietet Üben an", async () => {
    const handlers = setup(null);
    expect(
      screen.getByText("Noch keine abgeschlossene Übung"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Erneut üben" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Zur Textauswahl" }),
    );
    expect(handlers.onPractice).toHaveBeenCalledOnce();
    expect(handlers.onBack).toHaveBeenCalledOnce();
  });
});
