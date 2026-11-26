import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TeacherExerciseCards } from "./teacher-exercise-cards";

afterEach(() => vi.restoreAllMocks());

describe("TeacherExerciseCards", () => {
  it("wählt nichts vor und lässt ohne Karte nicht drucken", () => {
    render(<TeacherExerciseCards />);
    expect(
      screen.getByText("Noch keine Karte.", { exact: false }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Bogen drucken" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Wortbox-Karte hinzufügen" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Rechenkarte hinzufügen" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: "Karte mit Aufgabenarten hinzufügen",
      }),
    ).toBeDisabled();
    for (const box of screen.getAllByRole("checkbox")) {
      expect(box).not.toBeChecked();
    }
  });

  it("stellt Karten zusammen, zeigt QR mit absoluter Adresse und druckt", async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const { container } = render(<TeacherExerciseCards />);

    await user.selectOptions(screen.getByLabelText("Wortbox"), [
      "double-consonants",
    ]);
    await user.selectOptions(screen.getByLabelText("Stufe"), ["3"]);
    await user.click(
      screen.getByRole("button", { name: "Wortbox-Karte hinzufügen" }),
    );

    await user.click(screen.getByRole("checkbox", { name: "Plus" }));
    await user.click(screen.getByRole("checkbox", { name: "Minus" }));
    await user.selectOptions(screen.getByLabelText("Zahlenraum"), ["100"]);
    await user.click(
      screen.getByRole("button", { name: "Rechenkarte hinzufügen" }),
    );

    await user.click(screen.getByRole("checkbox", { name: "Runden" }));
    await user.click(
      screen.getByRole("button", {
        name: "Karte mit Aufgabenarten hinzufügen",
      }),
    );

    const sheet = screen.getByRole("list", { name: "Bogen mit Übungskarten" });
    const cards = within(sheet).getAllByRole("listitem");
    expect(cards).toHaveLength(3);
    expect(within(sheet).getAllByText("Mit dem Tablet scannen")).toHaveLength(
      3,
    );
    expect(within(cards[1]!).getByText("Plus und Minus bis 100")).toBeVisible();
    expect(
      within(sheet).getByRole("img", {
        name: /QR-Code: Plus und Minus bis 100/,
      }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("svg")).not.toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Bogen drucken" }));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("entfernt Karten und fügt Duplikate nicht doppelt ein", async () => {
    const user = userEvent.setup();
    render(<TeacherExerciseCards />);
    await user.click(screen.getByRole("checkbox", { name: "Mal" }));
    await user.selectOptions(screen.getByLabelText("Zahlenraum"), ["20"]);
    const add = screen.getByRole("button", { name: "Rechenkarte hinzufügen" });
    await user.click(add);
    await user.click(add);
    expect(screen.getByText("1 von 12")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Mal bis 20 entfernen" }),
    );
    expect(screen.getByText("0 von 12")).toBeVisible();
    expect(
      screen.queryByRole("list", { name: "Bogen mit Übungskarten" }),
    ).toBeNull();
  });

  it("begrenzt den Bogen auf zwölf Karten", async () => {
    const user = userEvent.setup();
    render(<TeacherExerciseCards />);
    await user.selectOptions(screen.getByLabelText("Wortbox"), [
      "double-consonants",
    ]);
    for (const stage of ["1", "2", "3", "4", "5", "6"]) {
      await user.selectOptions(screen.getByLabelText("Stufe"), [stage]);
      await user.click(
        screen.getByRole("button", { name: "Wortbox-Karte hinzufügen" }),
      );
    }
    await user.selectOptions(screen.getByLabelText("Zahlenraum"), ["20"]);
    for (const name of ["Plus", "Minus", "Mal", "Geteilt"]) {
      await user.click(screen.getByRole("checkbox", { name }));
      await user.click(
        screen.getByRole("button", { name: "Rechenkarte hinzufügen" }),
      );
    }
    for (const name of ["Runden", "Große Zahlen"]) {
      await user.click(screen.getByRole("checkbox", { name }));
      await user.click(
        screen.getByRole("button", {
          name: "Karte mit Aufgabenarten hinzufügen",
        }),
      );
    }
    expect(screen.getByText("12 von 12")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Wortbox-Karte hinzufügen" }),
    ).toBeDisabled();
    expect(
      screen.getByText("Der Bogen ist voll.", { exact: false }),
    ).toBeVisible();
  });
});
