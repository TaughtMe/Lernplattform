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

  it("füllt das Vokabelheft von Hand und per Tabelle", async () => {
    const { user } = await renderRoom();
    await user.click(screen.getByRole("button", { name: "Vokabeln" }));
    await user.type(screen.getByRole("textbox", { name: "Vokabel 1" }), "Hund");
    await user.type(
      screen.getByRole("textbox", { name: "Übersetzung 1" }),
      "dog",
    );
    expect(screen.getByText("1 Vokabel")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Weiter zu Modus" }),
    ).toBeEnabled();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Sprache rechts" }),
      "fr-FR",
    );
    expect(
      screen.getByRole("radio", { name: "Französisch → Deutsch" }),
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: "Tabelle einfügen" }),
      "Haus;maison{Enter}Baum;arbre",
    );
    await user.click(screen.getByRole("button", { name: "Liste übernehmen" }));
    expect(screen.getByRole("textbox", { name: "Vokabel 2" })).toHaveValue(
      "Baum",
    );
    expect(screen.getByText("2 Vokabeln")).toBeInTheDocument();
  });

  it("erzeugt Mathe-Aufgaben und stellt Regeln ein", async () => {
    const { user } = await renderRoom();
    await user.click(screen.getByRole("button", { name: "Mathe" }));
    expect(screen.getByText("0 Aufgaben")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aufgaben erzeugen" }));
    expect(screen.getByText("10 Aufgaben")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Zahlenraum und Regeln" }),
    );
    await user.click(screen.getByRole("checkbox", { name: "Lückenaufgaben" }));
    await user.click(
      screen.getByRole("button", { name: "Zahlenraum und Regeln" }),
    );
    expect(screen.getByText(/Tippe die Zahl an/)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Aufgabe hinzufügen" }),
    );
    await user.type(screen.getByRole("textbox", { name: "Aufgabe" }), "6+4");
    expect(screen.getByText("= 10")).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(screen.getByText("11 Aufgaben")).toBeInTheDocument();
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
