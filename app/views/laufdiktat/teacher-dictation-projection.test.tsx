import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DEMO_TEACHER } from "./demo";
import { TeacherDictationScreen } from "./teacher-dictation-screen";

describe("TeacherDictationScreen, Projektionsmodus „Für die Tafel“", () => {
  const live = {
    ...DEMO_TEACHER.live,
    active: 3,
    finished: 1,
    // Die Klasse als Ganzes: Wörter mit Zahl, kein Kind.
    mistakes: [
      { word: "Vogel", count: 1 },
      { word: "Pilze", count: 4 },
    ],
    students: [
      {
        name: "Müder Koala",
        animal: "Koala",
        progress: 2,
        total: 8,
        mistakes: 3,
        struggling: true,
        wordErrors: [{ word: "Pilze", count: 2 }],
      },
    ],
  };
  const qr = <canvas aria-label="QR-Code zum Raum 4K2P" role="img" />;

  it("hat keinen Umschalter, wenn die Seite ihn nicht anbietet", () => {
    render(<TeacherDictationScreen {...DEMO_TEACHER} step="live" />);
    expect(
      screen.queryByRole("button", { name: "Für die Tafel" }),
    ).not.toBeInTheDocument();
  });

  it("zeigt ohne Projektion die Liste mit Namen und Fehlerzahlen", async () => {
    const onChange = vi.fn();
    render(
      <TeacherDictationScreen
        {...DEMO_TEACHER}
        step="live"
        live={live}
        projection={{ active: false, onChange }}
      />,
    );
    expect(screen.getByText("Müder Koala")).toBeInTheDocument();
    expect(screen.getByText("Braucht Hilfe")).toBeInTheDocument();
    expect(screen.getByText("3✕")).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Für die Tafel" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it.each(["LAUFDIKTAT", "STATION"] as const)(
    "zeigt in der Projektion Raumcode, QR, Gesamtfortschritt und häufigste Fehler (%s)",
    async (mode) => {
      const onChange = vi.fn();
      render(
        <TeacherDictationScreen
          {...DEMO_TEACHER}
          step="live"
          mode={mode}
          live={live}
          qrLarge={qr}
          projection={{ active: true, onChange }}
        />,
      );
      const panel = screen.getByRole("region", {
        name: "Ansicht für die Tafel",
      });
      expect(within(panel).getByText("1 von 4 fertig")).toBeInTheDocument();
      expect(
        within(panel).getByRole("img", { name: "Raumcode 4K2P" }),
      ).toBeInTheDocument();
      expect(
        within(panel).getByRole("img", { name: "QR-Code zum Raum 4K2P" }),
      ).toBeInTheDocument();
      expect(
        within(panel).getByRole("progressbar", { name: "Gesamtfortschritt" }),
      ).toBeInTheDocument();
      // Die häufigsten Fehler der Klasse: nur Wörter, häufigstes zuerst.
      const mistakes = within(panel).getByRole("region", {
        name: "Häufigste Fehler",
      });
      expect(
        within(mistakes)
          .getAllByText(/^(Pilze|Vogel)$/)
          .map((node) => node.textContent),
      ).toEqual(["Pilze", "Vogel"]);
      // Nichts Personenbezogenes auf dem Schirm.
      expect(screen.queryByText("Müder Koala")).not.toBeInTheDocument();
      expect(screen.queryByText("Braucht Hilfe")).not.toBeInTheDocument();
      expect(screen.queryByText("3✕")).not.toBeInTheDocument();
      expect(screen.queryByText(/Fehlerwörter/)).not.toBeInTheDocument();
      expect(screen.queryByText("2✕")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", {
          name: "Ergebnisse als CSV herunterladen",
        }),
      ).not.toBeInTheDocument();
      const toggle = screen.getByRole("button", { name: "Für die Tafel" });
      expect(toggle).toHaveAttribute("aria-pressed", "true");
      await userEvent.click(toggle);
      expect(onChange).toHaveBeenCalledWith(false);
    },
  );

  it("lässt den Block weg, solange es keine Fehler gibt", () => {
    render(
      <TeacherDictationScreen
        {...DEMO_TEACHER}
        step="live"
        live={{ ...live, mistakes: [] }}
        projection={{ active: true, onChange: vi.fn() }}
      />,
    );
    expect(
      screen.queryByRole("region", { name: "Häufigste Fehler" }),
    ).not.toBeInTheDocument();
  });

  it("zeigt keinen QR, wenn der Beitritt geschlossen ist", () => {
    render(
      <TeacherDictationScreen
        {...DEMO_TEACHER}
        step="live"
        live={live}
        qrLarge={qr}
        roomTimes={{
          joinOpen: false,
          joinUntil: "14:35",
          closesAt: "15:50",
          closingSoon: false,
          closed: false,
        }}
        projection={{ active: true, onChange: vi.fn() }}
      />,
    );
    expect(
      within(
        screen.getByRole("region", { name: "Ansicht für die Tafel" }),
      ).queryByRole("img", { name: "QR-Code zum Raum 4K2P" }),
    ).not.toBeInTheDocument();
  });
});
