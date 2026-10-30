import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { serverRender } from "../../../tests/server-render";
import { StartPointApp } from "./start-point-app";

/** Fester Zufall, damit die Rechenaufgaben in jedem Lauf gleich sind. */
function seeded(seed = 3) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function repository() {
  return {
    recordSpelling: vi.fn().mockResolvedValue(false),
    recordMath: vi.fn().mockResolvedValue(false),
  };
}

const FORBIDDEN = [
  /fällig/i,
  /leitner/i,
  /durchgang/i,
  /merkstufe/i,
  /prozent/i,
  /%/,
];

async function answer(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(
    await screen.findByLabelText(/./, { selector: "input" }),
    text,
  );
  await user.click(screen.getByRole("button", { name: "Weiter" }));
}

describe("Startpunkt: Container", () => {
  it("fragt zuerst nach dem Bereich und verspricht keinen Test", () => {
    render(<StartPointApp repository={repository()} random={seeded()} />);
    expect(
      screen.getByRole("heading", { name: "Wir suchen deinen Startpunkt" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/kein Test/)).toBeInTheDocument();
    expect(screen.getByText("Rechtschreibung")).toBeInTheDocument();
    expect(screen.getByText("Kopfrechnen")).toBeInTheDocument();
  });

  it("endet beim Kopfrechnen nach zwei Fehlern auf einer Stufe mit einem Vorschlag", async () => {
    const user = userEvent.setup();
    const store = repository();
    render(<StartPointApp repository={store} random={seeded()} />);
    await user.click(
      screen.getAllByRole("button", { name: "Startpunkt suchen" })[1]!,
    );

    expect(screen.getByText("Aufgabe 1")).toBeInTheDocument();
    await answer(user, "9999");
    expect(screen.getByText("Aufgabe 2")).toBeInTheDocument();
    await answer(user, "9999");

    expect(
      await screen.findByRole("heading", { name: "Plus und Minus bis 10" }),
    ).toBeInTheDocument();
    expect(store.recordMath).toHaveBeenCalledTimes(2);
    expect(store.recordMath.mock.calls[0]![0]).toMatchObject({
      answer: "9999",
      attemptId: "math:0:0",
    });
    for (const word of FORBIDDEN) {
      expect(document.body).not.toHaveTextContent(word);
    }
    expect(
      screen.getByRole("link", { name: "Kopfrechnen öffnen" }),
    ).toHaveAttribute("href", "/frei/mathematics");
  });

  it("schlägt bei Rechtschreibung die Wortbox der Stufe mit den zwei Fehlern vor", async () => {
    const user = userEvent.setup();
    const store = repository();
    render(<StartPointApp repository={store} random={seeded()} />);
    await user.click(
      screen.getAllByRole("button", { name: "Startpunkt suchen" })[0]!,
    );

    // Ohne Stimme (Test) erscheint das Lückenwort: B_e_e.
    expect(await screen.findByText("Aufgabe 1")).toBeInTheDocument();
    await answer(user, "Bine");
    await answer(user, "Spigel");

    expect(
      await screen.findByRole("heading", { name: "Wortbox „Langes i“" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Fang mit „Wenige Lücken“ an."),
    ).toBeInTheDocument();
    expect(store.recordSpelling).toHaveBeenCalledTimes(2);
    expect(store.recordSpelling.mock.calls[0]![0]).toMatchObject({
      word: "Biene",
      answer: "Bine",
      stage: 3,
      attemptId: "spelling:0:0",
    });
    expect(
      screen.getByRole("link", { name: "Wortbox öffnen" }),
    ).toHaveAttribute("href", "/frei/german/lernwoerter?sammlung=long-i");
    expect(
      screen.getByRole("link", { name: "Selbst wählen" }),
    ).toBeInTheDocument();
    for (const word of FORBIDDEN) {
      expect(document.body).not.toHaveTextContent(word);
    }
  });

  it("liest das Lückenwort für Screenreader vor", async () => {
    const user = userEvent.setup();
    render(<StartPointApp repository={repository()} random={seeded()} />);
    await user.click(
      screen.getAllByRole("button", { name: "Startpunkt suchen" })[0]!,
    );
    const pattern = await screen.findByLabelText(/Lücke/, { selector: "p" });
    expect(pattern).toHaveTextContent("_");
  });

  it("lässt sich wiederholen und beginnt dann wieder bei der Auswahl", async () => {
    const user = userEvent.setup();
    render(<StartPointApp repository={repository()} random={seeded()} />);
    await user.click(
      screen.getAllByRole("button", { name: "Startpunkt suchen" })[1]!,
    );
    await answer(user, "9999");
    await answer(user, "9999");
    await user.click(
      await screen.findByRole("button", { name: "Noch einmal suchen" }),
    );
    expect(screen.getByText("Rechtschreibung")).toBeInTheDocument();
  });

  it("geht mit „Aufhören“ zurück zur Auswahl", async () => {
    const user = userEvent.setup();
    render(<StartPointApp repository={repository()} random={seeded()} />);
    await user.click(
      screen.getAllByRole("button", { name: "Startpunkt suchen" })[1]!,
    );
    await user.click(screen.getByRole("button", { name: "Aufhören" }));
    expect(screen.getByText("Rechtschreibung")).toBeInTheDocument();
  });

  it("macht trotz Speicherfehler weiter und sagt es kurz", async () => {
    const user = userEvent.setup();
    const store = repository();
    store.recordMath.mockRejectedValue(new Error("voll"));
    render(<StartPointApp repository={store} random={seeded()} />);
    await user.click(
      screen.getAllByRole("button", { name: "Startpunkt suchen" })[1]!,
    );
    await answer(user, "1");
    await waitFor(() =>
      expect(screen.getByText(/nicht gespeichert/)).toBeInTheDocument(),
    );
    expect(screen.getByText("Aufgabe 2")).toBeInTheDocument();
  });

  it("verlangt eine Eingabe, bevor es weitergeht", async () => {
    const user = userEvent.setup();
    render(<StartPointApp repository={repository()} random={seeded()} />);
    await user.click(
      screen.getAllByRole("button", { name: "Startpunkt suchen" })[1]!,
    );
    expect(screen.getByRole("button", { name: "Weiter" })).toBeDisabled();
  });
});

describe("Startpunkt: vor dem Hydrieren", () => {
  it("sperrt „Startpunkt suchen“ sichtbar, bis Klicks ankommen", async () => {
    const user = userEvent.setup();
    const app = <StartPointApp repository={repository()} random={seeded()} />;
    const { container, hydrate } = serverRender(app);
    const early = within(container).getAllByRole("button", {
      name: "Startpunkt suchen",
    });
    expect(early).toHaveLength(2);
    for (const button of early) expect(button).toBeDisabled();

    hydrate();
    const math = screen.getAllByRole("button", {
      name: "Startpunkt suchen",
    })[1]!;
    expect(math).toBeEnabled();
    await user.click(math);
    expect(screen.getByText("Aufgabe 1")).toBeInTheDocument();
  });
});
