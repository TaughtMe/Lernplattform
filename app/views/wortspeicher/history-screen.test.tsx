import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { summarizeWordBox } from "../../../src/domain/word-store-progress";
import { roundRecord } from "../../components/word-store-fixtures";
import { HistoryScreen } from "./history-screen";

function setup(
  rounds: ReturnType<typeof roundRecord>[],
  options: { onPractice?: (stage: number) => void } = {},
) {
  const onPractice = options.onPractice ?? vi.fn();
  render(
    <HistoryScreen
      title="Doppelkonsonanten"
      summary={summarizeWordBox("double-consonants", rounds)}
      rounds={rounds}
      initialStage={rounds[0]?.stage ?? 1}
      worksheetHref="/frei/german/lernwoerter/laufzettel"
      onPractice={onPractice}
      onBack={() => undefined}
    />,
  );
  return { onPractice };
}

describe("HistoryScreen", () => {
  it("zeigt ohne Runden einen leeren Zustand", () => {
    setup([]);
    expect(
      screen.getByText("Noch keine abgeschlossene Runde"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Merkstufe" }),
    ).not.toBeInTheDocument();
  });

  it("zeigt bei einer Runde Werte und Diagramm, aber noch keine Reflexionsfragen", () => {
    setup([roundRecord("a", { percent: 80, day: 1 })]);
    expect(
      screen.getByRole("heading", { name: "Verlauf: Doppelkonsonanten" }),
    ).toBeInTheDocument();
    const stats = screen
      .getByRole("term", { name: "" }, { hidden: true })
      .closest("dl");
    expect(stats).toHaveTextContent("Bestwert80 %");
    expect(stats).toHaveTextContent("Letztes Ergebnis80 %");
    expect(stats).toHaveTextContent("Runden1");
    expect(
      screen.getByRole("img", { name: /ein Wert, 80 Prozent/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Schau dir dein Diagramm an"),
    ).not.toBeInTheDocument();
  });

  it("zeigt Reflexionsfragen erst ab zwei Runden der Stufe", async () => {
    const user = userEvent.setup();
    setup([
      roundRecord("a", { percent: 50, day: 1 }),
      roundRecord("b", { percent: 80, day: 2 }),
    ]);
    const summary = screen.getByText("Schau dir dein Diagramm an");
    expect(summary).toBeInTheDocument();
    await user.click(summary);
    expect(
      screen.getByText("Wie stark hast du dich verbessert?"),
    ).toBeVisible();
  });

  it("macht nur Stufen mit Runden wählbar und wechselt die Anzeige", async () => {
    const user = userEvent.setup();
    setup([
      roundRecord("a", { stage: 1, percent: 50, day: 1 }),
      roundRecord("b", { stage: 4, percent: 90, day: 2 }),
    ]);
    const group = screen.getByRole("group", { name: "Merkstufe" });
    expect(
      within(group).getByRole("button", { name: "Stufe 2" }),
    ).toBeDisabled();
    expect(
      within(group).getByRole("button", { name: "Stufe 6" }),
    ).toBeDisabled();
    expect(
      within(group).getByRole("button", { name: "Stufe 1" }),
    ).toBeEnabled();
    await user.click(within(group).getByRole("button", { name: "Stufe 4" }));
    expect(
      within(group).getByRole("button", { name: "Stufe 4" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("img", { name: /Merkstufe 4: ein Wert, 90 Prozent/ }),
    ).toBeInTheDocument();
  });

  it("schaltet zwischen Linie und Säulen um", async () => {
    const user = userEvent.setup();
    setup([
      roundRecord("a", { percent: 50, day: 1 }),
      roundRecord("b", { percent: 80, day: 2 }),
    ]);
    const chart = screen.getByRole("group", { name: "Diagramm" });
    expect(
      within(chart).getByRole("button", { name: "Linie" }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.click(within(chart).getByRole("button", { name: "Säulen" }));
    expect(
      within(chart).getByRole("button", { name: "Säulen" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("img", {
        name: /2 Werte, von 50 Prozent auf 80 Prozent gestiegen/,
      }),
    ).toBeInTheDocument();
  });

  it("listet alle Runden, jede aufklappbar mit den Wörtern", async () => {
    const user = userEvent.setup();
    setup([
      roundRecord("a", { stage: 1, percent: 50, day: 1 }),
      roundRecord("b", {
        stage: 4,
        percent: 100,
        day: 2,
        words: [
          {
            word: "Sonne",
            firstTry: true,
            attempts: 1,
            usedHelp: false,
            firstResult: "richtig",
          },
          {
            word: "Mond",
            firstTry: false,
            attempts: 2,
            usedHelp: true,
            firstResult: "falsch",
          },
        ],
      }),
    ]);
    const list = screen.getByRole("list", { name: "Alle Runden" });
    const items = within(list)
      .getAllByRole("listitem", { name: "" })
      .filter((li) => li.querySelector("summary"));
    expect(items).toHaveLength(2);
    // Neueste zuerst.
    expect(items[0]).toHaveTextContent("Stufe 4");
    await user.click(within(items[0]!).getByText(/Stufe 4/));
    expect(items[0]).toHaveTextContent("Sonne: auf Anhieb richtig");
    expect(items[0]).toHaveTextContent(
      "Mond: mit Hilfe, erst falsch, 2 Versuche",
    );
  });

  it("übt die gewählte Stufe und verlinkt den Laufzettel", async () => {
    const user = userEvent.setup();
    const { onPractice } = setup([roundRecord("a", { stage: 3, percent: 70 })]);
    await user.click(screen.getByRole("button", { name: "Diese Stufe üben" }));
    expect(onPractice).toHaveBeenCalledWith(3);
    expect(screen.getByRole("link", { name: "Laufzettel" })).toHaveAttribute(
      "href",
      "/frei/german/lernwoerter/laufzettel",
    );
  });
});
