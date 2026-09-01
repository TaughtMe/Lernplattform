import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TeacherLiveRoom } from "./teacher-live-room";

describe("TeacherLiveRoom", () => {
  it("offers all upstream content builders", () => {
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    expect(screen.getByText("2 Aufgaben")).toBeVisible();
    expect(screen.getByRole("tab", { name: "Text" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Vokabeln" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Kopfrechnen" })).toBeVisible();
  });

  it("does not pretend to open an unconfigured live lobby", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
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
    expect(screen.getByText("3 Abschnitte aktiv")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Abschnitte verwalten" }),
    );
    const sections = screen.getAllByRole("checkbox");
    await user.click(sections.at(-1)!);
    await user.click(screen.getByRole("button", { name: "Schließen" }));
    expect(screen.getByText("2 Abschnitte aktiv")).toBeVisible();
  });
});
