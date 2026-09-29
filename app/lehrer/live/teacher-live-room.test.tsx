import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TeacherLiveRoom } from "./teacher-live-room";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TeacherLiveRoom", () => {
  it("offers all upstream content builders", () => {
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    expect(screen.getByText("0 Abschnitte")).toBeVisible();
    expect(screen.getByRole("tab", { name: "Text" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Vokabeln" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Kopfrechnen" })).toBeVisible();
  });

  it("activates vocabulary transfer before choosing its scope", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);

    const vocabularyTab = screen.getByRole("tab", { name: "Vokabeln" });
    await waitFor(() => expect(vocabularyTab).toBeEnabled());
    await user.click(vocabularyTab);

    const transferToggle = screen.getByRole("checkbox", {
      name: /Vokabeln übernehmen/,
    });
    expect(transferToggle).not.toBeChecked();
    expect(
      screen.queryByRole("combobox", {
        name: "Welche Vokabeln übernehmen?",
      }),
    ).not.toBeInTheDocument();

    await user.click(transferToggle);
    expect(
      screen.getByRole("combobox", {
        name: "Welche Vokabeln übernehmen?",
      }),
    ).toHaveValue("errors");

    await user.selectOptions(
      screen.getByRole("combobox", {
        name: "Welche Vokabeln übernehmen?",
      }),
      "all",
    );
    expect(
      screen.getByRole("combobox", {
        name: "Welche Vokabeln übernehmen?",
      }),
    ).toHaveValue("all");
  });

  it("pastes a vocabulary table from a closable dialog", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);

    const vocabularyTab = screen.getByRole("tab", { name: "Vokabeln" });
    await waitFor(() => expect(vocabularyTab).toBeEnabled());
    await user.click(vocabularyTab);
    await user.click(screen.getByRole("button", { name: "Tabelle einfügen" }));

    const dialog = screen.getByRole("dialog", { name: "Tabelle einfügen" });
    await user.type(
      within(dialog).getByRole("textbox", { name: "Tabelle" }),
      "Haus;home{Enter}Baum;tree",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Liste übernehmen" }),
    );
    expect(screen.getByText("2 Vokabeln")).toBeVisible();
    expect(screen.getByDisplayValue("Baum")).toBeVisible();
  });

  it("does not pretend to open an unconfigured live lobby", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    const source = screen.getByLabelText(/Text – Sätze/);
    await waitFor(() => expect(source).toBeEnabled());
    await user.type(source, "Der Schulweg ist kurz.");
    await user.click(screen.getByRole("button", { name: /Weiter zu Modus/ }));
    await user.click(screen.getByRole("button", { name: /Lobby öffnen/ }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Live-Räume sind lokal noch nicht konfiguriert",
    );
    expect(screen.queryByText("Lobby geöffnet")).not.toBeInTheDocument();
  });

  it("offers all upstream game modes", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    const source = screen.getByLabelText(/Text – Sätze/);
    await waitFor(() => expect(source).toBeEnabled());
    await user.type(source, "Der Schulweg ist kurz.");
    await user.click(screen.getByRole("button", { name: /Weiter zu Modus/ }));
    expect(screen.getByRole("radio", { name: /^Laufdiktat/ })).toBeVisible();
    expect(screen.getByRole("radio", { name: /^Freies Üben/ })).toBeVisible();
    expect(screen.getByRole("radio", { name: /^Battle/ })).toBeVisible();
    expect(screen.getByRole("radio", { name: /^Stationen/ })).toBeVisible();
  });

  it("supports configurable text sections and manual exclusion", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    const source = screen.getByLabelText(/Text – Sätze/);
    await waitFor(() => expect(source).toBeEnabled());
    await user.clear(source);
    await user.type(source, "Eins, zwei. Drei.");
    await user.click(screen.getByRole("button", { name: "," }));
    expect(screen.getByText("3 Abschnitte")).toBeVisible();
    const sections = screen.getAllByRole("checkbox");
    await user.click(sections.at(-1)!);
    expect(screen.getByText("2 Abschnitte")).toBeVisible();
  });

  it("marks an arbitrary word range as a manual section via tap-to-tap", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    const source = screen.getByLabelText(/Text – Sätze/);
    await waitFor(() => expect(source).toBeEnabled());
    await user.clear(source);
    await user.type(source, "Der Marker markiert Woerter im Text.");
    await user.click(screen.getByRole("button", { name: "Marker" }));

    // Tap the start word, then the end word — the whole range between them
    // (not just those two words) becomes one manual section.
    await user.click(screen.getByText("markiert"));
    await user.click(screen.getByText("im"));

    const manualChip = screen.getByTitle(
      "Antippen, um die manuelle Markierung zu entfernen",
    );
    expect(manualChip).toHaveTextContent("markiert Woerter im");

    // Tapping the manual chip removes it again.
    await user.click(manualChip);
    expect(
      screen.queryByTitle("Antippen, um die manuelle Markierung zu entfernen"),
    ).not.toBeInTheDocument();
  });

  it("supports adding, editing and deleting individual math tasks", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    const kopfrechnenTab = screen.getByRole("tab", { name: "Kopfrechnen" });
    await waitFor(() => expect(kopfrechnenTab).toBeEnabled());
    await user.click(kopfrechnenTab);
    expect(screen.getAllByText("0 Aufgaben")[0]).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "+ Aufgabe hinzufügen" }),
    );
    await user.type(screen.getByPlaceholderText("z. B. 4 + 4"), "3 + 4{Enter}");
    const taskList = screen.getByRole("region", { name: "Aufgabenliste" });
    expect(within(taskList).getByText("3 + 4 = 7")).toBeVisible();
    expect(screen.getAllByText("1 Aufgaben")[0]).toBeVisible();

    await user.click(within(taskList).getByText("3 + 4 = 7"));
    const editField = screen.getByDisplayValue("3 + 4");
    await user.clear(editField);
    await user.type(editField, "5 + 5{Enter}");
    expect(within(taskList).getByText("5 + 5 = 10")).toBeVisible();

    const editedRow = within(taskList)
      .getByText("5 + 5 = 10")
      .closest<HTMLElement>("li")!;
    await user.click(
      within(editedRow).getByRole("button", { name: "Löschen" }),
    );
    expect(screen.getAllByText("0 Aufgaben")[0]).toBeVisible();
  });

  it("lets a teacher pick which number becomes the gap in the preview", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    const kopfrechnenTab = screen.getByRole("tab", { name: "Kopfrechnen" });
    await waitFor(() => expect(kopfrechnenTab).toBeEnabled());
    await user.click(kopfrechnenTab);

    await user.click(
      screen.getByRole("button", { name: "+ Aufgabe hinzufügen" }),
    );
    await user.type(screen.getByPlaceholderText("z. B. 4 + 4"), "7 + 8{Enter}");

    await user.click(screen.getByRole("button", { name: "Weitere Regeln" }));
    await user.click(screen.getByLabelText("Lückenaufgaben"));
    await user.click(screen.getByRole("button", { name: "Schließen" }));

    const preview = screen.getByRole("region", { name: "Vorschau" });
    expect(within(preview).getByText("Vorschau (Lücken)")).toBeVisible();
    // The task list always shows the full, editable equation — the gap
    // marker only ever lives in the separate preview picker (matches
    // Laufdiktat: the task list itself never bakes a "_" into its rows).
    const firstRow = within(
      screen.getByRole("region", { name: "Vorschau" }),
    ).getAllByRole("listitem")[0]!;
    const taskList = screen.getByRole("region", { name: "Aufgabenliste" });
    expect(within(taskList).getByText("7 + 8 = 15")).toBeVisible();
    // Enabling gap mode should already mark the second number as the
    // (default) gap, so the teacher can see that something is selected
    // without clicking anything first.
    expect(within(firstRow).getByRole("button", { name: "_" })).toBeVisible();

    // Clicking a different number (the result) switches the selection.
    await user.click(within(firstRow).getByRole("button", { name: "15" }));
    expect(within(taskList).getByText("7 + 8 = 15")).toBeVisible();
    const updatedFirstRow = within(
      screen.getByRole("region", { name: "Vorschau" }),
    ).getAllByRole("listitem")[0]!;
    expect(
      within(updatedFirstRow).getByRole("button", { name: "_" }),
    ).toBeVisible();
    expect(
      within(updatedFirstRow).getByRole("button", { name: "8" }),
    ).toBeVisible();
  });

  it("keeps a task's chosen gap slot after editing its numbers, and applies gaps to freshly added tasks", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    const kopfrechnenTab = screen.getByRole("tab", { name: "Kopfrechnen" });
    await waitFor(() => expect(kopfrechnenTab).toBeEnabled());
    await user.click(kopfrechnenTab);

    await user.click(
      screen.getByRole("button", { name: "+ Aufgabe hinzufügen" }),
    );
    await user.type(screen.getByPlaceholderText("z. B. 4 + 4"), "7 + 8{Enter}");

    await user.click(screen.getByRole("button", { name: "Weitere Regeln" }));
    await user.click(screen.getByLabelText("Lückenaufgaben"));
    await user.click(screen.getByRole("button", { name: "Schließen" }));

    // Switch the first task's gap to the left number (default is "right").
    const firstRow = within(
      screen.getByRole("region", { name: "Vorschau" }),
    ).getAllByRole("listitem")[0]!;
    await user.click(within(firstRow).getByRole("button", { name: "7" }));

    const taskList = screen.getByRole("region", { name: "Aufgabenliste" });

    // Re-opening the row for editing must show a plain, editable equation —
    // never a "_" or the internal "=> answer" storage format that used to
    // leak into the field and make edits look like they "did nothing".
    await user.click(within(taskList).getByText("7 + 8 = 15"));
    const editField = screen.getByDisplayValue("7 + 8");
    await user.clear(editField);
    await user.type(editField, "10 + 8{Enter}");

    // The edited numbers take effect...
    expect(within(taskList).getByText("10 + 8 = 18")).toBeVisible();
    // ...and the previously chosen gap slot (left) is preserved instead of
    // resetting to the default, since the gap is tracked separately from
    // the line's text rather than re-derived from it.
    const updatedFirstRow = within(
      screen.getByRole("region", { name: "Vorschau" }),
    ).getAllByRole("listitem")[0]!;
    expect(
      within(updatedFirstRow).getByRole("button", { name: "_" }),
    ).toBeVisible();
    expect(
      within(updatedFirstRow).getByRole("button", { name: "8" }),
    ).toBeVisible();

    // A brand-new manually added task is captured by gap mode immediately,
    // without any special-casing needed.
    await user.click(
      screen.getByRole("button", { name: "+ Aufgabe hinzufügen" }),
    );
    await user.type(screen.getByPlaceholderText("z. B. 4 + 4"), "3 + 3{Enter}");
    const newRow = within(
      screen.getByRole("region", { name: "Vorschau" }),
    ).getAllByRole("listitem")[1]!;
    expect(within(newRow).getByRole("button", { name: "_" })).toBeVisible();
    expect(within(newRow).getByRole("button", { name: "3" })).toBeVisible();
  });

  it("supports manually chained expressions and auto-spaces them", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    const kopfrechnenTab = screen.getByRole("tab", { name: "Kopfrechnen" });
    await waitFor(() => expect(kopfrechnenTab).toBeEnabled());
    await user.click(kopfrechnenTab);

    await user.click(
      screen.getByRole("button", { name: "+ Aufgabe hinzufügen" }),
    );
    // Typed with no spaces at all — committing must insert them.
    await user.type(screen.getByPlaceholderText("z. B. 4 + 4"), "3+4-2{Enter}");
    const taskList = screen.getByRole("region", { name: "Aufgabenliste" });
    expect(within(taskList).getByText("3 + 4 − 2 = 5")).toBeVisible();
  });

  it("lets a teacher gap any number in a chain, not just two-operand tasks", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    const kopfrechnenTab = screen.getByRole("tab", { name: "Kopfrechnen" });
    await waitFor(() => expect(kopfrechnenTab).toBeEnabled());
    await user.click(kopfrechnenTab);

    await user.click(
      screen.getByRole("button", { name: "+ Aufgabe hinzufügen" }),
    );
    await user.type(
      screen.getByPlaceholderText("z. B. 4 + 4"),
      "3 + 4 - 2{Enter}",
    );

    await user.click(screen.getByRole("button", { name: "Weitere Regeln" }));
    await user.click(screen.getByLabelText("Lückenaufgaben"));
    await user.click(screen.getByRole("button", { name: "Schließen" }));

    const rows = within(
      screen.getByRole("region", { name: "Vorschau" }),
    ).getAllByRole("listitem");
    const chainRow = rows[rows.length - 1]!;
    // Default gap is the last numeral in the chain.
    expect(within(chainRow).getByRole("button", { name: "_" })).toBeVisible();
    expect(within(chainRow).getByRole("button", { name: "3" })).toBeVisible();
    expect(within(chainRow).getByRole("button", { name: "4" })).toBeVisible();

    // Blanking the middle number (the "4") works too, not just left/right.
    await user.click(within(chainRow).getByRole("button", { name: "4" }));
    const taskList = screen.getByRole("region", { name: "Aufgabenliste" });
    expect(within(taskList).getByText("3 + 4 − 2 = 5")).toBeVisible();
    const updatedRows = within(
      screen.getByRole("region", { name: "Vorschau" }),
    ).getAllByRole("listitem");
    const updatedChainRow = updatedRows[updatedRows.length - 1]!;
    expect(
      within(updatedChainRow).getByRole("button", { name: "_" }),
    ).toBeVisible();
    expect(
      within(updatedChainRow).getByRole("button", { name: "3" }),
    ).toBeVisible();
    expect(
      within(updatedChainRow).getByRole("button", { name: "2" }),
    ).toBeVisible();
  });

  it("offers power/root/fraction buttons and renders LaTeX input via KaTeX", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    const kopfrechnenTab = screen.getByRole("tab", { name: "Kopfrechnen" });
    await waitFor(() => expect(kopfrechnenTab).toBeEnabled());
    await user.click(kopfrechnenTab);

    await user.click(
      screen.getByRole("button", { name: "+ Aufgabe hinzufügen" }),
    );
    expect(screen.getByRole("button", { name: "xʸ" })).toBeVisible();
    expect(screen.getByRole("button", { name: "√" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "a/b" }));
    const input = screen.getByPlaceholderText("z. B. 4 + 4");
    expect(input).toHaveValue("\\frac{}{}");

    // Live result preview updates while typing, before committing.
    fireEvent.change(input, { target: { value: "\\frac{1}{2}" } });
    expect(screen.getByText("= 0,5")).toBeVisible();

    fireEvent.keyDown(input, { key: "Enter" });
    const taskList = screen.getByRole("region", { name: "Aufgabenliste" });
    expect(taskList.querySelector(".katex")).not.toBeNull();
  });

  it("starts vocabulary mode with one empty pair ready to fill in", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    const vokabelnTab = screen.getByRole("tab", { name: "Vokabeln" });
    await waitFor(() => expect(vokabelnTab).toBeEnabled());
    await user.click(vokabelnTab);
    expect(screen.getByText("1 Vokabeln")).toBeVisible();
    expect(screen.getByPlaceholderText("Vokabel 1")).toBeVisible();
  });

  it("keeps a freshly added vocabulary pair visible while it is still empty", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    const vokabelnTab = screen.getByRole("tab", { name: "Vokabeln" });
    await waitFor(() => expect(vokabelnTab).toBeEnabled());
    await user.click(vokabelnTab);
    expect(screen.getByText("1 Vokabeln")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "+ Vokabel hinzufügen" }),
    );
    const newPrimary = screen.getByPlaceholderText("Vokabel 2");
    expect(newPrimary).toBeVisible();
    const newRow = newPrimary.closest<HTMLElement>("li")!;
    await user.type(newPrimary, "tree");
    await user.type(within(newRow).getByPlaceholderText("Übersetzung"), "Baum");
    expect(screen.getByText("2 Vokabeln")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Vokabel 2 löschen" }));
    expect(screen.getByText("1 Vokabeln")).toBeVisible();
  });

  it("always leaves one empty vocabulary pair after deleting the last one", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    const vokabelnTab = screen.getByRole("tab", { name: "Vokabeln" });
    await waitFor(() => expect(vokabelnTab).toBeEnabled());
    await user.click(vokabelnTab);
    await user.click(screen.getByRole("button", { name: "Vokabel 1 löschen" }));
    expect(screen.getByText("1 Vokabeln")).toBeVisible();
    expect(screen.getByPlaceholderText("Vokabel 1")).toBeVisible();
  });

  it("lets a teacher require exact case matching for vocabulary answers", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    const vokabelnTab = screen.getByRole("tab", { name: "Vokabeln" });
    await waitFor(() => expect(vokabelnTab).toBeEnabled());
    await user.click(vokabelnTab);
    const checkbox = screen.getByRole("checkbox", {
      name: "Groß-/Kleinschreibung prüfen",
    });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});
