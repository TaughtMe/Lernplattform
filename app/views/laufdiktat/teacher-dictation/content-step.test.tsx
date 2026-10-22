import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { buildRunningDictationSections } from "../../../../src/domain/running-dictation-sections";
import {
  applyTextSplitOptions,
  textSplitConfigFor,
  textSplitOptionsOf,
} from "../../../../src/domain/teacher-content-summary";
import { DEMO_EDITOR } from "../demo";
import { TeacherDictationScreen } from "../teacher-dictation-screen";
import type { SplitMode } from "./types";

const TEXT = "Eins. Zwei, drei! Haus | Baum\nVier\n\nFünf";

/** Wie der Live-Raum: Konfiguration im Zustand, Abschnitte aus der Teilungslogik. */
function Harness({ withOptions = true }: { withOptions?: boolean }) {
  const [mode, setMode] = useState<SplitMode>("satz");
  const [config, setConfig] = useState(() => textSplitConfigFor("satz"));
  const sections = buildRunningDictationSections(TEXT, config).map(
    ({ text }) => text,
  );
  return (
    <TeacherDictationScreen
      {...DEMO_EDITOR}
      step="import"
      content={{
        kind: "text",
        text: TEXT,
        split: mode,
        ...(withOptions ? { splitOptions: textSplitOptionsOf(config) } : {}),
        sections,
      }}
      onSplit={(next) => {
        setMode(next);
        setConfig((current) =>
          textSplitConfigFor(next, textSplitOptionsOf(current)),
        );
      }}
      onSplitOptions={(patch) =>
        setConfig((current) => applyTextSplitOptions(current, patch, mode))
      }
    />
  );
}

const expectCount = (n: number) =>
  expect(
    screen.getByText(`${n} Abschnitte · so sehen es die Schüler`),
  ).toBeInTheDocument();

describe("Schritt 1 „Inhalt“: Optionen zum Teilen", () => {
  it("zeigt bei „Sätzen“ die Satzzeichen mit . ! ? an und , aus", () => {
    render(<Harness />);
    const pressed = (name: string) =>
      screen.getByRole("button", { name }).getAttribute("aria-pressed");
    expect(
      screen.getByRole("group", { name: "Trennen bei" }),
    ).toBeInTheDocument();
    expect(pressed("Punkt")).toBe("true");
    expect(pressed("Ausrufezeichen")).toBe("true");
    expect(pressed("Fragezeichen")).toBe("true");
    expect(pressed("Komma")).toBe("false");
    expect(
      screen.getByRole("textbox", { name: "Eigenes Zeichen" }),
    ).toHaveValue("");
    // Die Zeilen-Wahl gehört zu „Zeilen“.
    expect(
      screen.queryByRole("group", { name: "Zeilen teilen" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Nur Leerzeilen" }),
    ).not.toBeInTheDocument();
  });

  it("schaltet Satzzeichen an und aus, der letzte aktive bleibt an", async () => {
    render(<Harness />);
    // „Eins.“, „Zwei, drei!“, „Haus | Baum“, „Vier“, „Fünf“.
    expectCount(5);
    await userEvent.click(screen.getByRole("button", { name: "Komma" }));
    expect(screen.getByRole("button", { name: "Komma" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expectCount(6);
    await userEvent.click(screen.getByRole("button", { name: "Punkt" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Ausrufezeichen" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Fragezeichen" }));
    // Nur das Komma ist noch aktiv: Es lässt sich nicht abschalten.
    const last = screen.getByRole("button", { name: "Komma" });
    expect(last).toHaveAttribute("aria-pressed", "true");
    expect(last).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(last);
    expect(last).toHaveAttribute("aria-pressed", "true");
    // Mit einem zweiten Zeichen ist der Knopf wieder frei.
    await userEvent.click(screen.getByRole("button", { name: "Punkt" }));
    expect(screen.getByRole("button", { name: "Komma" })).not.toHaveAttribute(
      "aria-disabled",
    );
  });

  it("teilt am eigenen Zeichen, das höchstens drei Zeichen lang ist", async () => {
    render(<Harness />);
    const field = screen.getByRole("textbox", { name: "Eigenes Zeichen" });
    expect(field).toHaveAttribute("maxlength", "3");
    expectCount(5);
    await userEvent.type(field, "|");
    expect(field).toHaveValue("|");
    expectCount(6);
    expect(screen.getByText("Haus")).toBeInTheDocument();
    expect(screen.getByText("Baum")).toBeInTheDocument();
    await userEvent.clear(field);
    expectCount(5);
  });

  it("zeigt die Zeilen-Wahl nur bei „Zeilen“ und teilt dann an Leerzeilen", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Zeilen" }));
    expect(
      screen.queryByRole("group", { name: "Trennen bei" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Eigenes Zeichen" }),
    ).not.toBeInTheDocument();
    const each = screen.getByRole("button", { name: "Jede Zeile" });
    const blank = screen.getByRole("button", { name: "Nur Leerzeilen" });
    expect(each).toHaveAttribute("aria-pressed", "true");
    expect(blank).toHaveAttribute("aria-pressed", "false");
    expectCount(3);
    await userEvent.click(blank);
    expect(blank).toHaveAttribute("aria-pressed", "true");
    expectCount(2);
    expect(
      screen.getByText("Eins. Zwei, drei! Haus | Baum Vier"),
    ).toBeInTheDocument();
  });

  it("merkt sich die Wahl beim Wechsel zwischen Sätzen und Zeilen", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Komma" }));
    await userEvent.type(
      screen.getByRole("textbox", { name: "Eigenes Zeichen" }),
      ";",
    );
    await userEvent.click(screen.getByRole("button", { name: "Zeilen" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Nur Leerzeilen" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Sätzen" }));
    expect(screen.getByRole("button", { name: "Komma" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("textbox", { name: "Eigenes Zeichen" }),
    ).toHaveValue(";");
    await userEvent.click(screen.getByRole("button", { name: "Zeilen" }));
    expect(
      screen.getByRole("button", { name: "Nur Leerzeilen" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("zeigt bei „Wörtern“ keine Zusatzzeile", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Wörtern" }));
    expect(
      screen.queryByRole("group", { name: "Trennen bei" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Zeilen teilen" }),
    ).not.toBeInTheDocument();
  });

  it("zeigt ohne Feineinstellungen aus dem Raum keine Zusatzzeile", () => {
    render(<Harness withOptions={false} />);
    expect(screen.getByRole("group", { name: "Teilen nach" })).toBeVisible();
    expect(
      screen.queryByRole("group", { name: "Trennen bei" }),
    ).not.toBeInTheDocument();
  });
});
