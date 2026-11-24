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
  const onStartMixed = vi.fn();
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
    onStartMixed,
  } as unknown as LernBoxScreenProps;
  render(<StartSheet {...props} scope={scope} />);
  return { onStart, onStartForm, onStartMixed };
}

const modeButton = (name: string) => screen.queryByRole("button", { name });
const tap = (name: string) =>
  userEvent.click(screen.getByRole("button", { name }));

describe("LernBox: Start-Fenster mit Fragearten und Zuordnen", () => {
  it("bietet Auswahl und Zuordnen ab vier Karten eines Stapels an", () => {
    renderSheet("stapel");
    expect(modeButton("Auswahl")).toBeVisible();
    expect(modeButton("Zuordnen")).toBeVisible();
    expect(modeButton("Schreiben")).toBeVisible();
    expect(modeButton("Mündlich")).toBeVisible();
    // Der frühere „Test“ ist in der Auswahl aufgegangen.
    expect(modeButton("Test")).not.toBeInTheDocument();
  });

  it("zeigt bei drei Karten weder Auswahl noch Zuordnen", () => {
    renderSheet("stapel", { total: 3 });
    expect(modeButton("Auswahl")).not.toBeInTheDocument();
    expect(modeButton("Zuordnen")).not.toBeInTheDocument();
    expect(modeButton("Schreiben")).toBeVisible();
  });

  it("zeigt ohne Freigabe weder Auswahl noch Zuordnen", () => {
    renderSheet("stapel", { formsVisible: false });
    expect(modeButton("Auswahl")).not.toBeInTheDocument();
    expect(modeButton("Zuordnen")).not.toBeInTheDocument();
  });

  it.each(["heute", "errors", "box:2"])(
    "zeigt für %s nur Schreiben und Mündlich",
    (scope) => {
      renderSheet(scope);
      expect(modeButton("Auswahl")).not.toBeInTheDocument();
      expect(modeButton("Zuordnen")).not.toBeInTheDocument();
      expect(modeButton("Schreiben")).toBeVisible();
      expect(modeButton("Mündlich")).toBeVisible();
    },
  );

  it("blendet bei Zuordnen die Richtungswahl aus und startet die Lernform", async () => {
    const { onStart, onStartForm, onStartMixed } = renderSheet("stapel");
    await tap("Zuordnen");
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
    expect(onStartMixed).not.toHaveBeenCalled();
  });

  it("startet Schreiben weiter über onStart", async () => {
    const { onStart, onStartForm, onStartMixed } = renderSheet("stapel");
    await userEvent.click(screen.getByRole("button", { name: /Los geht/ }));
    expect(onStart).toHaveBeenCalledWith({
      scope: "stapel",
      mode: "writing",
      direction: "forward",
    });
    expect(onStartForm).not.toHaveBeenCalled();
    expect(onStartMixed).not.toHaveBeenCalled();
  });

  it("ersetzt mit dem ersten Tipp die Vorgabe: Mündlich allein startet wie bisher", async () => {
    const { onStart, onStartMixed } = renderSheet("stapel");
    await tap("Mündlich");
    expect(modeButton("Schreiben")).toHaveAttribute("aria-pressed", "false");
    expect(modeButton("Mündlich")).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: /Los geht/ }));
    expect(onStart).toHaveBeenCalledWith({
      scope: "stapel",
      mode: "oral",
      direction: "forward",
    });
    expect(onStartMixed).not.toHaveBeenCalled();
  });

  it("mischt mehrere Fragearten und gibt sie in fester Reihenfolge weiter", async () => {
    const { onStart, onStartMixed } = renderSheet("stapel");
    await tap("Auswahl");
    await tap("Schreiben");
    await tap("Mündlich");
    for (const name of ["Schreiben", "Mündlich", "Auswahl"]) {
      expect(modeButton(name)).toHaveAttribute("aria-pressed", "true");
    }
    expect(modeButton("Zuordnen")).toHaveAttribute("aria-pressed", "false");
    await tap("Gemischt");
    await userEvent.click(screen.getByRole("button", { name: /Los geht/ }));
    expect(onStartMixed).toHaveBeenCalledWith({
      scope: "stapel",
      kinds: ["writing", "oral", "choice"],
      direction: "mixed",
    });
    expect(onStart).not.toHaveBeenCalled();
  });

  it("startet Auswahl allein als gemischte Runde mit einer Art", async () => {
    const { onStart, onStartMixed } = renderSheet("stapel");
    await tap("Auswahl");
    await userEvent.click(screen.getByRole("button", { name: /Los geht/ }));
    expect(onStartMixed).toHaveBeenCalledWith({
      scope: "stapel",
      kinds: ["choice"],
      direction: "forward",
    });
    expect(onStart).not.toHaveBeenCalled();
  });

  it("lässt mindestens eine Frageart gewählt", async () => {
    renderSheet("stapel");
    await tap("Schreiben");
    await tap("Schreiben");
    expect(modeButton("Schreiben")).toHaveAttribute("aria-pressed", "true");
    await tap("Mündlich");
    await tap("Schreiben");
    expect(modeButton("Schreiben")).toHaveAttribute("aria-pressed", "false");
    await tap("Mündlich");
    expect(modeButton("Mündlich")).toHaveAttribute("aria-pressed", "true");
  });

  it("wechselt von Zuordnen zu einer Frageart und zurück", async () => {
    const { onStartMixed, onStartForm } = renderSheet("stapel");
    await tap("Zuordnen");
    await tap("Auswahl");
    expect(modeButton("Zuordnen")).toHaveAttribute("aria-pressed", "false");
    expect(modeButton("Auswahl")).toHaveAttribute("aria-pressed", "true");
    await tap("Zuordnen");
    for (const name of ["Schreiben", "Mündlich", "Auswahl"]) {
      expect(modeButton(name)).toHaveAttribute("aria-pressed", "false");
    }
    await userEvent.click(screen.getByRole("button", { name: /Los geht/ }));
    expect(onStartForm).toHaveBeenCalledTimes(1);
    expect(onStartMixed).not.toHaveBeenCalled();
  });

  it("nennt bei Auswahl, dass die Boxen unverändert bleiben", async () => {
    renderSheet("stapel");
    await tap("Auswahl");
    expect(screen.getByText(/Das ändert deine Boxen nicht/)).toBeVisible();
  });
});
