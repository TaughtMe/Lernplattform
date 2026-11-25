import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudentList } from "./classes-screen";

afterEach(cleanup);

describe("Schülerliste: Namensliste einfügen (L25-11)", () => {
  it("legt alle neuen Namen auf einmal an und lässt vorhandene weg", async () => {
    const onAddMany = vi.fn((names: string[]) => names.length);
    render(
      <StudentList
        students={[{ id: "1", name: "Alex", writingRelief: false }]}
        onAdd={() => undefined}
        onAddMany={onAddMany}
      />,
    );
    await userEvent.click(screen.getByText("Namensliste einfügen"));
    await userEvent.type(
      screen.getByLabelText(/Ein Name pro Zeile/),
      "alex{enter}Ben{enter}Cem",
    );
    expect(
      screen.getByText("2 neue Namen · 1 Name ist schon da"),
    ).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "2 hinzufügen" }));
    expect(onAddMany).toHaveBeenCalledWith(["Ben", "Cem"]);
    await waitFor(() =>
      expect(screen.getByLabelText(/Ein Name pro Zeile/)).toHaveValue(""),
    );
  });

  it("lässt nicht gespeicherte Namen im Feld stehen", async () => {
    // Nur der erste Name wurde gespeichert.
    const onAddMany = vi.fn(async () => 1);
    render(
      <StudentList
        students={[]}
        onAdd={() => undefined}
        onAddMany={onAddMany}
      />,
    );
    await userEvent.click(screen.getByText("Namensliste einfügen"));
    await userEvent.type(
      screen.getByLabelText(/Ein Name pro Zeile/),
      "Ben{enter}Cem{enter}Dana",
    );
    await userEvent.click(screen.getByRole("button", { name: "3 hinzufügen" }));
    await waitFor(() =>
      expect(screen.getByLabelText(/Ein Name pro Zeile/)).toHaveValue(
        "Cem\nDana",
      ),
    );
  });

  it("zeigt das Einfügen nicht bei archivierten Klassen", () => {
    render(<StudentList students={[]} readOnly onAddMany={() => 0} />);
    expect(screen.queryByText("Namensliste einfügen")).toBeNull();
  });
});
