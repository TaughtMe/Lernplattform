import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { serverRender } from "../../../tests/server-render";
import {
  TrainingScreen,
  formatClock,
  type TrainingClock,
  type TrainingSegmentView,
} from "./training-screen";

const SEGMENTS: TrainingSegmentView[] = [
  {
    id: "0",
    title: "Kopfrechnen",
    count: "3 Aufgaben",
    duration: "etwa 4 Minuten",
    areas: ["Mal: Reihe 7", "Plus bis 20"],
    kinds: ["Nochmal üben", "Wiederholen"],
    href: "/frei/mathematics?heute=1",
  },
  {
    id: "1",
    title: "Rechtschreibung",
    count: "1 Aufgabe",
    duration: "etwa 1 Minute",
    areas: [],
    kinds: ["Neu"],
    href: "/frei/german/lernwoerter?heute=1",
  },
];

function clock(input: Partial<TrainingClock> = {}): TrainingClock {
  return {
    started: false,
    activeMs: 0,
    budgetMs: 600_000,
    phase: "running",
    onStart: () => undefined,
    ...input,
  };
}

function setup(options: Partial<Parameters<typeof TrainingScreen>[0]> = {}) {
  return render(
    <TrainingScreen
      status="ready"
      minutes={10}
      onMinutes={() => undefined}
      summary="Das sind 4 Aufgaben, etwa 5 Minuten."
      segments={SEGMENTS}
      clock={clock()}
      {...options}
    />,
  );
}

describe("formatClock", () => {
  it("zeigt Minuten und Sekunden", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(65_900)).toBe("1:05");
    expect(formatClock(600_000)).toBe("10:00");
    expect(formatClock(-5)).toBe("0:00");
  });
});

describe("TrainingScreen", () => {
  it("zeigt die Dauer als Auswahl und die Abschnitte in Reihenfolge mit Link", async () => {
    const user = userEvent.setup();
    const onMinutes = vi.fn();
    setup({ onMinutes });
    expect(
      screen.getByRole("heading", { level: 1, name: "Dein Training" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10 Minuten" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "20 Minuten" }));
    expect(onMinutes).toHaveBeenCalledWith(20);

    const items = within(
      screen.getByRole("list", { name: "Deine Aufgaben" }),
    ).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("1. Kopfrechnen");
    expect(items[0]).toHaveTextContent("Mal: Reihe 7, Plus bis 20");
    expect(items[0]).toHaveTextContent("Nochmal üben");
    expect(
      within(items[0]!).getByRole("link", { name: "Los, 1. Kopfrechnen" }),
    ).toHaveAttribute("href", "/frei/mathematics?heute=1");
  });

  it("startet die Uhr erst nach „Training starten“", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    setup({ clock: clock({ onStart }) });
    expect(
      screen.getByText(/Das sind 4 Aufgaben/, { exact: false }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Training starten" }));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("zeigt die aktive Zeit und einen Fortschrittsbalken", () => {
    setup({
      clock: clock({ started: true, activeMs: 125_000 }),
    });
    expect(screen.getByText("2:05")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Zeit im Training" }),
    ).toHaveAttribute("aria-valuenow", "125000");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("sagt bei angehaltener Uhr, was los ist", () => {
    setup({
      clock: clock({ started: true, activeMs: 5_000, phase: "paused" }),
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Die Uhr ist angehalten",
    );
  });

  it("lässt die laufende Aufgabe fertig werden, bevor der Abschluss kommt", () => {
    const { rerender } = setup({
      clock: clock({
        started: true,
        activeMs: 600_000,
        phase: "finish-current",
      }),
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Mach deine Aufgabe noch fertig, dann kommt der Abschluss",
    );
    rerender(
      <TrainingScreen
        status="ready"
        minutes={10}
        onMinutes={() => undefined}
        segments={SEGMENTS}
        clock={clock({ started: true, activeMs: 600_000, phase: "closing" })}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Geschafft!");
  });

  it("zeigt Laden, Fehler und leere Zustände", () => {
    const { rerender } = setup({ status: "loading", segments: [] });
    expect(screen.getByRole("status")).toHaveTextContent("vorbereitet");
    rerender(
      <TrainingScreen
        status="error"
        minutes={10}
        onMinutes={() => undefined}
        segments={[]}
        clock={clock()}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("nicht verfügbar");
    rerender(
      <TrainingScreen
        status="ready"
        minutes={10}
        onMinutes={() => undefined}
        segments={[]}
        emptyKind="done"
        clock={clock()}
      />,
    );
    expect(
      screen.getByText("Dein Teil für heute ist geschafft"),
    ).toBeInTheDocument();
    rerender(
      <TrainingScreen
        status="ready"
        minutes={10}
        onMinutes={() => undefined}
        segments={[]}
        emptyKind="nothing"
        clock={clock()}
      />,
    );
    expect(screen.getByText("Heute ist noch nichts dran")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Training starten" }),
    ).toBeNull();
  });

  it("verwendet keine Fachwörter", () => {
    setup();
    for (const word of [/fällig/i, /leitner/i, /durchgang/i, /merkstufe/i]) {
      expect(document.body).not.toHaveTextContent(word);
    }
  });
});

describe("TrainingScreen vor dem Hydrieren", () => {
  it("sperrt die Dauer, bis ein Klick ankommt", async () => {
    const user = userEvent.setup();
    const onMinutes = vi.fn();
    const ui = (
      <TrainingScreen
        status="loading"
        minutes={10}
        onMinutes={onMinutes}
        segments={[]}
        clock={clock()}
      />
    );
    const { container, hydrate } = serverRender(ui);
    expect(
      within(container).getByRole("button", { name: "20 Minuten" }),
    ).toBeDisabled();

    hydrate();
    await user.click(screen.getByRole("button", { name: "20 Minuten" }));
    expect(onMinutes).toHaveBeenCalledWith(20);
  });
});
