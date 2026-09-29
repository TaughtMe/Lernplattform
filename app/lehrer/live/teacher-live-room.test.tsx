import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TeacherLiveRoom } from "./teacher-live-room";

async function renderRoom() {
  const user = userEvent.setup();
  render(<TeacherLiveRoom liveRoomConfig={null} />);
  const source = screen.getByRole("textbox", { name: "Text" });
  await waitFor(() =>
    expect(
      source.closest("[data-hydrated]")?.getAttribute("data-hydrated"),
    ).toBe("true"),
  );
  return { user, source };
}

describe("TeacherLiveRoom (Design 5c/5d)", () => {
  it("teilt einen Text in Abschnitte und kann nach Zeilen teilen", async () => {
    const { user, source } = await renderRoom();
    expect(
      screen.getByRole("button", { name: "Weiter zu Modus" }),
    ).toBeDisabled();
    await user.type(source, "Eins zwei. Drei vier.");
    expect(screen.getAllByText(/2 Abschnitte/)[0]).toBeInTheDocument();
    expect(screen.getByText("Drei vier.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Zeile" }));
    expect(screen.getAllByText(/1 Abschnitte/)[0]).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Wort" }));
    expect(screen.getAllByText(/4 Abschnitte/)[0]).toBeInTheDocument();
  });

  it("nimmt Vokabeln zeilenweise auf", async () => {
    const { user } = await renderRoom();
    await user.click(screen.getByRole("button", { name: "Vokabeln" }));
    const table = screen.getByRole("textbox", { name: "Vokabeln" });
    await user.type(table, "Hund;dog");
    expect(screen.getByText("Hund → dog")).toBeInTheDocument();
  });

  it("führt zu den Modi und zeigt Optionen je Modus", async () => {
    const { user, source } = await renderRoom();
    await user.type(source, "Der Schulweg ist kurz.");
    await user.click(screen.getByRole("button", { name: "Weiter zu Modus" }));
    for (const mode of ["Laufdiktat", "Freie Übung", "Battle", "Stationen"]) {
      expect(
        screen.getByRole("button", { name: new RegExp(`^${mode}`) }),
      ).toBeInTheDocument();
    }
    await user.click(screen.getByRole("button", { name: /^Stationen/ }));
    expect(screen.getAllByText("Anzahl Stationen")[0]).toBeInTheDocument();
    const tts = screen.getAllByRole("button", {
      name: /Vorlesen erlauben/,
    })[0]!;
    expect(tts).toHaveAttribute("aria-pressed", "false");
    await user.click(tts);
    expect(
      screen.getAllByRole("button", { name: /Vorlesen erlauben/ })[0],
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("öffnet ohne Konfiguration keinen Raum, sondern meldet es", async () => {
    const { user, source } = await renderRoom();
    await user.type(source, "Der Schulweg ist kurz.");
    await user.click(screen.getByRole("button", { name: "Weiter zu Modus" }));
    await user.click(screen.getByRole("button", { name: "Raum öffnen" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Live-Räume sind lokal noch nicht konfiguriert",
    );
  });
});
