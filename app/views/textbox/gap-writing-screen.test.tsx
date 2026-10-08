import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { layoutText } from "../../../src/domain/text-compare";
import { GapWritingScreen } from "./gap-writing-screen";

const tokens = layoutText("Der Hund bellt laut, die Katze schläft.");
// Lücken bei „Hund“, „laut“ und „Katze“.
const blanked = [1, 3, 5];

function setup(onSubmit = vi.fn()) {
  render(
    <GapWritingScreen
      round={1}
      title="Test"
      tokens={tokens}
      blanked={blanked}
      onSubmit={onSubmit}
    />,
  );
  return {
    onSubmit,
    gaps: screen.getAllByRole("textbox") as HTMLInputElement[],
  };
}

describe("GapWritingScreen", () => {
  it("beschriftet die Lücken, zeigt Satzzeichen und startet in der ersten Lücke", () => {
    const { gaps } = setup();
    expect(gaps.map((g) => g.getAttribute("aria-label"))).toEqual([
      "Lücke 1 von 3",
      "Lücke 2 von 3",
      "Lücke 3 von 3",
    ]);
    expect(gaps[0]).toHaveFocus();
    expect(screen.getByText(/bellt/)).toBeInTheDocument();
    expect(screen.getByText(/,/)).toBeInTheDocument();
    // Das gesuchte Wort steht nirgends im Dokument.
    expect(screen.queryByText(/Hund/)).not.toBeInTheDocument();
  });

  it("springt mit Leertaste, Eingabetaste und Tab zur nächsten Lücke", async () => {
    const user = userEvent.setup();
    const { gaps } = setup();
    await user.keyboard("Hund ");
    expect(gaps[0]).toHaveValue("Hund");
    expect(gaps[1]).toHaveFocus();
    await user.keyboard("laut{Enter}");
    expect(gaps[1]).toHaveValue("laut");
    expect(gaps[2]).toHaveFocus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(gaps[1]).toHaveFocus();
    await user.keyboard("{Tab}");
    expect(gaps[2]).toHaveFocus();
  });

  it("springt mit der Rücktaste in einer leeren Lücke zurück", async () => {
    const user = userEvent.setup();
    const { gaps } = setup();
    await user.click(gaps[1]!);
    await user.keyboard("{Backspace}");
    expect(gaps[0]).toHaveFocus();
    // In einer gefüllten Lücke löscht die Rücktaste nur ein Zeichen.
    await user.keyboard("ab{Tab}x{Backspace}");
    expect(gaps[1]).toHaveFocus();
    expect(gaps[1]).toHaveValue("");
  });

  it("wählt jede Lücke per Klick und springt nicht von selbst weiter", async () => {
    const user = userEvent.setup();
    const { gaps } = setup();
    await user.click(gaps[2]!);
    expect(gaps[2]).toHaveFocus();
    await user.keyboard("Katze");
    expect(gaps[2]).toHaveFocus();
  });

  it("springt auch, wenn die Tastatur ein Leerzeichen als Text meldet", () => {
    const { gaps } = setup();
    fireEvent.change(gaps[0]!, { target: { value: "Hund " } });
    expect(gaps[0]).toHaveValue("Hund");
    expect(gaps[1]).toHaveFocus();
  });

  it("sperrt Einfügen, Ablegen und Autokorrektur", async () => {
    const user = userEvent.setup();
    const { gaps } = setup();
    await user.click(gaps[0]!);
    await user.paste("Hund");
    expect(gaps[0]).toHaveValue("");
    const dropped = fireEvent.drop(gaps[0]!);
    expect(dropped).toBe(false);
    expect(gaps[0]).toHaveAttribute("autocomplete", "off");
    expect(gaps[0]).toHaveAttribute("spellcheck", "false");
    expect(gaps[0]).toHaveAttribute("autocapitalize", "none");
  });

  it("prüft auch mit leeren Lücken und meldet die Eingaben", async () => {
    const user = userEvent.setup();
    const { gaps, onSubmit } = setup();
    await user.click(screen.getByRole("button", { name: "Prüfen" }));
    expect(onSubmit).toHaveBeenCalledWith(["", "", ""], 0);
    await user.click(gaps[0]!);
    await user.keyboard("Hunt");
    await user.click(screen.getByRole("button", { name: "Prüfen" }));
    const [inputs, writingMs] = onSubmit.mock.calls[1]!;
    expect(inputs).toEqual(["Hunt", "", ""]);
    expect(writingMs).toBeGreaterThanOrEqual(0);
  });

  it("gibt Fokus nach der letzten Lücke an „Prüfen“", async () => {
    const user = userEvent.setup();
    setup();
    await user.keyboard("a b c ");
    expect(screen.getByRole("button", { name: "Prüfen" })).toHaveFocus();
  });

  it("begrenzt die Länge einer Lücke", () => {
    const { gaps } = setup();
    for (const gap of gaps) expect(gap).toHaveAttribute("maxlength", "40");
  });
});
