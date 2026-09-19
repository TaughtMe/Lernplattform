import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MentalMathApp } from "./mental-math-app";

const { put, list } = vi.hoisted(() => ({ put: vi.fn(), list: vi.fn() }));
beforeEach(() => {
  put.mockReset().mockResolvedValue(undefined);
  list.mockReset().mockResolvedValue([]);
});

vi.mock("../../src/storage/math-practice", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/storage/math-practice")>()),
  createMathPracticeRepository: () => ({
    put,
    list,
    reviews: vi.fn().mockResolvedValue([]),
  }),
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
    await waitFor(() => expect(screen.getByText("Richtig")).toBeVisible());
    await waitFor(() =>
      expect(screen.getByText("Gut gerechnet")).toBeVisible(),
    );
  });
});

it("keeps a failed save retryable and does not count it twice", async () => {
  const user = userEvent.setup();
  put.mockRejectedValueOnce(new Error("disk full"));
  render(<MentalMathApp />);
  await user.click(screen.getByRole("button", { name: "Eigene Aufgaben" }));
  const source = screen.getByRole("textbox", {
    name: "Eine Aufgabe pro Zeile",
  });
  await user.clear(source);
  await user.type(source, "7 * 8");
  await user.click(screen.getByRole("button", { name: "Runde starten" }));
  const answer = screen.getByRole("textbox", { name: "Dein Ergebnis" });
  await user.type(answer, "54{Enter}");
  await screen.findByRole("alert");
  expect(answer).toHaveValue("54");
  await user.click(screen.getByRole("button", { name: "Prüfen" }));
  await screen.findByText("Noch nicht – probiere es erneut.");
  expect(put.mock.calls[0]![0]).toEqual(put.mock.calls[1]![0]);
  await user.clear(answer);
  await user.type(answer, "56{Enter}");
  await screen.findByText("Gut gerechnet");
  expect(put.mock.calls[2]![0].assessment.selfCorrected).toBe(true);
  await user.click(
    screen.getByRole("button", { name: "Neue Runde zusammenstellen" }),
  );
  expect(
    screen.getByRole("button", {
      name: "Meine Fehler und Wiederholungen üben",
    }),
  ).toBeVisible();
});

it("shows a load failure instead of an empty history", async () => {
  list.mockRejectedValueOnce(new Error("storage unavailable"));
  render(<MentalMathApp />);
  expect(await screen.findByRole("alert")).toHaveTextContent("nicht geladen");
  expect(
    screen.queryByText("Hier erscheinen deine Fehler und Wiederholungen."),
  ).not.toBeInTheDocument();
});

it("marks solutions as help and allows a short round to end", async () => {
  const user = userEvent.setup();
  render(<MentalMathApp />);
  await user.click(screen.getByRole("button", { name: "Eigene Aufgaben" }));
  const source = screen.getByRole("textbox", {
    name: "Eine Aufgabe pro Zeile",
  });
  await user.clear(source);
  await user.type(source, "2 + 3");
  await user.click(screen.getByRole("button", { name: "Runde starten" }));
  await user.click(screen.getByRole("button", { name: "Lösung ansehen" }));
  await user.type(
    screen.getByRole("textbox", { name: "Dein Ergebnis" }),
    "5{Enter}",
  );
  await screen.findByText("Gut gerechnet");
  expect(put.mock.calls[0]![0].help).toBe("solution");
  expect(
    screen.getByRole("link", { name: "Für heute fertig" }),
  ).toHaveAttribute("href", "/");
});
