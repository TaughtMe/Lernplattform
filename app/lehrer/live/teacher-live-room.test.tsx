import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { TeacherLiveRoom } from "./teacher-live-room";

/** Die Art wählt die Startseite (`?neu=`); ohne Angabe ein Text. */
async function renderRoom(kind?: "vocabulary" | "math") {
  window.history.replaceState(
    null,
    "",
    kind ? `/lehrer/live?neu=${kind}` : "/lehrer/live",
  );
  const user = userEvent.setup();
  render(<TeacherLiveRoom liveRoomConfig={null} />);
  const marker = await waitFor(() => {
    const node = document.querySelector("[data-hydrated]");
    expect(node?.getAttribute("data-hydrated")).toBe("true");
    return node;
  });
  return { user, marker };
}

async function renderText() {
  const result = await renderRoom();
  return { ...result, source: screen.getByRole("textbox", { name: "Text" }) };
}

afterEach(() => window.history.replaceState(null, "", "/"));

describe("TeacherLiveRoom (Lehrerbereich v2, 14b/14c)", () => {
  it("teilt einen Text in Abschnitte und kann nach Zeilen teilen", async () => {
    const { user, source } = await renderText();
    expect(
      screen.getByRole("button", { name: "Weiter zu Modus" }),
    ).toBeDisabled();
    await user.type(source, "Eins zwei. Drei vier.");
    expect(screen.getAllByText(/2 Abschnitte/)[0]).toBeInTheDocument();
    expect(screen.getByText("Drei vier.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Zeilen" }));
    expect(screen.getAllByText(/1 Abschnitte/)[0]).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Wörtern" }));
    expect(screen.getAllByText(/4 Abschnitte/)[0]).toBeInTheDocument();
  });

  it("füllt das Vokabelheft von Hand und per Tabelle", async () => {
    const { user } = await renderRoom("vocabulary");
    await user.type(
      await screen.findByRole("textbox", { name: "Vokabel 1" }),
      "Hund",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Übersetzung 1" }),
      "dog",
    );
    expect(screen.getByText("1 Vokabel")).toBeInTheDocument();
    // Das Tag-Feld ist auch ohne LernBox-Übernahme da (Gruppieren in der Auswahl).
    expect(
      screen.getByRole("textbox", { name: "Tag Vokabel 1" }),
    ).toHaveAttribute("placeholder", "Tag (optional, z. B. Unit 3)");
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
      "Haus;maison;Unit 3{Enter}Baum;arbre",
    );
    await user.click(screen.getByRole("button", { name: "Liste übernehmen" }));
    expect(screen.getByRole("textbox", { name: "Vokabel 2" })).toHaveValue(
      "Baum",
    );
    expect(screen.getByText("2 Vokabeln")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Tag Vokabel 1" })).toHaveValue(
      "Unit 3",
    );
  });

  it("erzeugt Mathe-Aufgaben und stellt Regeln ein", async () => {
    const { user } = await renderRoom("math");
    expect(await screen.findByText("0 Aufgaben")).toBeInTheDocument();
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
    const { user, source } = await renderText();
    await user.type(source, "Der Schulweg ist kurz.");
    await user.click(screen.getByRole("button", { name: "Weiter zu Modus" }));
    expect(
      screen.getByRole("heading", { name: "Modus wählen" }),
    ).toBeInTheDocument();
    // Die echten Modi des Laufdiktats (lib/modes.ts), nicht die der Vorlage.
    for (const mode of ["Laufdiktat", "Freies Üben", "Battle", "Stationen"]) {
      expect(
        screen.getByRole("button", { name: new RegExp(`^${mode} `) }),
      ).toBeInTheDocument();
    }
    expect(
      screen.getByRole("button", { name: /^Laufdiktat / }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /^Sterne zeigen/ }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Stationen / }));
    expect(screen.getByText("Anzahl Stationen")).toBeInTheDocument();
    // Stationen haben weder Sterne noch „Nur getippte Eingaben“.
    expect(
      screen.queryByRole("button", { name: /^Sterne zeigen/ }),
    ).not.toBeInTheDocument();
    const tts = screen.getByRole("button", { name: /^Vorlesen/ });
    expect(tts).toHaveAttribute("aria-pressed", "false");
    await user.click(tts);
    expect(screen.getByRole("button", { name: /^Vorlesen/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Mehr Stationen" }));
    expect(screen.getByText("21")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Zurück" }));
    expect(
      screen.getByRole("heading", { name: "Inhalt eingeben" }),
    ).toBeInTheDocument();
  });

  it("öffnet ohne Konfiguration keinen Raum, sondern meldet es", async () => {
    const { user, source } = await renderText();
    await user.type(source, "Der Schulweg ist kurz.");
    await user.click(screen.getByRole("button", { name: "Weiter zu Modus" }));
    await user.click(screen.getByRole("button", { name: "Raum jetzt öffnen" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Live-Räume sind lokal noch nicht konfiguriert",
    );
  });
});
