import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  VocabularyEditor,
  type VocabularyEditorProps,
  type VocabularyTransfer,
} from "./vocabulary-editor";

const base = (transfer: VocabularyTransfer): VocabularyEditorProps => ({
  pairs: [
    {
      id: "a",
      left: { primary: "Haus", alternatives: [] },
      right: { primary: "house", alternatives: [] },
      tag: "Unit 3",
    },
  ],
  languages: [
    { locale: "de-DE", label: "Deutsch" },
    { locale: "en-GB", label: "Englisch" },
  ],
  locales: { left: "de-DE", right: "en-GB" },
  direction: "left-to-right",
  caseSensitive: false,
  transfer,
  tableInput: "",
});

describe("VocabularyEditor, Tag-Feld", () => {
  it("zeigt das Tag je Vokabel auch ohne LernBox-Übernahme", () => {
    render(<VocabularyEditor {...base("none")} />);
    const tag = screen.getByRole("textbox", { name: "Tag Vokabel 1" });
    expect(tag).toHaveValue("Unit 3");
    expect(tag).toHaveAttribute("placeholder", "Tag (optional, z. B. Unit 3)");
    // „Tag für diese Runde“ hängt weiter an der LernBox-Übernahme.
    expect(screen.queryByText("Tag für diese Runde")).not.toBeInTheDocument();
  });

  it("zeigt „Tag für diese Runde“ mit LernBox-Übernahme", () => {
    render(<VocabularyEditor {...base("errors")} />);
    expect(screen.getByText("Tag für diese Runde")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Tag Vokabel 1" }),
    ).toHaveAttribute("placeholder", "Eigener Tag (optional)");
  });

  it("erklärt die dritte Spalte der Tabelle", () => {
    render(<VocabularyEditor {...base("none")} />);
    expect(screen.getByText(/dritte Spalte ist der Tag/)).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Tabelle einfügen" }),
    ).toHaveAttribute("placeholder", "Haus\thome | house\tUnit 3\nBaum\ttree");
  });

  it("bietet Anleitung und Vorlage zum Herunterladen", async () => {
    const createObjectURL = vi.fn(() => "blob:vorlage");
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    render(<VocabularyEditor {...base("none")} />);
    expect(
      screen.getByText("So ist die Tabelle aufgebaut").closest("details"),
    ).not.toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Vorlage herunterladen" }),
    );
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

  it("bietet „Komma trennt Alternativen“ nur bei Kommas in der Tabelle an", async () => {
    const onCommaSeparates = vi.fn();
    const { rerender } = render(
      <VocabularyEditor
        {...base("none")}
        tableInput="Haus;home"
        onCommaSeparates={onCommaSeparates}
      />,
    );
    expect(screen.queryByLabelText(/Komma trennt Alternativen/)).toBeNull();

    rerender(
      <VocabularyEditor
        {...base("none")}
        tableInput="groß;groß, riesig"
        commaSeparates={false}
        onCommaSeparates={onCommaSeparates}
      />,
    );
    const toggle = screen.getByLabelText(/Komma trennt Alternativen/);
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    expect(onCommaSeparates).toHaveBeenCalledWith(true);
  });
});

describe("VocabularyEditor, Gilt auch", () => {
  const withPairs = (
    pairs: VocabularyEditorProps["pairs"],
  ): VocabularyEditorProps => ({ ...base("none"), pairs });

  it("zeigt nichts, solange nur eine Antwort gilt", () => {
    render(<VocabularyEditor {...base("none")} />);
    expect(screen.queryByText(/Gilt auch:/)).not.toBeInTheDocument();
  });

  it("zeigt Klammerteile, / und weitere Antworten für beide Seiten", () => {
    render(
      <VocabularyEditor
        {...withPairs([
          {
            id: "a",
            left: { primary: "gehen", alternatives: [] },
            right: { primary: "(to) go", alternatives: ["walk"] },
          },
          {
            id: "b",
            left: { primary: "Haus / Heim", alternatives: [] },
            right: { primary: "house", alternatives: [] },
          },
        ])}
      />,
    );
    expect(
      screen.getByText("Gilt auch: to go · go · walk"),
    ).toBeInTheDocument();
    expect(screen.getByText("Gilt auch: Haus · Heim")).toBeInTheDocument();
    expect(screen.getAllByText(/Gilt auch:/)).toHaveLength(2);
  });

  it("macht die Wirkung von „groß | riesig“ nach dem Übernehmen sichtbar", () => {
    render(
      <VocabularyEditor
        {...withPairs([
          {
            id: "a",
            left: { primary: "big", alternatives: [] },
            right: { primary: "groß", alternatives: ["riesig"] },
          },
        ])}
      />,
    );
    expect(screen.getByText("Gilt auch: riesig")).toBeInTheDocument();
  });
});
