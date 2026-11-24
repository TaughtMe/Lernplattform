import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StartSheet } from "./start-sheet";
import type { LbDeck, LernBoxScreenProps } from "./types";

function deck(total: number): LbDeck {
  return {
    id: "stapel",
    title: "Englisch Tiere",
    folderId: null,
    total,
    due: 0,
    fresh: total,
    state: "new",
    boxes: [total, 0, 0, 0, 0],
    longUnpracticed: 0,
    sourceLabel: "eigene",
    frontLabel: "Deutsch",
    backLabel: "Englisch",
  };
}

function renderSheet(
  scope: string,
  options: { total?: number; formsVisible?: boolean } = {},
) {
  const onStart = vi.fn();
  const onStartForm = vi.fn();
  const props = {
    decks: [deck(options.total ?? 4)],
    dueTotal: 0,
    errorCount: 0,
    mode: "writing",
    direction: "forward",
    directionLabelsFor: () => ({
      forward: "Deutsch → Englisch",
      reverse: "Englisch → Deutsch",
    }),
    formsVisible: options.formsVisible ?? true,
    onStart,
    onStartForm,
  } as unknown as LernBoxScreenProps;
  render(<StartSheet {...props} scope={scope} />);
  return { onStart, onStartForm };
}

const modeButton = (name: string) => screen.queryByRole("button", { name });

describe("LernBox: Start-Fenster mit Lernformen", () => {
  it("bietet Zuordnen und Test ab vier Karten eines Stapels an", () => {
    renderSheet("stapel");
    expect(modeButton("Zuordnen")).toBeVisible();
    expect(modeButton("Test")).toBeVisible();
    expect(modeButton("Schreiben")).toBeVisible();
    expect(modeButton("Mündlich")).toBeVisible();
  });

  it("zeigt bei drei Karten weder Zuordnen noch Test", () => {
    renderSheet("stapel", { total: 3 });
    expect(modeButton("Zuordnen")).not.toBeInTheDocument();
    expect(modeButton("Test")).not.toBeInTheDocument();
  });

  it("zeigt ohne Freigabe weder Zuordnen noch Test", () => {
    renderSheet("stapel", { formsVisible: false });
    expect(modeButton("Zuordnen")).not.toBeInTheDocument();
    expect(modeButton("Test")).not.toBeInTheDocument();
  });

  it.each(["heute", "errors", "box:2"])(
    "zeigt für %s weder Zuordnen noch Test",
    (scope) => {
      renderSheet(scope);
      expect(modeButton("Zuordnen")).not.toBeInTheDocument();
      expect(modeButton("Test")).not.toBeInTheDocument();
    },
  );

  it("blendet bei Zuordnen die Richtungswahl aus und startet die Lernform", async () => {
    const { onStart, onStartForm } = renderSheet("stapel");
    await userEvent.click(screen.getByRole("button", { name: "Zuordnen" }));
    expect(screen.queryByText("Richtung")).not.toBeInTheDocument();
    expect(
      screen.getByText("Finde die Paare. Nur üben, nichts wird verschoben."),
    ).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: /Los geht/ }));
    expect(onStartForm).toHaveBeenCalledWith({
      scope: "stapel",
      form: "match",
      direction: "forward",
    });
    expect(onStart).not.toHaveBeenCalled();
  });

  it("startet den Test mit der gewählten Richtung", async () => {
    const { onStart, onStartForm } = renderSheet("stapel");
    await userEvent.click(screen.getByRole("button", { name: "Test" }));
    await userEvent.click(screen.getByRole("button", { name: "Gemischt" }));
    await userEvent.click(screen.getByRole("button", { name: /Los geht/ }));
    expect(onStartForm).toHaveBeenCalledWith({
      scope: "stapel",
      form: "test",
      direction: "mixed",
    });
    expect(onStart).not.toHaveBeenCalled();
  });

  it("startet Schreiben weiter über onStart", async () => {
    const { onStart, onStartForm } = renderSheet("stapel");
    await userEvent.click(screen.getByRole("button", { name: /Los geht/ }));
    expect(onStart).toHaveBeenCalledWith({
      scope: "stapel",
      mode: "writing",
      direction: "forward",
    });
    expect(onStartForm).not.toHaveBeenCalled();
  });
});
