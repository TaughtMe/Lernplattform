import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TeacherLiveRoom } from "./teacher-live-room";

describe("TeacherLiveRoom", () => {
  it("offers all upstream content builders", () => {
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    expect(screen.getByText("0 Abschnitte")).toBeVisible();
    expect(screen.getByRole("tab", { name: "Text" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Vokabeln" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Kopfrechnen" })).toBeVisible();
  });

  it("does not pretend to open an unconfigured live lobby", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    const source = screen.getByLabelText(/Text – Sätze/);
    await waitFor(() => expect(source).toBeEnabled());
    await user.type(source, "Der Schulweg ist kurz.");
    await user.click(
      screen.getByRole("button", { name: /Weiter zur Konfiguration/ }),
    );
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
    await user.click(
      screen.getByRole("button", { name: /Weiter zur Konfiguration/ }),
    );
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
    await user.click(
      screen.getByRole("button", { name: "Abschnitte verwalten" }),
    );
    const sections = screen.getAllByRole("checkbox");
    await user.click(sections.at(-1)!);
    await user.click(screen.getByRole("button", { name: "Schließen" }));
    expect(screen.getByText("2 Abschnitte")).toBeVisible();
  });

  it("supports adding, editing and deleting individual math tasks", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    const kopfrechnenTab = screen.getByRole("tab", { name: "Kopfrechnen" });
    await waitFor(() => expect(kopfrechnenTab).toBeEnabled());
    await user.click(kopfrechnenTab);
    expect(screen.getAllByText("4 Aufgaben")[0]).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "+ Aufgabe hinzufügen" }),
    );
    await user.type(screen.getByPlaceholderText("z. B. 4 + 4"), "3 + 4{Enter}");
    const taskList = document.querySelector<HTMLElement>(
      ".teacher-live__math-tasklist",
    )!;
    expect(within(taskList).getByText("3 + 4 = 7")).toBeVisible();
    expect(screen.getAllByText("5 Aufgaben")[0]).toBeVisible();

    await user.click(within(taskList).getByText("3 + 4 = 7"));
    const editField = screen.getByDisplayValue("3 + 4");
    await user.clear(editField);
    await user.type(editField, "5 + 5{Enter}");
    expect(within(taskList).getByText("5 + 5 = 10")).toBeVisible();

    const editedRow = within(taskList)
      .getByText("5 + 5 = 10")
      .closest<HTMLElement>(".teacher-live__math-row")!;
    await user.click(
      within(editedRow).getByRole("button", { name: "Löschen" }),
    );
    expect(screen.getAllByText("4 Aufgaben")[0]).toBeVisible();
  });

  it("lets a teacher pick which number becomes the gap in the preview", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    const kopfrechnenTab = screen.getByRole("tab", { name: "Kopfrechnen" });
    await waitFor(() => expect(kopfrechnenTab).toBeEnabled());
    await user.click(kopfrechnenTab);

    await user.click(screen.getByRole("button", { name: "Weitere Regeln" }));
    await user.click(screen.getByLabelText("Lückenaufgaben"));
    await user.click(screen.getByRole("button", { name: "Schließen" }));

    const preview = document.querySelector<HTMLElement>(
      ".teacher-live__math-preview",
    )!;
    expect(within(preview).getByText("Vorschau (Lücken)")).toBeVisible();
    // The task list always shows the full, editable equation — the gap
    // marker only ever lives in the separate preview picker (matches
    // Laufdiktat: the task list itself never bakes a "_" into its rows).
    const firstRow = document.querySelector<HTMLElement>(
      ".teacher-live__math-preview-row",
    )!;
    const taskList = document.querySelector<HTMLElement>(
      ".teacher-live__math-tasklist",
    )!;
    expect(within(taskList).getByText("7 + 8 = 15")).toBeVisible();
    // Enabling gap mode should already mark the second number as the
    // (default) gap, so the teacher can see that something is selected
    // without clicking anything first.
    expect(within(firstRow).getByRole("button", { name: "_" })).toBeVisible();

    // Clicking a different number (the result) switches the selection.
    await user.click(within(firstRow).getByRole("button", { name: "15" }));
    expect(within(taskList).getByText("7 + 8 = 15")).toBeVisible();
    const updatedFirstRow = document.querySelector<HTMLElement>(
      ".teacher-live__math-preview-row",
    )!;
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

    await user.click(screen.getByRole("button", { name: "Weitere Regeln" }));
    await user.click(screen.getByLabelText("Lückenaufgaben"));
    await user.click(screen.getByRole("button", { name: "Schließen" }));

    // Switch the first task's gap to the left number (default is "right").
    const firstRow = document.querySelector<HTMLElement>(
      ".teacher-live__math-preview-row",
    )!;
    await user.click(within(firstRow).getByRole("button", { name: "7" }));

    const taskList = document.querySelector<HTMLElement>(
      ".teacher-live__math-tasklist",
    )!;

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
    const updatedFirstRow = document.querySelector<HTMLElement>(
      ".teacher-live__math-preview-row",
    )!;
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
    const newRow = document.querySelectorAll<HTMLElement>(
      ".teacher-live__math-preview-row",
    )[4]!;
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
    const taskList = document.querySelector<HTMLElement>(
      ".teacher-live__math-tasklist",
    )!;
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

    const rows = document.querySelectorAll<HTMLElement>(
      ".teacher-live__math-preview-row",
    );
    const chainRow = rows[rows.length - 1]!;
    // Default gap is the last numeral in the chain.
    expect(within(chainRow).getByRole("button", { name: "_" })).toBeVisible();
    expect(within(chainRow).getByRole("button", { name: "3" })).toBeVisible();
    expect(within(chainRow).getByRole("button", { name: "4" })).toBeVisible();

    // Blanking the middle number (the "4") works too, not just left/right.
    await user.click(within(chainRow).getByRole("button", { name: "4" }));
    const taskList = document.querySelector<HTMLElement>(
      ".teacher-live__math-tasklist",
    )!;
    expect(within(taskList).getByText("3 + 4 − 2 = 5")).toBeVisible();
    const updatedRows = document.querySelectorAll<HTMLElement>(
      ".teacher-live__math-preview-row",
    );
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
    const newRow = newPrimary.closest<HTMLElement>(
      ".teacher-live__vocabulary-row",
    )!;
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
