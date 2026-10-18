import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
