import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DEMO_TEACHER } from "./demo";
import { TeacherDictationScreen } from "./teacher-dictation-screen";

describe("TeacherDictationScreen, Live-Schritt", () => {
  it.each(["LAUFDIKTAT", "STATION"] as const)(
    "löst den CSV-Export auch über die schmale Schaltfläche aus (%s)",
    async (mode) => {
      const onExportCsv = vi.fn();
      render(
        <TeacherDictationScreen
          {...DEMO_TEACHER}
          step="live"
          mode={mode}
          onExportCsv={onExportCsv}
        />,
      );
      // jsdom wertet keine Container-Queries aus: beide Varianten sind im DOM.
      const buttons = screen.getAllByRole("button", {
        name: "Ergebnisse als CSV herunterladen",
      });
      expect(buttons).toHaveLength(2);
      await userEvent.click(buttons[buttons.length - 1]!);
      expect(onExportCsv).toHaveBeenCalledTimes(1);
    },
  );
});

describe("TeacherDictationScreen, Fehlerwörter je Tier", () => {
  const live = (students: typeof DEMO_TEACHER.live.students) => ({
    ...DEMO_TEACHER.live,
    students,
  });

  it("zeigt die Fehlerwörter eines Tiers aufklappbar mit Anzahl als Text", async () => {
    render(
      <TeacherDictationScreen
        {...DEMO_TEACHER}
        step="live"
        mode="LAUFDIKTAT"
        live={live([
          {
            name: "Fuchs",
            animal: "fuchs",
            progress: 2,
            total: 5,
            mistakes: 4,
            wordErrors: [
              { word: "Hof", count: 3 },
              { word: "Haus", count: 1 },
            ],
          },
          {
            name: "Igel",
            animal: "igel",
            progress: 1,
            total: 5,
            mistakes: 0,
          },
        ])}
      />,
    );
    const summary = screen.getByText("Fehlerwörter (2)");
    expect(summary.closest("details")).not.toHaveAttribute("open");
    // Nur das Tier mit Fehlerwörtern bekommt die Liste.
    expect(screen.getAllByText(/^Fehlerwörter \(/)).toHaveLength(1);
    await userEvent.click(summary);
    expect(summary.closest("details")).toHaveAttribute("open");
    const list = screen.getByRole("list", { name: "Fehlerwörter von Fuchs" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Hof");
    expect(items[0]).toHaveTextContent("3 Fehler");
    expect(items[1]).toHaveTextContent("Haus");
    expect(items[1]).toHaveTextContent("1 Fehler");
  });

  it("kürzt lange Listen und nennt die Zahl der übrigen Wörter", () => {
    const wordErrors = Array.from({ length: 12 }, (_, index) => ({
      word: `Wort${index}`,
      count: 1,
    }));
    render(
      <TeacherDictationScreen
        {...DEMO_TEACHER}
        step="live"
        mode="LAUFDIKTAT"
        live={live([
          {
            name: "Fuchs",
            animal: "fuchs",
            progress: 2,
            total: 5,
            mistakes: 12,
            wordErrors,
          },
        ])}
      />,
    );
    expect(screen.getByText("Fehlerwörter (12)")).toBeInTheDocument();
    expect(screen.getByText("und 2 weitere Wörter")).toBeInTheDocument();
  });
});

describe("TeacherDictationScreen, Wörter in den Wortspeicher", () => {
  const content = (kind: "text" | "math") => ({
    ...DEMO_TEACHER.content,
    kind,
  });

  it("zeigt bei Text die drei Werte bei den Optionen und meldet die Wahl", async () => {
    const onChange = vi.fn();
    render(
      <TeacherDictationScreen
        {...DEMO_TEACHER}
        step="settings"
        content={content("text")}
        wordStore={{ value: "errors", onChange }}
      />,
    );
    const group = screen.getByRole("group", {
      name: "Wörter in den Wortspeicher",
    });
    expect(group).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Falsch geschriebene Wörter" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByText(
        /Die Wörter bleiben auf den Geräten der Kinder. Du siehst sie nicht./,
      ),
    ).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Alle Wörter" }));
    expect(onChange).toHaveBeenCalledWith("all");
    await userEvent.click(screen.getByRole("button", { name: "Aus" }));
    expect(onChange).toHaveBeenCalledWith("none");
  });

  it("fehlt ohne Angabe (Bereich nicht sichtbar) und bei anderen Inhaltsarten", () => {
    const { rerender } = render(
      <TeacherDictationScreen
        {...DEMO_TEACHER}
        step="settings"
        content={content("text")}
      />,
    );
    expect(
      screen.queryByRole("group", { name: "Wörter in den Wortspeicher" }),
    ).not.toBeInTheDocument();
    rerender(
      <TeacherDictationScreen
        {...DEMO_TEACHER}
        step="settings"
        content={content("math")}
        wordStore={{ value: "errors", onChange: vi.fn() }}
      />,
    );
    expect(
      screen.queryByRole("group", { name: "Wörter in den Wortspeicher" }),
    ).not.toBeInTheDocument();
  });
});
