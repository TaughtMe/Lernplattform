import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildVocabularyTemplate } from "../../../../src/domain/vocabulary-import";
import { ImportSheet } from "./import-sheet";
import type { LbImportInput, LernBoxScreenProps } from "./types";

const DECK = {
  id: "deck-1",
  title: "Unit 1",
  folderId: null,
  total: 0,
  due: 0,
  boxes: [0, 0, 0, 0, 0],
  sourceLabel: "eigene",
  frontLabel: "Deutsch",
  backLabel: "Englisch",
};

function renderSheet(
  onImportCards: (deckId: string, input: LbImportInput) => Promise<string>,
) {
  const props = {
    decks: [DECK],
    languages: [],
    folders: [],
    onImportCards,
    onCloseSheet: vi.fn(),
  } as unknown as LernBoxScreenProps;
  return render(<ImportSheet {...props} />);
}

const typeRow = async (
  user: ReturnType<typeof userEvent.setup>,
  no: number,
  front: string,
  back: string,
) => {
  await user.type(screen.getByLabelText(`Vorderseite, Zeile ${no}`), front);
  await user.type(screen.getByLabelText(`Rückseite, Zeile ${no}`), back);
};

describe("ImportSheet", () => {
  it("starts with five typed rows and labelled, correction-free fields", () => {
    renderSheet(vi.fn());
    const field = screen.getByLabelText("Vorderseite, Zeile 5");
    expect(screen.getByLabelText("Rückseite, Zeile 1")).toBeTruthy();
    expect(screen.getByLabelText("Tag, Zeile 3")).toBeTruthy();
    expect(screen.queryByLabelText("Vorderseite, Zeile 6")).toBeNull();
    expect(field.getAttribute("autocapitalize")).toBe("off");
    expect(field.getAttribute("autocorrect")).toBe("off");
    expect(field.getAttribute("spellcheck")).toBe("false");
    expect(
      (
        screen.getByRole("button", {
          name: "Vorschau ansehen",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("previews two typed rows and hands them over only after Übernehmen", async () => {
    const user = userEvent.setup();
    const onImportCards = vi.fn(async () => "2 Vokabeln importiert.");
    renderSheet(onImportCards);
    await typeRow(user, 1, "Haus", "home | house");
    await user.type(screen.getByLabelText("Tag, Zeile 1"), "Nomen");
    await typeRow(user, 2, "laufen", "to run");
    await user.click(screen.getByRole("button", { name: "Vorschau ansehen" }));

    expect(screen.getByText("2 Vokabeln erkannt")).toBeTruthy();
    expect(screen.getByText("Haus → home | house")).toBeTruthy();
    expect(screen.getByText("Nomen")).toBeTruthy();
    expect(onImportCards).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Übernehmen" }));
    expect(onImportCards).toHaveBeenCalledWith("deck-1", {
      rows: [
        { question: "Haus", answer: "home | house", tag: "Nomen" },
        { question: "laufen", answer: "to run" },
      ],
      skipped: [],
    });
    expect((await screen.findByRole("status")).textContent).toBe(
      "2 Vokabeln importiert.",
    );
    // Danach wieder leere Eingabe.
    expect(
      (screen.getByLabelText("Vorderseite, Zeile 1") as HTMLInputElement).value,
    ).toBe("");
  });

  it("names skipped typed rows with their reason and ignores empty rows", async () => {
    const user = userEvent.setup();
    const onImportCards = vi.fn(async () => "ok");
    renderSheet(onImportCards);
    await typeRow(user, 1, "Haus", "home");
    await user.type(screen.getByLabelText("Vorderseite, Zeile 3"), "Baum");
    await user.click(screen.getByRole("button", { name: "Vorschau ansehen" }));
    expect(screen.getByText("1 Vokabel erkannt")).toBeTruthy();
    expect(screen.getByText("1 Zeile wird übersprungen")).toBeTruthy();
    expect(screen.getByText(/Zeile 3: Rückseite leer/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Übernehmen" }));
    expect(onImportCards).toHaveBeenCalledWith("deck-1", {
      rows: [{ question: "Haus", answer: "home" }],
      skipped: [3],
    });
  });

  it("goes back from the preview without saving", async () => {
    const user = userEvent.setup();
    const onImportCards = vi.fn(async () => "ok");
    renderSheet(onImportCards);
    await typeRow(user, 1, "Haus", "home");
    await user.click(screen.getByRole("button", { name: "Vorschau ansehen" }));
    await user.click(screen.getByRole("button", { name: "Zurück" }));
    expect(
      (screen.getByLabelText("Vorderseite, Zeile 1") as HTMLInputElement).value,
    ).toBe("Haus");
    expect(onImportCards).not.toHaveBeenCalled();
  });

  it("moves with Enter and adds a focused row after the last answer", async () => {
    const user = userEvent.setup();
    renderSheet(vi.fn());
    await user.type(
      screen.getByLabelText("Vorderseite, Zeile 1"),
      "Haus{Enter}",
    );
    expect(document.activeElement).toBe(
      screen.getByLabelText("Rückseite, Zeile 1"),
    );
    await user.type(screen.getByLabelText("Rückseite, Zeile 1"), "home{Enter}");
    expect(document.activeElement).toBe(
      screen.getByLabelText("Vorderseite, Zeile 2"),
    );
    // Enter hat dabei nichts abgeschickt.
    expect(screen.queryByText(/erkannt/)).toBeNull();

    await user.click(screen.getByLabelText("Rückseite, Zeile 5"));
    await user.keyboard("{Enter}");
    expect(screen.getByLabelText("Vorderseite, Zeile 6")).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByLabelText("Vorderseite, Zeile 6"),
    );
  });

  it("adds and removes rows with the buttons", async () => {
    const user = userEvent.setup();
    renderSheet(vi.fn());
    await user.click(screen.getByRole("button", { name: "Weitere Zeile" }));
    expect(screen.getByLabelText("Vorderseite, Zeile 6")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Zeile 1 löschen" }));
    await user.click(screen.getByRole("button", { name: "Zeile 1 löschen" }));
    expect(screen.queryByLabelText("Vorderseite, Zeile 5")).toBeNull();
    expect(screen.getByLabelText("Vorderseite, Zeile 4")).toBeTruthy();
  });

  it("previews pasted text, skips the template header and lists reasons", async () => {
    const user = userEvent.setup();
    const onImportCards = vi.fn(async () => "ok");
    renderSheet(onImportCards);
    await user.click(
      screen.getByRole("button", { name: "Einfügen oder Datei" }),
    );
    await user.click(
      screen.getByRole("textbox", { name: "Vokabeln zum Importieren" }),
    );
    await user.paste(
      "Vorderseite;Rückseite;Tag\nHaus;home | house;Unit 1\nkaputt\nBaum;",
    );
    await user.click(screen.getByRole("button", { name: "Vorschau ansehen" }));
    expect(screen.getByText("1 Vokabel erkannt")).toBeTruthy();
    expect(screen.getByText(/Kopfzeile der Vorlage/)).toBeTruthy();
    const skipped = screen.getByRole("heading", {
      name: "2 Zeilen werden übersprungen",
    }).parentElement as HTMLElement;
    expect(within(skipped).getByText(/Zeile 3: nur eine Spalte/)).toBeTruthy();
    expect(within(skipped).getByText(/Zeile 4: Rückseite leer/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Übernehmen" }));
    expect(onImportCards).toHaveBeenCalledWith("deck-1", {
      rows: [{ question: "Haus", answer: "home | house", tag: "Unit 1" }],
      skipped: [3, 4],
    });
  });

  it("offers a collapsible guide and the template download", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => "blob:vorlage");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, {
      createObjectURL,
      revokeObjectURL,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    renderSheet(vi.fn());
    await user.click(
      screen.getByRole("button", { name: "Einfügen oder Datei" }),
    );
    expect(
      screen.getByText("So schreibst du die Liste").closest("details"),
    ).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Vorlage herunterladen" }),
    );
    expect(click).toHaveBeenCalledTimes(1);
    const blob = (createObjectURL.mock.calls[0] as unknown as [Blob])[0];
    expect(blob.type).toContain("text/csv");
    expect(blob.size).toBe(new Blob([buildVocabularyTemplate()]).size);
    click.mockRestore();
  });
});
