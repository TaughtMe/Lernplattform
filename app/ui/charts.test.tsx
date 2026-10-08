import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BarChart, LineChart, describeSeries, type ChartPoint } from "./charts";

const props = {
  title: "Dein Ergebnis",
  yLabel: "Richtig geschrieben",
  xLabel: "Übungsversuch",
};
const few: ChartPoint[] = [
  { label: "1", value: 50, detail: "1. Okt." },
  { label: "2", value: 80, detail: "2. Okt." },
  { label: "3", value: 70, detail: "3. Okt." },
];
const many: ChartPoint[] = Array.from({ length: 20 }, (_, i) => ({
  label: String(i + 1),
  value: (i * 7) % 101,
}));

describe.each([
  ["LineChart", LineChart],
  ["BarChart", BarChart],
])("%s", (_name, Chart) => {
  it("beschriftet beide Achsen und die Gitterlinien von 0 bis 100 %", () => {
    render(<Chart {...props} points={few} />);
    const svg = screen.getByRole("img");
    for (const tick of ["0 %", "25 %", "50 %", "75 %", "100 %"]) {
      expect(within(svg).getAllByText(tick).length).toBeGreaterThan(0);
    }
    expect(within(svg).getByText("Übungsversuch")).toBeInTheDocument();
    expect(within(svg).getByText("Richtig geschrieben")).toBeInTheDocument();
    expect(svg).toHaveAccessibleName(
      "Dein Ergebnis: 3 Werte, von 50 Prozent auf 70 Prozent gestiegen, Bestwert 80 Prozent.",
    );
  });

  it("zeigt bei wenigen Punkten die Werte und bietet eine Wertetabelle an", async () => {
    render(<Chart {...props} points={few} />);
    const svg = screen.getByRole("img");
    expect(within(svg).getByText("80 %")).toBeInTheDocument();
    const toggle = screen.getByText("Wertetabelle anzeigen");
    await userEvent.click(toggle);
    const table = screen.getByRole("table", { name: "Dein Ergebnis" });
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(within(table).getByText("2. Okt.")).toBeInTheDocument();
    expect(within(table).getByText("70 %")).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Datum" }),
    ).toBeInTheDocument();
  });

  it("bleibt mit einem einzigen Punkt lesbar", () => {
    render(<Chart {...props} points={[{ label: "1", value: 40 }]} />);
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Dein Ergebnis: ein Wert, 40 Prozent.",
    );
    expect(
      within(screen.getByRole("img")).getByText("40 %"),
    ).toBeInTheDocument();
  });

  it("zeigt bei vielen Punkten nicht an jedem Punkt den Wert und dünnt die Achse aus", () => {
    render(<Chart {...props} points={many} />);
    const svg = screen.getByRole("img");
    // 5 Gitterbeschriftungen + 7 X-Beschriftungen (jede dritte) + 2 Achsentitel.
    expect(svg.querySelectorAll("text").length).toBeLessThan(20);
    expect(screen.getByRole("table", { hidden: true })).toBeInTheDocument();
  });

  it("zeigt ohne Daten einen leeren Zustand statt eines Diagramms", () => {
    render(<Chart {...props} points={[]} />);
    expect(screen.getByText("Noch keine Werte")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("begrenzt Werte außerhalb von 0 bis 100", () => {
    render(
      <Chart
        {...props}
        points={[
          { label: "1", value: -20 },
          { label: "2", value: 180 },
        ]}
      />,
    );
    expect(screen.getByRole("img")).toBeInTheDocument();
  });
});

describe("describeSeries", () => {
  it("beschreibt Verlauf, Rückgang und gleiche Werte", () => {
    expect(describeSeries("T", [])).toBe("T: keine Werte.");
    expect(
      describeSeries("T", [
        { label: "1", value: 90 },
        { label: "2", value: 60 },
      ]),
    ).toContain("gesunken");
    expect(
      describeSeries("T", [
        { label: "1", value: 60 },
        { label: "2", value: 60 },
      ]),
    ).toContain("gleich geblieben");
  });
});
