import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { layoutText } from "../../../src/domain/text-compare";
import type {
  TextboxRoundResult,
  TextboxSession,
} from "../../../src/domain/textbox-session";
import { CompletionScreen } from "./completion-screen";
import { FreeWritingScreen } from "./free-writing-screen";
import { LibraryScreen, type LibraryEntry } from "./library-screen";
import { MemorizeScreen } from "./memorize-screen";
import { ReviewScreen } from "./review-screen";
import { TEXTBOX_TEXTS } from "../../../src/domain/textbox-library";

const tokens = layoutText("Der Hund bellt laut.");
const frame = {
  layout: "heft" as const,
  textTitle: "Test",
  textMeta: "Leicht · Test",
  onBack: vi.fn(),
};

describe("MemorizeScreen", () => {
  it("markiert in Durchgang 1 die späteren Lücken mit Farbe und Unterstreichung", async () => {
    const onReady = vi.fn();
    render(
      <MemorizeScreen
        round={1}
        {...frame}
        tokens={tokens}
        markedWords={new Set([1])}
        secondsLeft={45}
        totalSeconds={60}
        onReady={onReady}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Durchgang 1 von 4: Merken",
    );
    expect(screen.getByRole("timer")).toHaveTextContent("0:45");
    expect(
      screen.getByRole("progressbar", { name: "Verbleibende Merkzeit" }),
    ).toHaveAttribute("aria-valuenow", "45");
    expect(screen.getByText("Hund", { selector: "mark" })).toBeInTheDocument();
    expect(screen.getByText("(fehlt gleich)")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Ich bin bereit" }),
    );
    expect(onReady).toHaveBeenCalledOnce();
  });

  it("zeigt ab Durchgang 2 keine Markierung", () => {
    render(
      <MemorizeScreen
        round={2}
        {...frame}
        tokens={tokens}
        markedWords={new Set()}
        secondsLeft={5}
        totalSeconds={60}
        onReady={() => undefined}
      />,
    );
    expect(document.querySelector("mark")).toBeNull();
    expect(screen.getByText("Hund").closest("p")).toHaveTextContent(
      "Der Hund bellt laut.",
    );
  });
});

describe("FreeWritingScreen", () => {
  it("sperrt Einfügen und gibt den Text samt Zeit weiter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FreeWritingScreen {...frame} onSubmit={onSubmit} />);
    const field = screen.getByRole("textbox", {
      name: "Dein Text aus dem Gedächtnis",
    });
    expect(field).toHaveFocus();
    expect(field).toHaveAttribute("spellcheck", "false");
    expect(field).toHaveAttribute("maxlength", "4000");
    await user.paste("kopiert");
    expect(field).toHaveValue("");
    await user.keyboard("Der Hund");
    await user.click(screen.getByRole("button", { name: "Prüfen" }));
    expect(onSubmit).toHaveBeenCalledWith("Der Hund", expect.any(Number));
  });

  it("meldet 0 ms, wenn nichts getippt wurde", async () => {
    const onSubmit = vi.fn();
    render(<FreeWritingScreen {...frame} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Prüfen" }));
    expect(onSubmit).toHaveBeenCalledWith("", 0);
  });
});

function result(
  round: 1 | 4,
  words: TextboxRoundResult["words"],
): TextboxRoundResult {
  return {
    round,
    blanked: [1, 2],
    words,
    score: {
      percent: 50,
      correct: 1,
      total: 2,
      extra: round === 4 ? 1 : 0,
      byKind: {
        richtig: 1,
        falsch: 1,
        "gross-klein": 0,
        fehlt: 0,
        zusaetzlich: round === 4 ? 1 : 0,
      },
      punctuationHints: 2,
    },
    memorizeMs: 0,
    writingMs: 0,
  };
}

describe("ReviewScreen", () => {
  it("zeigt Fehlerarten ohne Symbole mit Präfixen, Durchstreichung und Kästchen", async () => {
    const onNext = vi.fn();
    const onRepeat = vi.fn();
    render(
      <ReviewScreen
        {...frame}
        tokens={tokens}
        result={result(1, [
          {
            kind: "falsch",
            expected: "Hund",
            actual: "Hunt",
            expectedIndex: 1,
            nearMiss: true,
          },
          {
            kind: "gross-klein",
            expected: "bellt",
            actual: "Bellt",
            expectedIndex: 2,
            nearMiss: false,
          },
        ])}
        onNext={onNext}
        onRepeat={onRepeat}
      />,
    );
    expect(screen.getByText("50 %")).toBeInTheDocument();
    expect(
      screen.getByText(/Lücken richtig geschrieben/).closest("p"),
    ).toHaveTextContent("1 von 2 Lücken richtig geschrieben");
    expect(screen.getByText("fast richtig:")).toBeInTheDocument();
    expect(screen.getByText("Groß-/Kleinschreibung:")).toBeInTheDocument();
    const wrong = screen.getByText("Hunt");
    expect(wrong.tagName).toBe("S");
    expect(screen.getByText("Hund").className).toMatch(/ok/);
    expect(screen.getByText("Bellt").tagName).toBe("S");
    expect(screen.getByText("bellt").className).toMatch(/caseBox/);
    expect(screen.queryByText("✓")).toBeNull();
    expect(screen.queryByRole("list", { name: /Zeichen/ })).toBeNull();
    expect(screen.getByText(/2 Unterschiede/)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Weiter zu Durchgang 2" }),
    );
    expect(onNext).toHaveBeenCalledOnce();
    await userEvent.click(
      screen.getByRole("button", { name: "Durchgang wiederholen" }),
    );
    expect(onRepeat).toHaveBeenCalledOnce();
  });

  it("zeigt in Durchgang 4 den Fließtext und beschriftet den letzten Schritt", () => {
    render(
      <ReviewScreen
        {...frame}
        tokens={tokens}
        result={result(4, [
          {
            kind: "richtig",
            expected: "Der",
            actual: "Der",
            expectedIndex: 0,
            nearMiss: false,
          },
          {
            kind: "fehlt",
            expected: "Hund",
            expectedIndex: 1,
            nearMiss: false,
          },
          { kind: "zusaetzlich", actual: "sehr", nearMiss: false },
        ])}
        onNext={() => undefined}
        onRepeat={() => undefined}
      />,
    );
    expect(screen.queryByRole("list", { name: /Dein Text/ })).toBeNull();
    const paper = screen.getByText("fehlt:").closest("p")!;
    expect(paper).toHaveTextContent(
      "richtig: Der fehlt: Hund zusätzlich: sehr",
    );
    expect(screen.getByText("Der").className).not.toMatch(/ok/);
    expect(screen.getByText("Hund").className).toMatch(/missBox/);
    expect(screen.getByText("sehr").tagName).toBe("S");
    expect(screen.getByText(/1 zusätzlich geschrieben/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ergebnis ansehen" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Durchgang 4 von 4: Kontrolle",
    );
  });

  it("markiert erledigte Schritte und ruft „Auswahl“ auf", async () => {
    const onBack = vi.fn();
    render(
      <ReviewScreen
        {...frame}
        onBack={onBack}
        tokens={tokens}
        result={result(1, [])}
        onNext={() => undefined}
        onRepeat={() => undefined}
      />,
    );
    const steps = within(
      screen.getByRole("list", { name: "Ablauf eines Durchgangs" }),
    ).getAllByRole("listitem");
    expect(steps[0]!.className).toMatch(/stepDone/);
    expect(steps[2]).toHaveAttribute("aria-current", "step");
    await userEvent.click(
      screen.getByRole("button", { name: "Zurück zur Auswahl" }),
    );
    expect(onBack).toHaveBeenCalledOnce();
  });
});

describe("CompletionScreen", () => {
  const rounds = [1, 2, 3, 4].map((n) => ({
    ...result(1, []),
    round: n as 1 | 2 | 3 | 4,
  }));
  it.each([
    [undefined, "Das ist dein erster Bestwert"],
    [40, "Neuer Bestwert!"],
  ])("meldet bei bisherigem Bestwert %s: %s", (previousBest, text) => {
    render(
      <CompletionScreen
        title="Test"
        rounds={rounds}
        finalPercent={80}
        previousBest={previousBest}
        onAgain={() => undefined}
        onLibrary={() => undefined}
        onHistory={() => undefined}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(text);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("meldet keinen Bestwert bei schlechterem Ergebnis und bietet die Aktionen an", async () => {
    const onAgain = vi.fn();
    const onLibrary = vi.fn();
    const onHistory = vi.fn();
    render(
      <CompletionScreen
        title="Test"
        rounds={rounds}
        finalPercent={50}
        previousBest={90}
        onAgain={onAgain}
        onLibrary={onLibrary}
        onHistory={onHistory}
      />,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Nochmal üben" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Anderen Text wählen" }),
    );
    expect(onAgain).toHaveBeenCalledOnce();
    expect(onLibrary).toHaveBeenCalledOnce();
    await userEvent.click(
      screen.getByRole("button", { name: "Verlauf ansehen" }),
    );
    expect(onHistory).toHaveBeenCalledOnce();
  });
});

describe("LibraryScreen", () => {
  const [first, second, third] = TEXTBOX_TEXTS as [
    (typeof TEXTBOX_TEXTS)[number],
    (typeof TEXTBOX_TEXTS)[number],
    (typeof TEXTBOX_TEXTS)[number],
  ];
  const total = TEXTBOX_TEXTS.length;
  const entries: LibraryEntry[] = TEXTBOX_TEXTS.map((text) => ({
    text,
    summary:
      text.id === first.id
        ? {
            textId: text.id,
            sessions: 3,
            bestPercent: 94,
            lastPercent: 60,
            history: [],
          }
        : undefined,
    open: undefined,
  }));
  const openSession = (textId: string, rounds: number): TextboxSession => ({
    id: "x",
    textId,
    difficulty: third.difficulty,
    status: "laufend",
    seed: "x",
    startedAt: "2026-10-08T08:00:00.000Z",
    updatedAt: "2026-10-08T08:00:00.000Z",
    rounds: Array.from({ length: rounds }, () => result(1, [])),
  });

  function setup(overrides: Partial<Parameters<typeof LibraryScreen>[0]> = {}) {
    const handlers = {
      onStart: vi.fn(),
      onResume: vi.fn(),
      onRestart: vi.fn(),
      onCancelPending: vi.fn(),
      onDetails: vi.fn(),
    };
    render(
      <LibraryScreen
        entries={entries}
        pending={undefined}
        {...handlers}
        {...overrides}
      />,
    );
    return handlers;
  }
  const count = () =>
    screen.getByRole("list", { name: "Texte" }).children.length;
  const card = (title: string) =>
    screen
      .getByRole("button", { name: new RegExp(`^${title} (üben|weiterüben)$`) })
      .closest("li")!;

  it("zeigt Bestwert und Anzahl der Übungen", () => {
    setup();
    expect(card(first.title)).toHaveTextContent("Bestwert: 94 %");
    expect(card(first.title)).toHaveTextContent("3 Übungen");
    expect(card(first.title)).toHaveTextContent("Gemeistert");
    expect(card(first.title)).not.toHaveTextContent("60 %");
    expect(card(second.title)).toHaveTextContent("Bestwert: –");
    expect(card(second.title)).toHaveTextContent("0 Übungen");
    expect(card(second.title)).toHaveTextContent("Neu");
    expect(screen.getByText(`${total} Texte`)).toBeInTheDocument();
  });

  it("filtert die Stufe genau und hebt sie beim zweiten Klick auf", async () => {
    const user = userEvent.setup();
    setup();
    const hard = TEXTBOX_TEXTS.filter((t) => t.difficulty === "schwer").length;
    const button = screen.getByRole("button", { name: "Schwer" });
    expect(button).not.toHaveAttribute("aria-pressed");
    await user.click(button);
    expect(count()).toBe(hard);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(`${hard} von ${total} Texten`)).toBeInTheDocument();
    await user.click(button);
    expect(count()).toBe(total);
    expect(button).not.toHaveAttribute("aria-pressed");
  });

  it("filtert den Stand als Mehrfachauswahl", async () => {
    const user = userEvent.setup();
    setup();
    const neu = screen.getByRole("button", { name: "Neu" });
    await user.click(neu);
    expect(neu).toHaveAttribute("aria-pressed", "true");
    expect(count()).toBe(total - 1);
    await user.click(screen.getByRole("button", { name: "Gemeistert" }));
    expect(count()).toBe(total);
    await user.click(neu);
    expect(count()).toBe(1);
  });

  it("wählt Schwerpunkte mit Kontrollkästchen und schließt mit Fertig und Escape", async () => {
    const user = userEvent.setup();
    setup();
    const opener = screen.getByRole("button", { name: "Thema" });
    const sheet = document.querySelector("dialog")!;
    expect(opener).toHaveAttribute("aria-expanded", "false");
    await user.click(opener);
    expect(opener).toHaveAttribute("aria-expanded", "true");
    expect(sheet).toHaveAttribute("open");
    await user.click(screen.getByRole("checkbox", { name: /Wörter mit ie/ }));
    expect(count()).toBe(
      TEXTBOX_TEXTS.filter((t) => t.phenomena.includes("ie")).length,
    );
    expect(
      screen.getByRole("button", { name: "Thema · 1" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Fertig" }));
    expect(sheet).not.toHaveAttribute("open");
    expect(opener).toHaveFocus();
    await user.click(opener);
    expect(sheet).toHaveAttribute("open");
    await user.keyboard("{Escape}");
    expect(sheet).not.toHaveAttribute("open");
    expect(opener).toHaveFocus();
  });

  it("wählt den Stand mobil im Auswahlfeld mit Anzahl", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Stand" }));
    const neu = screen.getByRole("checkbox", { name: /Neu/ });
    expect(neu.closest("label")).toHaveTextContent(`Neu${total - 1}`);
    await user.click(neu);
    expect(count()).toBe(total - 1);
    expect(
      screen.getByRole("button", { name: "Stand · 1" }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Stand · 1" })).toHaveFocus();
  });

  it("sucht im Titel und in der Bezeichnung eines Schwerpunkts", async () => {
    const user = userEvent.setup();
    setup();
    const search = screen.getByRole("searchbox", { name: "Text suchen" });
    await user.type(search, first.title.toUpperCase());
    expect(count()).toBeGreaterThanOrEqual(1);
    expect(card(first.title)).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, "dehnungs");
    expect(count()).toBe(
      TEXTBOX_TEXTS.filter(
        (t) =>
          t.phenomena.includes("dehnungs-h") ||
          t.title.toLowerCase().includes("dehnungs"),
      ).length,
    );
  });

  it("entfernt aktive Filter einzeln und alle zusammen", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Mittel" }));
    await user.click(screen.getByRole("button", { name: "Neu" }));
    expect(
      screen.getByRole("button", { name: "Filter „Mittel“ entfernen" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Filter „Mittel“ entfernen" }),
    );
    expect(screen.getByRole("button", { name: "Mittel" })).not.toHaveAttribute(
      "aria-pressed",
    );
    expect(count()).toBe(total - 1);
    await user.click(screen.getByRole("button", { name: "Alle entfernen" }));
    expect(count()).toBe(total);
    expect(
      screen.queryByRole("button", { name: /Filter .* entfernen/ }),
    ).toBeNull();
  });

  it("zeigt den leeren Zustand und setzt die Filter zurück", async () => {
    const user = userEvent.setup();
    setup();
    const other = first.difficulty === "schwer" ? "Leicht" : "Schwer";
    await user.click(screen.getByRole("button", { name: other }));
    await user.click(screen.getByRole("button", { name: "Gemeistert" }));
    expect(
      screen.getByText("Kein Text passt zu diesen Filtern."),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Filter zurücksetzen" }),
    );
    expect(count()).toBe(total);
  });

  it("startet einen Text über die ganze Karte", async () => {
    const user = userEvent.setup();
    const handlers = setup();
    await user.click(
      screen.getByRole("button", { name: `${third.title} üben` }),
    );
    expect(handlers.onStart).toHaveBeenCalledWith(third.id);
  });

  it("bietet den Verlauf nur für geübte Texte an", async () => {
    const user = userEvent.setup();
    const handlers = setup();
    expect(
      screen.getAllByRole("button", { name: /Verlauf ansehen/ }),
    ).toHaveLength(1);
    await user.click(
      screen.getByRole("button", { name: `${first.title}: Verlauf ansehen` }),
    );
    expect(handlers.onDetails).toHaveBeenCalledWith(first.id);
  });

  it("setzt über „Weitermachen“ direkt fort und markiert offene Karten", async () => {
    const user = userEvent.setup();
    const openEntry: LibraryEntry = {
      ...entries[2]!,
      open: openSession(third.id, 1),
    };
    const handlers = setup({
      entries: [openEntry, entries[0]!],
    });
    const section = screen.getByRole("region", { name: "Weitermachen" });
    expect(section).toHaveTextContent("Durchgang 2 von 4");
    await user.click(
      within(section).getByRole("button", {
        name: `${third.title} fortsetzen`,
      }),
    );
    expect(handlers.onResume).toHaveBeenCalledWith(third.id);
    expect(handlers.onStart).not.toHaveBeenCalled();
    const openCard = card(third.title);
    expect(openCard).toHaveTextContent("Durchgang 2 offen");
    await user.click(
      screen.getByRole("button", { name: `${third.title} weiterüben` }),
    );
    expect(handlers.onStart).toHaveBeenCalledWith(third.id);
  });

  it("zeigt Hinweis und Fortsetzen-Auswahl", async () => {
    const user = userEvent.setup();
    const openEntry: LibraryEntry = {
      ...entries[2]!,
      open: openSession(third.id, 2),
    };
    const handlers = setup({
      entries: [openEntry],
      pending: openEntry,
      notice: "Hinweis",
    });
    expect(screen.getByText("Hinweis")).toBeInTheDocument();
    const group = screen.getByRole("group", { name: "Angefangene Übung" });
    expect(group).toHaveTextContent("Durchgang 3 von 4");
    await user.click(within(group).getByRole("button", { name: "Fortsetzen" }));
    await user.click(
      within(group).getByRole("button", { name: "Neu beginnen" }),
    );
    await user.click(within(group).getByRole("button", { name: "Abbrechen" }));
    expect(handlers.onResume).toHaveBeenCalledWith(third.id);
    expect(handlers.onRestart).toHaveBeenCalledWith(third.id);
    expect(handlers.onCancelPending).toHaveBeenCalledOnce();
  });

  it("übernimmt einen Schwerpunkt aus dem Wortspeicher als Filter", () => {
    setup({ initialPhenomenon: "ie" });
    expect(count()).toBe(
      TEXTBOX_TEXTS.filter((t) => t.phenomena.includes("ie")).length,
    );
    expect(
      screen.getByRole("button", { name: "Filter „Wörter mit ie“ entfernen" }),
    ).toBeInTheDocument();
  });

  it("verweist auf den Laufzettel", () => {
    setup();
    expect(
      screen.getByRole("link", { name: "Laufzettel ansehen und drucken" }),
    ).toBeInTheDocument();
  });
});
