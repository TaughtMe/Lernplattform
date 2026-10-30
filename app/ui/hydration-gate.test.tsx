import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { serverRender } from "../../tests/server-render";
import { HydrationGate } from "./hydration-gate";

function Form({ onSave = () => undefined }: { onSave?: () => void }) {
  const [text, setText] = useState("Beispiel");
  return (
    <HydrationGate className="ui-stack">
      <label>
        Text
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <select aria-label="Anzahl" defaultValue="5">
        <option value="5">5</option>
      </select>
      <button type="button" onClick={onSave}>
        Speichern
      </button>
      <a href="/hilfe">Hilfe</a>
    </HydrationGate>
  );
}

describe("HydrationGate", () => {
  it("sperrt im Server-Render alle Bedienelemente, Links bleiben frei", () => {
    const { container } = serverRender(<Form />);
    const page = within(container);
    const gate = page.getByRole("group");
    expect(gate).toBeDisabled();
    expect(gate).toHaveAttribute("aria-busy", "true");
    expect(gate).toHaveClass("ui-gate", "ui-stack");
    expect(page.getByRole("button", { name: "Speichern" })).toBeDisabled();
    expect(page.getByRole("textbox", { name: "Text" })).toBeDisabled();
    expect(page.getByRole("combobox", { name: "Anzahl" })).toBeDisabled();
    expect(page.getByRole("link", { name: "Hilfe" })).toHaveAttribute(
      "href",
      "/hilfe",
    );
  });

  it("gibt sie nach dem Hydrieren frei, Klicks und Eingaben kommen an", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const { hydrate } = serverRender(<Form onSave={onSave} />);
    hydrate();

    const gate = screen.getByRole("group");
    expect(gate).toBeEnabled();
    expect(gate).not.toHaveAttribute("aria-busy");
    const text = screen.getByRole("textbox", { name: "Text" });
    await user.clear(text);
    await user.type(text, "Mein Text");
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(text).toHaveValue("Mein Text");
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("ist bei einem Seitenwechsel im Browser sofort frei", () => {
    render(<Form />);
    expect(screen.getByRole("group")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Speichern" })).toBeEnabled();
  });

  // Der Grund für die Sperre. Ändert React das Verhalten, zeigt dieser Test es.
  it("ohne Sperre setzt React vor dem Hydrieren getippten Text zurück", () => {
    function Unguarded() {
      const [text, setText] = useState("Beispiel");
      return (
        <textarea
          aria-label="Text"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      );
    }
    const { container, hydrate } = serverRender(<Unguarded />);
    const text = within(container).getByRole("textbox", { name: "Text" });
    (text as HTMLTextAreaElement).value = "Mein Text";
    hydrate();
    expect(text).toHaveValue("Beispiel");
  });
});
