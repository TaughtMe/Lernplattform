import { render, screen } from "@testing-library/react";
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
        name: "Ergebnisse als CSV",
      });
      expect(buttons).toHaveLength(2);
      await userEvent.click(buttons[buttons.length - 1]!);
      expect(onExportCsv).toHaveBeenCalledTimes(1);
    },
  );
});

describe("TeacherDictationScreen, Wörter in den Wortspeicher", () => {
  const content = (kind: "text" | "math") => ({
    ...DEMO_TEACHER.content,
    kind,
  });

  it("zeigt bei Text die drei Werte und meldet die Wahl", async () => {
    const onChange = vi.fn();
    render(
      <TeacherDictationScreen
        {...DEMO_TEACHER}
        step="import"
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
        step="import"
        content={content("text")}
      />,
    );
    expect(
      screen.queryByRole("group", { name: "Wörter in den Wortspeicher" }),
    ).not.toBeInTheDocument();
    rerender(
      <TeacherDictationScreen
        {...DEMO_TEACHER}
        step="import"
        content={content("math")}
        wordStore={{ value: "errors", onChange: vi.fn() }}
      />,
    );
    expect(
      screen.queryByRole("group", { name: "Wörter in den Wortspeicher" }),
    ).not.toBeInTheDocument();
  });
});
