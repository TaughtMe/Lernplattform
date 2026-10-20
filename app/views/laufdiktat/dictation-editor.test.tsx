import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEMO_EDITOR } from "./demo";
import {
  dictationOptionList,
  TeacherDictationScreen,
} from "./teacher-dictation-screen";

describe("Editor Schritt 1 „Inhalt“ (14b)", () => {
  it("zeigt Klasse, Art und Abschnitte und meldet Eingaben", async () => {
    const onSplit = vi.fn();
    const onLeave = vi.fn();
    const onNext = vi.fn();
    const onTitle = vi.fn();
    render(
      <TeacherDictationScreen
        {...DEMO_EDITOR}
        step="import"
        onSplit={onSplit}
        onLeave={onLeave}
        onNext={onNext}
        onTitle={onTitle}
      />,
    );
    expect(
      screen.getByText("Klasse 7b · Neues Laufdiktat · Text"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Inhalt eingeben" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 Inhalt" })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(
      screen.getByText("6 Abschnitte · so sehen es die Schüler"),
    ).toBeInTheDocument();
    expect(screen.getByText("Wird automatisch in der Ablage gespeichert."));

    await userEvent.click(screen.getByRole("button", { name: "Zeilen" }));
    expect(onSplit).toHaveBeenCalledWith("zeile");
    await userEvent.type(screen.getByRole("textbox", { name: "Titel" }), "!");
    expect(onTitle).toHaveBeenCalledWith("Der Hund im Hof!");
    await userEvent.click(
      screen.getByRole("button", { name: "Zurück zu Start" }),
    );
    expect(onLeave).toHaveBeenCalledTimes(1);
    await userEvent.click(
      screen.getByRole("button", { name: /Weiter zu Modus/ }),
    );
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("nennt einen abgelegten Inhalt beim Titel und bietet Löschen mit Bestätigung", async () => {
    const onDelete = vi.fn();
    render(
      <TeacherDictationScreen
        {...DEMO_EDITOR}
        step="import"
        stored
        onDelete={onDelete}
      />,
    );
    expect(
      screen.getByText("Klasse 7b · Der Hund im Hof · Text"),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Aus der Ablage löschen" }),
    );
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Ja, löschen" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe("Editor Schritt 2 „Modus“ (14c, Ende nach 15b)", () => {
  it("wählt Modi, schaltet Optionen und endet mit Speichern und Raum öffnen", async () => {
    const onMode = vi.fn();
    const onToggleOption = vi.fn();
    const onSavePrepared = vi.fn();
    const onNext = vi.fn();
    const onPrevious = vi.fn();
    render(
      <TeacherDictationScreen
        {...DEMO_EDITOR}
        step="settings"
        onMode={onMode}
        onToggleOption={onToggleOption}
        onSavePrepared={onSavePrepared}
        onNext={onNext}
        onPrevious={onPrevious}
      />,
    );
    expect(screen.getByText("Klasse 7b · Der Hund im Hof")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Laufdiktat / }),
    ).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: /^Battle / }));
    expect(onMode).toHaveBeenCalledWith("BATTLE");

    const strict = screen.getByRole("button", { name: /^Genaues Tippen/ });
    expect(strict).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(strict);
    expect(onToggleOption).toHaveBeenCalledWith("strict");

    await userEvent.click(screen.getByRole("button", { name: "Speichern" }));
    expect(onSavePrepared).toHaveBeenCalledTimes(1);
    await userEvent.click(
      screen.getByRole("button", { name: "Raum jetzt öffnen" }),
    );
    expect(onNext).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Zurück" }));
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it("zeigt „Speichern“ nur mit Callback und übernimmt eine eigene Beschriftung", () => {
    render(
      <TeacherDictationScreen
        {...DEMO_EDITOR}
        step="settings"
        nextLabel="Öffnet …"
        nextDisabled
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Speichern" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Öffnet …" })).toBeDisabled();
  });
});

describe("Optionen je Modus", () => {
  it("bietet nur die Optionen, die es im Modus gibt", () => {
    const ids = (...args: Parameters<typeof dictationOptionList>) =>
      dictationOptionList(...args).map(({ id }) => id);
    expect(ids("LAUFDIKTAT", "text")).toEqual([
      "tts",
      "shuffle",
      "strict",
      "stars",
    ]);
    expect(ids("LAUFDIKTAT", "math")).toEqual([
      "tts",
      "shuffle",
      "strict",
      "taskHelp",
      "stars",
    ]);
    expect(ids("BATTLE", "text")).toEqual([
      "tts",
      "shuffle",
      "strict",
      "stars",
      "ink",
      "flicker",
    ]);
    expect(ids("STATION", "math")).toEqual(["tts", "shuffle"]);
  });
});

describe("Tablet und Handy (16a/16b): Einstellungen als Fenster", () => {
  const original = globalThis.ResizeObserver;
  afterEach(() => {
    globalThis.ResizeObserver = original;
  });

  /** jsdom misst nicht: Die Ansicht ist hier 390 px breit. */
  function narrowViewport() {
    globalThis.ResizeObserver = class {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback(
          [{ target, contentRect: { width: 390 } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }

  it("öffnet die Einstellungen beim Tipp auf einen Modus und schließt mit Fertig oder Escape", async () => {
    narrowViewport();
    const onMode = vi.fn();
    const onOpenOptions = vi.fn();
    const onCloseOptions = vi.fn();
    const { rerender } = render(
      <TeacherDictationScreen
        {...DEMO_EDITOR}
        step="settings"
        onMode={onMode}
        onOpenOptions={onOpenOptions}
        onCloseOptions={onCloseOptions}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^Stationen / }));
    expect(onMode).toHaveBeenCalledWith("STATION");
    expect(onOpenOptions).toHaveBeenCalledTimes(1);

    // Ohne die Entwurfstexte der Beispieldaten: die echten Optionen des Modus.
    const { optionList: _template, ...real } = DEMO_EDITOR;
    expect(_template).toBeDefined();
    rerender(
      <TeacherDictationScreen
        {...real}
        step="settings"
        mode="STATION"
        optionsOpen
        onMode={onMode}
        onOpenOptions={onOpenOptions}
        onCloseOptions={onCloseOptions}
      />,
    );
    const dialog = screen.getByRole("dialog", {
      name: "Einstellungen Stationen",
    });
    expect(within(dialog).getByText("Anzahl Stationen")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /^Vorlesen/ }),
    ).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Fertig" }),
    );
    expect(onCloseOptions).toHaveBeenCalledTimes(1);
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(onCloseOptions).toHaveBeenCalledTimes(2);
  });

  it("öffnet in voller Breite kein Fenster; die Optionen stehen neben den Modi", async () => {
    const onOpenOptions = vi.fn();
    render(
      <TeacherDictationScreen
        {...DEMO_EDITOR}
        step="settings"
        onOpenOptions={onOpenOptions}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^Battle / }));
    expect(onOpenOptions).not.toHaveBeenCalled();
    expect(
      screen.getByRole("region", { name: "Optionen" }),
    ).toBeInTheDocument();
  });
});
