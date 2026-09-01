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
    expect(within(taskList).getByText("3 + 4")).toBeVisible();
    expect(screen.getAllByText("5 Aufgaben")[0]).toBeVisible();

    await user.click(within(taskList).getByText("3 + 4"));
    const editField = screen.getByDisplayValue("3 + 4");
    await user.clear(editField);
    await user.type(editField, "5 + 5{Enter}");
    expect(within(taskList).getByText("5 + 5")).toBeVisible();

    const editedRow = within(taskList)
      .getByText("5 + 5")
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
    // "7 + 8" is the first default task: pick its result (15) as the gap.
    await user.click(within(preview).getByRole("button", { name: "15" }));

    const taskList = document.querySelector<HTMLElement>(
      ".teacher-live__math-tasklist",
    )!;
    expect(within(taskList).getByText("7 + 8 = _")).toBeVisible();
    expect(within(preview).getByRole("button", { name: "_" })).toBeVisible();
  });

  it("keeps a freshly added vocabulary pair visible while it is still empty", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    const vokabelnTab = screen.getByRole("tab", { name: "Vokabeln" });
    await waitFor(() => expect(vokabelnTab).toBeEnabled());
    await user.click(vokabelnTab);
    expect(screen.getByText("0 Vokabeln")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "+ Vokabel hinzufügen" }),
    );
    const newPrimary = screen.getByPlaceholderText("Vokabel 1");
    expect(newPrimary).toBeVisible();
    const newRow = newPrimary.closest<HTMLElement>(
      ".teacher-live__vocabulary-row",
    )!;
    await user.type(newPrimary, "tree");
    await user.type(within(newRow).getByPlaceholderText("Übersetzung"), "Baum");
    expect(screen.getByText("1 Vokabeln")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Vokabel 1 löschen" }));
    expect(screen.getByText("0 Vokabeln")).toBeVisible();
  });
});
