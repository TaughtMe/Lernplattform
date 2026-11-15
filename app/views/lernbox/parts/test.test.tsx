import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TestQuestion } from "../../../../src/domain/learning-box-forms";
import { Test } from "./test";
import type { LbTest, LernBoxScreenProps } from "./types";

const written: TestQuestion = {
  id: "haus:forward",
  kind: "written",
  cardId: "haus",
  direction: "forward",
  prompt: "Haus",
  expected: "house",
  expectedLabel: "house",
  options: [],
  correctOption: -1,
};
const choice: TestQuestion = {
  id: "hund:forward",
  kind: "choice",
  cardId: "hund",
  direction: "forward",
  prompt: "Hund",
  expected: "dog",
  expectedLabel: "dog",
  options: ["tree", "dog", "cat"],
  correctOption: 1,
};

function setup(questions: TestQuestion[], counted = 0, notice = "") {
  const handlers = {
    onEndSession: vi.fn(),
    onFormFinished: vi.fn(),
    onTestAnswer: vi.fn(),
    onPracticeMissed: vi.fn(),
  };
  const test: LbTest = {
    title: "Englisch Tiere",
    testKey: "test-1",
    questions,
    counted,
  };
  const props = {
    theme: "light",
    notice,
    ...handlers,
  } as unknown as LernBoxScreenProps;
  render(<Test {...props} test={test} />);
  return handlers;
}

const next = () => screen.getByRole("button", { name: "Weiter" });

describe("Test (Ansicht)", () => {
  it("sperrt „Weiter“ ohne Eingabe und wertet eine Schreibfrage mit Enter genau einmal", async () => {
    const { onTestAnswer } = setup([written, choice]);
    expect(next()).toBeDisabled();
    const field = screen.getByLabelText("Deine Antwort");
    expect(field).toHaveFocus();
    await userEvent.type(field, "house{Enter}");
    expect(onTestAnswer).toHaveBeenCalledTimes(1);
    expect(onTestAnswer).toHaveBeenCalledWith(written, true);
  });

  it("wertet eine falsche Schreibantwort als falsch", async () => {
    const { onTestAnswer } = setup([written, choice]);
    await userEvent.type(screen.getByLabelText("Deine Antwort"), "hause");
    await userEvent.click(next());
    expect(onTestAnswer).toHaveBeenCalledWith(written, false);
  });

  it("zeigt eine Auswahlfrage als beschriftete Radiogruppe und wertet die gewählte Antwort", async () => {
    const { onTestAnswer } = setup([choice, written]);
    const group = screen.getByRole("group", {
      name: "Wähle die passende Antwort",
    });
    expect(within(group).getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "Hund" })).toHaveFocus();
    expect(next()).toBeDisabled();
    await userEvent.click(screen.getByRole("radio", { name: "dog" }));
    await userEvent.click(next());
    expect(onTestAnswer).toHaveBeenCalledWith(choice, true);
  });

  it("wertet „Weiß ich nicht“ als falsch und geht weiter", async () => {
    const { onTestAnswer } = setup([choice, written]);
    await userEvent.click(
      screen.getByRole("button", { name: "Weiß ich nicht" }),
    );
    expect(onTestAnswer).toHaveBeenCalledWith(choice, false);
    expect(screen.getByLabelText("Deine Antwort")).toBeVisible();
  });

  it("zeigt zwischen den Fragen keine Rückmeldung", async () => {
    setup([written, choice]);
    await userEvent.type(
      screen.getByLabelText("Deine Antwort"),
      "house{Enter}",
    );
    expect(screen.queryByText(/richtig|falsch|gewusst/i)).toBeNull();
    expect(screen.getByText("Test · Frage 2 von 2")).toBeVisible();
  });

  it("zeigt das Ergebnis mit den falschen Fragen und der Wirkung auf die Boxen", async () => {
    const { onFormFinished } = setup([written, choice], 1);
    await userEvent.type(
      screen.getByLabelText("Deine Antwort"),
      "hause{Enter}",
    );
    await userEvent.click(screen.getByRole("radio", { name: "dog" }));
    await userEvent.click(next());
    expect(
      screen.getByRole("heading", { name: "Test geschafft" }),
    ).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("1 von 2 richtig");
    expect(
      screen.getByText("1 geschriebene Antwort hat für deine Boxen gezählt."),
    ).toBeVisible();
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(within(list).getByText("house")).toBeVisible();
    expect(within(list).getByText("hause")).toBeVisible();
    expect(onFormFinished).toHaveBeenCalledTimes(1);
  });

  it("sagt bei „Weiß ich nicht“ „keine Antwort“ und nennt, dass nichts gezählt hat", async () => {
    setup([written, choice], 0);
    await userEvent.click(
      screen.getByRole("button", { name: "Weiß ich nicht" }),
    );
    await userEvent.click(screen.getByRole("radio", { name: "dog" }));
    await userEvent.click(next());
    expect(screen.getByText("Du: keine Antwort")).toBeVisible();
    expect(
      screen.getByText("Für deine Boxen hat nichts gezählt. Das war nur Üben."),
    ).toBeVisible();
  });

  it("übt mit „Diese Karten jetzt üben“ genau die falschen Karten", async () => {
    const { onPracticeMissed } = setup([written, choice]);
    await userEvent.type(screen.getByLabelText("Deine Antwort"), "x{Enter}");
    await userEvent.click(screen.getByRole("radio", { name: "dog" }));
    await userEvent.click(next());
    await userEvent.click(
      screen.getByRole("button", { name: "Diese Karten jetzt üben" }),
    );
    expect(onPracticeMissed).toHaveBeenCalledWith([
      { cardId: "haus", direction: "forward" },
    ]);
  });

  it("zeigt ohne Fehler „Alles richtig“ und keinen Übungsknopf", async () => {
    const { onEndSession } = setup([written, choice]);
    await userEvent.type(
      screen.getByLabelText("Deine Antwort"),
      "house{Enter}",
    );
    await userEvent.click(screen.getByRole("radio", { name: "dog" }));
    await userEvent.click(next());
    expect(screen.getByText("Alles richtig")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Diese Karten jetzt üben" }),
    ).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Zur LernBox" }));
    expect(onEndSession).toHaveBeenCalledTimes(1);
  });

  it("zeigt einen Speicherfehler auch während des Tests", () => {
    setup([written], 0, "Die Antwort konnte nicht gespeichert werden.");
    expect(
      screen
        .getAllByRole("status")
        .some(
          (node) =>
            node.textContent === "Die Antwort konnte nicht gespeichert werden.",
        ),
    ).toBe(true);
  });
});
