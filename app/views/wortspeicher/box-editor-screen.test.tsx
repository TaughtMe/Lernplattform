import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BoxEditorScreen } from "./box-editor-screen";

const TIP = "Tipp: Nomen mit Artikel eintragen, z. B. „das Essen“.";

function setup(words: string[] = []) {
  const onAddWords = vi.fn();
  render(
    <BoxEditorScreen
      title="Meine Wörter"
      kind="eigen"
      words={words}
      ready
      onBack={() => undefined}
      onAddWords={onAddWords}
    />,
  );
  return {
    onAddWords,
    field: screen.getByLabelText(/Wort hinzufügen/),
  };
}

describe("BoxEditorScreen: Nomen mit Artikel", () => {
  it("zeigt den Tipp für ein bekanntes Nomen ohne Artikel, ohne es zu verbieten", async () => {
    const user = userEvent.setup();
    const { field, onAddWords } = setup();
    await user.type(field, "Hund");
    expect(screen.getByText(TIP)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hinzufügen" }));
    expect(onAddWords).toHaveBeenCalledWith("Hund");
    // Nach dem Hinzufügen bleibt der Tipp stehen, bis das Kind weitertippt.
    expect(screen.getByText(TIP)).toBeInTheDocument();
    await user.type(field, "x");
    expect(screen.queryByText(TIP)).not.toBeInTheDocument();
  });

  it("schweigt bei „der Hund“, „das Essen“ und kleingeschriebenen Wörtern", async () => {
    const user = userEvent.setup();
    const { field, onAddWords } = setup();
    for (const text of ["der Hund", "das Essen", "essen"]) {
      await user.clear(field);
      await user.type(field, text);
      expect(screen.queryByText(TIP)).not.toBeInTheDocument();
    }
    await user.clear(field);
    await user.type(field, "das Essen");
    await user.click(screen.getByRole("button", { name: "Hinzufügen" }));
    expect(onAddWords).toHaveBeenCalledWith("das Essen");
    expect(screen.queryByText(TIP)).not.toBeInTheDocument();
  });
});
