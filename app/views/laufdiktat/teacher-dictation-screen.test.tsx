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
