import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MentalMathApp } from "./mental-math-app";

vi.mock("../../src/storage/personal-learning-events", () => ({
  createPersonalLearningEventRepository: () => ({ put: vi.fn() }),
}));

describe("MentalMathApp", () => {
  it("exposes the complete Laufdiktat math configuration", async () => {
    const user = userEvent.setup();
    render(<MentalMathApp />);
    expect(screen.getByRole("button", { name: /Plus/ })).toBeVisible();
    expect(screen.getByRole("spinbutton", { name: "Von" })).toBeVisible();
    expect(
      screen.getByRole("checkbox", { name: "Lückenaufgaben" }),
    ).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: "Lückenaufgaben" }));
    expect(
      screen.getByRole("combobox", { name: "Lückenposition" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Mal/ }));
    expect(
      screen.getByRole("group", { name: /Einmaleins-Reihen/ }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "7" })).toBeVisible();
  });

  it("accepts safe custom expressions and starts a keyboard-first round", async () => {
    const user = userEvent.setup();
    render(<MentalMathApp />);
    await user.click(screen.getByRole("button", { name: "Eigene Aufgaben" }));
    const source = screen.getByRole("textbox", {
      name: "Eine Aufgabe pro Zeile",
    });
    await user.clear(source);
    await user.type(source, "2^3");
    expect(screen.getByText(/1 gültige Aufgabe/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Runde starten" }));
    const answer = screen.getByRole("textbox", { name: "Dein Ergebnis" });
    expect(answer).toHaveFocus();
    await user.type(answer, "8{Enter}");
    expect(screen.getByText("✓ Richtig")).toBeVisible();
    await waitFor(() =>
      expect(screen.getByText("Gut gerechnet")).toBeVisible(),
    );
  });
});
