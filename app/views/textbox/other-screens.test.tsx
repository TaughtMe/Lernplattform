import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { layoutText } from "../../../src/domain/text-compare";
import type { TextboxRoundResult } from "../../../src/domain/textbox-session";
import { CompletionScreen } from "./completion-screen";
import { FreeWritingScreen } from "./free-writing-screen";
import { LibraryScreen, type LibraryEntry } from "./library-screen";
import { MemorizeScreen } from "./memorize-screen";
import { ReviewScreen } from "./review-screen";
import { TEXTBOX_TEXTS } from "../../../src/domain/textbox-library";

const tokens = layoutText("Der Hund bellt laut.");

describe("MemorizeScreen", () => {
  it("markiert in Durchgang 1 die späteren Lücken mit Farbe und Unterstreichung", async () => {
    const onReady = vi.fn();
    render(
      <MemorizeScreen
        round={1}
        title="Test"
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
        title="Test"
        tokens={tokens}
        markedWords={new Set()}
        secondsLeft={5}
        totalSeconds={60}
        onReady={() => undefined}
      />,
    );
    expect(document.querySelector("mark")).toBeNull();
    expect(screen.getByText(/Der Hund bellt laut\./)).toBeInTheDocument();
  });
});

describe("FreeWritingScreen", () => {
  it("sperrt Einfügen und gibt den Text samt Zeit weiter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FreeWritingScreen title="Test" onSubmit={onSubmit} />);
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
    render(<FreeWritingScreen title="Test" onSubmit={onSubmit} />);
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
  it("zeigt Fehlerarten mit Text und Symbol und nennt Satzzeichen nur als Hinweis", async () => {
    const onNext = vi.fn();
    render(
      <ReviewScreen
        title="Test"
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
      />,
    );
    expect(screen.getByText("50 %")).toBeInTheDocument();
    expect(screen.getByText(/1 von 2 Lücken richtig/)).toBeInTheDocument();
    expect(screen.getByText("fast richtig:")).toBeInTheDocument();
    expect(screen.getByText("Hunt")).toBeInTheDocument();
    expect(screen.getByText("Groß-/Kleinschreibung:")).toBeInTheDocument();
    expect(screen.getByText(/2 Unterschiede/)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Weiter zu Durchgang 2" }),
    );
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("listet in Durchgang 4 alle Wörter und beschriftet den letzten Schritt", () => {
    render(
      <ReviewScreen
        title="Test"
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
      />,
    );
    const list = screen.getByRole("list", { name: "Dein Text im Vergleich" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).getByText("fehlt:")).toBeInTheDocument();
    expect(within(list).getByText("zusätzlich:")).toBeInTheDocument();
    expect(screen.getByText(/1 zusätzlich geschrieben/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ergebnis ansehen" }),
    ).toBeInTheDocument();
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
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(text);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("meldet keinen Bestwert bei schlechterem Ergebnis und bietet die Aktionen an", async () => {
    const onAgain = vi.fn();
    const onLibrary = vi.fn();
    render(
      <CompletionScreen
        title="Test"
        rounds={rounds}
        finalPercent={50}
        previousBest={90}
        onAgain={onAgain}
        onLibrary={onLibrary}
      />,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Nochmal üben" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Anderen Text wählen" }),
    );
    expect(onAgain).toHaveBeenCalledOnce();
    expect(onLibrary).toHaveBeenCalledOnce();
  });
});

describe("LibraryScreen", () => {
  const [first, second, third] = TEXTBOX_TEXTS as [
    (typeof TEXTBOX_TEXTS)[number],
    (typeof TEXTBOX_TEXTS)[number],
    (typeof TEXTBOX_TEXTS)[number],
  ];
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

  function setup(overrides: Partial<Parameters<typeof LibraryScreen>[0]> = {}) {
    const handlers = {
      onStart: vi.fn(),
      onResume: vi.fn(),
      onRestart: vi.fn(),
      onCancelPending: vi.fn(),
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

  it("zeigt immer den Bestwert und die Zahl der Übungen", () => {
    setup();
    const row = screen
      .getByRole("heading", { name: first.title })
      .closest("li")!;
    expect(row).toHaveTextContent("3 Übungen");
    expect(row).toHaveTextContent("Bestwert: 94 %");
    expect(row).not.toHaveTextContent("60 %");
    const untouched = screen
      .getByRole("heading", { name: second.title })
      .closest("li")!;
    expect(untouched).toHaveTextContent("0 Übungen");
    expect(untouched).toHaveTextContent("Bestwert: –");
  });

  it("filtert nach Schwierigkeit, Schwerpunkt und Status", async () => {
    const user = userEvent.setup();
    setup();
    const count = () =>
      screen.getByRole("list", { name: "Texte" }).children.length;
    expect(count()).toBe(15);
    await user.click(screen.getByRole("button", { name: "Schwer" }));
    expect(count()).toBe(5);
    await user.click(screen.getByRole("button", { name: "Alle" }));
    await user.selectOptions(screen.getByLabelText("Schwerpunkt"), "ie");
    expect(count()).toBe(
      TEXTBOX_TEXTS.filter((t) => t.phenomena.includes("ie")).length,
    );
    await user.selectOptions(screen.getByLabelText("Schwerpunkt"), "alle");
    await user.selectOptions(screen.getByLabelText("Status"), "geuebt");
    expect(count()).toBe(1);
    await user.selectOptions(screen.getByLabelText("Status"), "neu");
    expect(count()).toBe(14);
    await user.click(screen.getByRole("button", { name: "Schwer" }));
    await user.selectOptions(screen.getByLabelText("Schwerpunkt"), "ie");
    expect(screen.getByText("Keine passenden Texte")).toBeInTheDocument();
  });

  it("startet einen Text und bietet bei angefangener Übung Fortsetzen und Neu beginnen an", async () => {
    const user = userEvent.setup();
    const handlers = setup();
    await user.click(
      screen.getByRole("button", { name: `${third.title} üben` }),
    );
    expect(handlers.onStart).toHaveBeenCalledWith(third.id);
  });

  it("markiert angefangene Texte und zeigt die Fortsetzen-Auswahl", async () => {
    const user = userEvent.setup();
    const openEntry: LibraryEntry = {
      ...entries[2]!,
      open: {
        id: "x",
        textId: third.id,
        difficulty: third.difficulty,
        status: "laufend",
        seed: "x",
        startedAt: "2026-10-08T08:00:00.000Z",
        updatedAt: "2026-10-08T08:00:00.000Z",
        rounds: [result(1, []), result(1, [])],
      },
    };
    const handlers = setup({
      entries: [openEntry],
      pending: openEntry,
      notice: "Hinweis",
    });
    expect(screen.getByText("Angefangen")).toBeInTheDocument();
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
});
