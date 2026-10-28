import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StartPointScreen } from "./start-point-screen";

const FORBIDDEN = [/fällig/i, /leitner/i, /durchgang/i, /merkstufe/i, /%/];

function task(
  options: Partial<
    Extract<Parameters<typeof StartPointScreen>[0], { phase: "task" }>
  > = {},
) {
  return render(
    <StartPointScreen
      phase="task"
      number={3}
      instruction="Rechne im Kopf."
      prompt={<p>7 + 5</p>}
      value=""
      speaking={false}
      busy={false}
      onChange={() => undefined}
      onSubmit={() => undefined}
      onStop={() => undefined}
      {...options}
    />,
  );
}

describe("StartPointScreen", () => {
  it("zeigt die Auswahl ohne Zahl und ohne Etikett", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(
      <StartPointScreen
        phase="choose"
        choices={[
          {
            id: "spelling",
            title: "Rechtschreibung",
            detail: "Wörter schreiben.",
          },
          { id: "math", title: "Kopfrechnen", detail: "Rechnen." },
        ]}
        onChoose={onChoose}
      />,
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Wir suchen deinen Startpunkt",
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getAllByRole("button", { name: "Startpunkt suchen" })[1]!,
    );
    expect(onChoose).toHaveBeenCalledWith("math");
    for (const word of FORBIDDEN) {
      expect(document.body).not.toHaveTextContent(word);
    }
  });

  it("nennt nur die Nummer der Aufgabe, keine Gesamtzahl", () => {
    task();
    expect(screen.getByText("Aufgabe 3")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/von \d+/);
  });

  it("schickt die Antwort mit Enter und sperrt leere Eingaben", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { rerender } = task({ onSubmit });
    expect(screen.getByRole("button", { name: "Weiter" })).toBeDisabled();
    await user.type(
      screen.getByRole("textbox", { name: "Rechne im Kopf." }),
      "{Enter}",
    );
    expect(onSubmit).not.toHaveBeenCalled();
    rerender(
      <StartPointScreen
        phase="task"
        number={3}
        instruction="Rechne im Kopf."
        prompt={<p>7 + 5</p>}
        value="12"
        speaking={false}
        busy={false}
        onChange={() => undefined}
        onSubmit={onSubmit}
        onStop={() => undefined}
      />,
    );
    await user.type(
      screen.getByRole("textbox", { name: "Rechne im Kopf." }),
      "{Enter}",
    );
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("sperrt die Eingabe, solange gespeichert wird, und ruft beim Hören aus", () => {
    task({ busy: true, speaking: true, onListen: () => undefined });
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Weiter" })).toBeDisabled();
    expect(screen.getByText("Das Wort wird gesprochen.")).toBeInTheDocument();
  });

  it("zeigt den Vorschlag mit Links und ohne Prozentzahl", async () => {
    const user = userEvent.setup();
    const onRepeat = vi.fn();
    render(
      <StartPointScreen
        phase="result"
        title="Wortbox „ck und tz“"
        detail="Fang mit „Wenige Lücken“ an."
        startHref="/frei/german/lernwoerter?sammlung=ck-tz"
        startLabel="Wortbox öffnen"
        otherHref="/frei/german/lernwoerter"
        onRepeat={onRepeat}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Wortbox „ck und tz“" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Wortbox öffnen" }),
    ).toHaveAttribute("href", "/frei/german/lernwoerter?sammlung=ck-tz");
    expect(screen.getByText(/Das ist nur ein Vorschlag/)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Noch einmal suchen" }),
    );
    expect(onRepeat).toHaveBeenCalledOnce();
    for (const word of FORBIDDEN) {
      expect(document.body).not.toHaveTextContent(word);
    }
  });
});
