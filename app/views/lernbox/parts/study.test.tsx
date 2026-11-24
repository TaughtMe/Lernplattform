import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Study } from "./study";
import type { LbStudy, LernBoxScreenProps } from "./types";

function study(overrides: Partial<LbStudy> = {}): LbStudy {
  return {
    title: "Englisch Tiere",
    remaining: 3,
    modeLabel: "Auswahl",
    directionLabel: "Deutsch → Englisch",
    progress: 0.25,
    eyebrow: "Auf Englisch",
    box: 1,
    question: "Hund",
    mode: "choice",
    choices: ["tree", "dog", "cat"],
    answer: "",
    revealed: false,
    revealedAnswer: "",
    feedback: null,
    done: null,
    canSpeak: false,
    ...overrides,
  };
}

function setup(value: LbStudy) {
  const handlers = {
    onAnswer: vi.fn(),
    onCheck: vi.fn(),
    onEndSession: vi.fn(),
  };
  const props = {
    theme: "light",
    ...handlers,
  } as unknown as LernBoxScreenProps;
  const view = render(<Study {...props} study={value} />);
  return { ...handlers, view, props };
}

describe("Runde: Auswahlfrage", () => {
  it("zeigt die Antworten als beschriftete Radiogruppe und legt den Fokus auf die Frage", () => {
    setup(study());
    const group = screen.getByRole("group", {
      name: "Wähle die passende Antwort",
    });
    expect(within(group).getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "Hund" })).toHaveFocus();
    expect(screen.getByRole("button", { name: /^Prüfen/ })).toBeDisabled();
  });

  it("meldet die gewählte Antwort und prüft mit dem Knopf", async () => {
    const { onAnswer, onCheck, view, props } = setup(study());
    await userEvent.click(screen.getByRole("radio", { name: "dog" }));
    expect(onAnswer).toHaveBeenCalledWith("dog");
    view.rerender(<Study {...props} study={study({ answer: "dog" })} />);
    expect(screen.getByRole("radio", { name: "dog" })).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: /^Prüfen/ }));
    expect(onCheck).toHaveBeenCalledTimes(1);
  });

  it("zeigt bei Schreiben weiter das Eingabefeld und keine Radioknöpfe", () => {
    setup(study({ mode: "writing", choices: [] }));
    expect(screen.getByLabelText("Deine Antwort")).toHaveFocus();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
});
