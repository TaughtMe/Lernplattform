import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  START_DEMO_ARCHIVED,
  START_DEMO_OTHER,
  START_DEMO_PREPARED,
  START_DEMO_SOURCES,
} from "./start-demo";
import {
  RoomBarPill,
  StartScreen,
  type StartScreenProps,
} from "./start-screen";

// jsdom wertet keine Container-Queries aus: Varianten für Handy, Tablet und
// Desktop stehen alle im DOM; die Tests wählen über Rollen und Namen.

function props(over: Partial<StartScreenProps> = {}): StartScreenProps {
  return {
    eyebrow: "Klasse 7b · Start",
    classShort: "7b",
    createHref: { text: "/t", vocabulary: "/v", math: "/m" },
    tab: "prepared",
    prepared: START_DEMO_PREPARED,
    archived: START_DEMO_ARCHIVED,
    emptyText: { prepared: "Nichts vorbereitet.", archive: "Kein Archiv." },
    ...over,
  };
}

describe("StartScreen", () => {
  it("zeigt Titel, Kacheln und Reiter mit Zählern", () => {
    render(<StartScreen {...props()} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Neues Laufdiktat" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Text/ })).toHaveAttribute(
      "href",
      "/t",
    );
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveTextContent("Vorbereitet für 7b");
    expect(tabs[0]).toHaveTextContent("6");
    expect(tabs[1]).toHaveTextContent("12");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    // Nur die erste Zeile startet gefüllt; die Klasse fehlt ohne Raum.
    expect(screen.queryByRole("link", { name: "Zum Raum" })).toBeNull();
    expect(screen.queryByText("Aus anderen Klassen holen")).toBeNull();
  });

  it("meldet Starten, Bearbeiten und Reiterwechsel, auch per Pfeiltaste", async () => {
    const onStart = vi.fn();
    const onEdit = vi.fn();
    const onTab = vi.fn();
    render(<StartScreen {...props({ onStart, onEdit, onTab })} />);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Herbst im Wald starten" }),
    );
    expect(onStart).toHaveBeenCalledWith("p4");
    await user.click(
      screen.getByRole("button", { name: "Herbst im Wald bearbeiten" }),
    );
    expect(onEdit).toHaveBeenCalledWith("p4");
    screen.getAllByRole("tab")[0]!.focus();
    await user.keyboard("{ArrowRight}");
    expect(onTab).toHaveBeenCalledWith("archive");
  });

  it("zeigt im Archiv „Wieder vorbereiten“ statt Starten", async () => {
    const onPrepareAgain = vi.fn();
    render(<StartScreen {...props({ tab: "archive", onPrepareAgain })} />);
    await userEvent.setup().click(
      screen.getByRole("button", {
        name: "Der Hund im Hof wieder vorbereiten",
      }),
    );
    expect(onPrepareAgain).toHaveBeenCalledWith("a1");
    expect(screen.queryByRole("button", { name: /starten$/ })).toBeNull();
    expect(
      screen.getByText("Wieder vorbereiten holt es zurück"),
    ).toBeInTheDocument();
  });

  it("klappt die Liste am Handy auf und zeigt Leerzustände", async () => {
    const { rerender } = render(<StartScreen {...props()} />);
    const more = screen.getByRole("button", { name: "Alle 6 anzeigen" });
    await userEvent.setup().click(more);
    expect(more).toHaveTextContent("Weniger anzeigen");
    expect(more).toHaveAttribute("aria-expanded", "true");
    rerender(<StartScreen {...props({ prepared: [] })} />);
    expect(screen.getByText("Nichts vorbereitet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Alle/ })).toBeNull();
  });

  it("fragt beim Löschen nach, bei geteilten Einträgen mit „Aus 7b entfernen“", async () => {
    const onDelete = vi.fn();
    render(<StartScreen {...props({ onDelete })} />);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Englisch Unit 4 löschen" }),
    );
    const group = screen.getByRole("group", {
      name: "Englisch Unit 4 löschen bestätigen",
    });
    await user.click(
      within(group).getByRole("button", { name: "Aus 7b entfernen" }),
    );
    expect(onDelete).toHaveBeenCalledWith("p2", "class");
    await user.click(
      screen.getByRole("button", { name: "Doppelkonsonanten löschen" }),
    );
    await user.click(screen.getByRole("button", { name: "Ja" }));
    expect(onDelete).toHaveBeenLastCalledWith("p1", "all");
  });

  it("holt aus anderen Klassen: Quelle, Suche, „+ Auch für 7b“", async () => {
    const onSource = vi.fn();
    const onQuery = vi.fn();
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    const rows = START_DEMO_OTHER["ohne"]!.map((row, index) => ({
      ...row,
      added: index === 1,
    }));
    render(
      <StartScreen
        {...props({
          room: { code: "4821", href: "/lehrer/live" },
          other: {
            sources: START_DEMO_SOURCES,
            source: "ohne",
            onSource,
            query: "",
            onQuery,
            rows,
            emptyText: "Nichts.",
            onAdd,
            onRemove,
          },
        })}
      />,
    );
    const user = userEvent.setup();
    expect(screen.getByText("Raum 4821 läuft")).toBeInTheDocument();
    const group = screen.getByRole("group", { name: "Quelle" });
    expect(
      within(group).getByRole("button", { name: /Nicht zugeordnet/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.click(within(group).getByRole("button", { name: /Klasse 8a/ }));
    expect(onSource).toHaveBeenCalledWith("8a");
    await user.type(
      screen.getByRole("searchbox", { name: "In allen Klassen suchen" }),
      "h",
    );
    expect(onQuery).toHaveBeenCalledWith("h");
    await user.click(
      screen.getByRole("button", { name: "Französisch Farben auch für 7b" }),
    );
    expect(onAdd).toHaveBeenCalledWith("n1");
    await user.click(
      screen.getByRole("button", {
        name: "Wortarten erkennen bei 7b, wieder abnehmen",
      }),
    );
    expect(onRemove).toHaveBeenCalledWith("n2");
  });
});

describe("RoomBarPill", () => {
  it("führt zum Raum, mit Code und kurz „Raum läuft“", () => {
    render(<RoomBarPill room={{ code: "4821", href: "/lehrer/live" }} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/lehrer/live");
    expect(link).toHaveTextContent("Raum 4821");
    expect(link).toHaveTextContent("Raum läuft");
  });
});
