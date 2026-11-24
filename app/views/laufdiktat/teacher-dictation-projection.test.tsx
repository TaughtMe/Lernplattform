import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  /** Sechs Kinder: ab hier dürfen Fehler an die Tafel (Entscheidung 65). */
  const six = {
    ...live,
    active: 5,
    finished: 1,
    students: Array.from({ length: 6 }, (_, index) => ({
      ...live.students[0]!,
      name: `Kind ${index + 1}`,
    })),
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
          live={six}
          qrLarge={qr}
          projection={{ active: true, onChange }}
        />,
      );
      const panel = screen.getByRole("region", {
        name: "Ansicht für die Tafel",
      });
      expect(within(panel).getByText("1 von 6 fertig")).toBeInTheDocument();
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
      expect(screen.queryByText("Kind 1")).not.toBeInTheDocument();
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

  it("zeigt unter sechs Kindern keine Fehler an der Tafel (Entscheidung 65)", () => {
    render(
      <TeacherDictationScreen
        {...DEMO_TEACHER}
        step="live"
        live={{ ...six, students: six.students.slice(0, 5), active: 4 }}
        projection={{ active: true, onChange: vi.fn() }}
      />,
    );
    const panel = screen.getByRole("region", { name: "Ansicht für die Tafel" });
    expect(
      within(panel).queryByRole("region", { name: "Häufigste Fehler" }),
    ).not.toBeInTheDocument();
    expect(within(panel).queryByText("Pilze")).not.toBeInTheDocument();
    expect(within(panel).queryByText("Braucht Hilfe")).not.toBeInTheDocument();
  });

  it("lässt auf dem Lehrerbildschirm Fehler und Hilfe auch bei wenigen Kindern stehen", () => {
    render(
      <TeacherDictationScreen
        {...DEMO_TEACHER}
        step="live"
        live={live}
        projection={{ active: false, onChange: vi.fn() }}
      />,
    );
    expect(
      screen.getByRole("region", { name: "Häufigste Fehler" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Braucht Hilfe")).toBeInTheDocument();
  });

  it("zeigt den Klassenbalken mit der Summe richtiger Antworten", () => {
    render(
      <TeacherDictationScreen
        {...DEMO_TEACHER}
        step="live"
        live={six}
        projection={{ active: true, onChange: vi.fn() }}
      />,
    );
    const panel = screen.getByRole("region", { name: "Ansicht für die Tafel" });
    expect(
      within(panel).getByText("Klasse: 12 von 48 Aufgaben geschafft"),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("progressbar", { name: "Klassenziel" }),
    ).toHaveAttribute("aria-valuenow", "25");
    expect(
      within(panel).queryByRole("region", { name: "Runde geschafft" }),
    ).not.toBeInTheDocument();
  });

  describe("Rundenende", () => {
    const done = (count: number) => ({
      ...live,
      active: 0,
      finished: count,
      mistakes: [{ word: "Pilze", count: 4 }],
      students: Array.from({ length: count }, (_, index) => ({
        name: `Kind ${index + 1}`,
        animal: "Koala",
        progress: 8,
        total: 8,
        mistakes: 2,
      })),
    });

    it("feiert mit Summen und nennt den häufigsten Fehler ab sechs Kindern", () => {
      render(
        <TeacherDictationScreen
          {...DEMO_TEACHER}
          step="live"
          live={done(6)}
          projection={{ active: true, onChange: vi.fn() }}
        />,
      );
      const show = screen.getByRole("region", { name: "Runde geschafft" });
      expect(within(show).getByText("Geschafft!")).toBeInTheDocument();
      expect(
        within(show).getByText("Die Klasse hat 48 Aufgaben gelöst."),
      ).toBeInTheDocument();
      expect(
        within(show).getByText("80 % der Antworten waren richtig."),
      ).toBeInTheDocument();
      expect(within(show).getByText("Pilze")).toBeInTheDocument();
      expect(within(show).queryByText(/Kind \d/)).not.toBeInTheDocument();
    });

    it("lässt den häufigsten Fehler unter sechs Kindern weg", () => {
      render(
        <TeacherDictationScreen
          {...DEMO_TEACHER}
          step="live"
          live={done(4)}
          projection={{ active: true, onChange: vi.fn() }}
        />,
      );
      const show = screen.getByRole("region", { name: "Runde geschafft" });
      expect(within(show).getByText("Geschafft!")).toBeInTheDocument();
      expect(within(show).queryByText(/Zum Üben/)).not.toBeInTheDocument();
      expect(screen.queryByText("Pilze")).not.toBeInTheDocument();
    });
  });

  describe("Countdown beim Start", () => {
    afterEach(() => vi.useRealTimers());

    it("zählt auf der Tafel 3, 2, 1 und blendet sich dann aus", () => {
      vi.useFakeTimers();
      vi.setSystemTime(10_000);
      render(
        <TeacherDictationScreen
          {...DEMO_TEACHER}
          step="live"
          live={live}
          projection={{ active: true, onChange: vi.fn(), startedAt: 10_000 }}
        />,
      );
      const countdown = () => screen.queryByTestId("countdown");
      expect(countdown()).toHaveTextContent("3");
      act(() => void vi.advanceTimersByTime(1_000));
      expect(countdown()).toHaveTextContent("2");
      act(() => void vi.advanceTimersByTime(1_000));
      expect(countdown()).toHaveTextContent("1");
      act(() => void vi.advanceTimersByTime(1_000));
      expect(countdown()).not.toBeInTheDocument();
    });

    it("zählt nicht ohne Start, nicht nach dem Start und nicht ohne Projektion", () => {
      vi.useFakeTimers();
      vi.setSystemTime(60_000);
      const { rerender } = render(
        <TeacherDictationScreen
          {...DEMO_TEACHER}
          step="live"
          live={live}
          projection={{ active: true, onChange: vi.fn() }}
        />,
      );
      expect(screen.queryByTestId("countdown")).not.toBeInTheDocument();
      rerender(
        <TeacherDictationScreen
          {...DEMO_TEACHER}
          step="live"
          live={live}
          projection={{ active: true, onChange: vi.fn(), startedAt: 1_000 }}
        />,
      );
      expect(screen.queryByTestId("countdown")).not.toBeInTheDocument();
      rerender(
        <TeacherDictationScreen
          {...DEMO_TEACHER}
          step="live"
          live={live}
          projection={{ active: false, onChange: vi.fn(), startedAt: 60_000 }}
        />,
      );
      expect(screen.queryByTestId("countdown")).not.toBeInTheDocument();
    });
  });

  it("lässt den Block weg, solange es keine Fehler gibt", () => {
    render(
      <TeacherDictationScreen
        {...DEMO_TEACHER}
        step="live"
        live={{ ...six, mistakes: [] }}
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
