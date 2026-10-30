import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DailyPlanItem } from "../../../src/domain/daily-plan";
import {
  generateMentalMathTasks,
  parseMentalMathTask,
  shuffleMathTasks,
} from "../../../src/domain/mental-math";
import { createMathAttempt } from "../../../src/storage/math-practice";
import { MentalMathApp } from "./mental-math-app";

const { put, list, progress, build } = vi.hoisted(() => ({
  put: vi.fn(),
  list: vi.fn(),
  progress: vi.fn(),
  build: vi.fn(),
}));
beforeEach(() => {
  put.mockReset().mockResolvedValue(undefined);
  list.mockReset().mockResolvedValue([]);
  progress.mockReset().mockResolvedValue({ openItems: [] });
  build.mockClear();
  // Der Zwischenstand einer abgebrochenen Runde bleibt im localStorage liegen.
  localStorage.clear();
  window.history.pushState(null, "", "/frei/mathematics");
});

vi.mock("../../../src/storage/daily-plan", () => ({
  createDailyPlanRepository: () => ({ progress }),
}));

// Die Auswahl der Tagesportion wird über die Posten geprüft, die in die Runde gehen.
vi.mock("../../../src/domain/math-practice", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../../src/domain/math-practice")>();
  return {
    ...original,
    buildMathReviewRound: (
      ...args: Parameters<typeof original.buildMathReviewRound>
    ) => {
      build(...args);
      return original.buildMathReviewRound(...args);
    },
  };
});

vi.mock("../../../src/storage/math-practice", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../src/storage/math-practice")
  >()),
  createMathPracticeRepository: () => ({
    put,
    list,
    reviews: vi.fn().mockResolvedValue([]),
  }),
}));

/** Fester Zufall (mulberry32): dieselbe Folge in der App und im Test. */
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

describe("MentalMathApp", () => {
  it("exposes the complete Laufdiktat math configuration", async () => {
    const user = userEvent.setup();
    render(<MentalMathApp />);
    expect(screen.getByRole("button", { name: /Plus/ })).toBeVisible();
    expect(screen.getByRole("spinbutton", { name: "Von" })).toBeVisible();
    expect(
      screen.getByRole("checkbox", { name: "Lückenaufgaben" }),
    ).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: "Lückenaufgaben" }));
    expect(
      screen.getByRole("combobox", { name: "Lückenposition" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Mal/ }));
    expect(
      screen.getByRole("group", { name: /Einmaleins-Reihen/ }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "7" })).toBeVisible();
  });

  it("accepts safe custom expressions and starts a keyboard-first round", async () => {
    const user = userEvent.setup();
    render(<MentalMathApp />);
    await user.click(screen.getByRole("button", { name: "Eigene Aufgaben" }));
    const source = screen.getByRole("textbox", {
      name: "Eine Aufgabe pro Zeile",
    });
    await user.clear(source);
    await user.type(source, "2^3");
    expect(screen.getByText(/1 gültige Aufgabe/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Runde starten" }));
    const answer = screen.getByRole("textbox", { name: "Dein Ergebnis" });
    expect(answer).toHaveFocus();
    await user.type(answer, "8{Enter}");
    await waitFor(() => expect(screen.getByText("Richtig")).toBeVisible());
    await waitFor(() =>
      expect(screen.getByText("Gut gerechnet")).toBeVisible(),
    );
  });
});

describe("Vorschau vor der Runde (C-013, M-1)", () => {
  const defaults = {
    operations: ["add", "subtract"] as const,
    minValue: 0,
    maxValue: 20,
    count: 10,
    allowNegativeResults: false,
    excludeZeroOperand: false,
    excludeZeroResult: false,
    multiplicationTables: [] as number[],
    gapMode: false,
  };

  it("zeigt nur Anzahl und Art, keine Aufgabe und keine Lösung", async () => {
    const user = userEvent.setup();
    render(<MentalMathApp random={seededRandom(42)} />);
    await user.click(screen.getByRole("button", { name: "Aufgaben erzeugen" }));
    expect(
      screen.getByText("10 Aufgaben · Plus und Minus bis 20"),
    ).toBeVisible();
    // Kein „= <Ergebnis>“, keine einzelnen Aufgaben, kein „neu würfeln“.
    expect(document.body.textContent).not.toMatch(/=\s*\d/);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /neu würfeln|löschen/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Andere Aufgaben" }),
    ).toBeVisible();
  });

  it("nennt Lücken, Reihen und den Zahlenraum", async () => {
    const user = userEvent.setup();
    render(<MentalMathApp random={seededRandom(1)} />);
    await user.click(screen.getByRole("button", { name: /Mal/ }));
    await user.click(screen.getByRole("button", { name: /Plus/ }));
    await user.click(screen.getByRole("button", { name: /Minus/ }));
    await user.click(screen.getByRole("button", { name: "7" }));
    await user.click(screen.getByRole("checkbox", { name: "Lückenaufgaben" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Anzahl" }),
      "5",
    );
    await user.click(screen.getByRole("button", { name: "Aufgaben erzeugen" }));
    expect(
      screen.getByText("5 Aufgaben · Mal bis 20 · Reihe 7 · Lücken"),
    ).toBeVisible();
    expect(document.body.textContent).not.toMatch(/=\s*\d/);
  });

  it("verrät die erste Rundenaufgabe nicht und mischt die Reihenfolge", async () => {
    const user = userEvent.setup();
    // Dieselbe Folge wie in der App: erst erzeugen, dann mischen.
    const rng = seededRandom(7);
    const generated = generateMentalMathTasks(defaults, rng);
    const expected = shuffleMathTasks(generated, rng);
    expect(expected[0]!.id).not.toBe(generated[0]!.id);

    render(<MentalMathApp random={seededRandom(7)} />);
    await user.click(screen.getByRole("button", { name: "Aufgaben erzeugen" }));
    const setupText = document.body.textContent ?? "";
    for (const task of generated) {
      expect(setupText).not.toContain(task.prompt);
      expect(setupText).not.toContain(`= ${task.answer}`);
    }
    await user.click(screen.getByRole("button", { name: "Runde starten" }));
    const first = await screen.findByRole("heading", { level: 1 });
    expect(first).toHaveTextContent(expected[0]!.prompt);
    expect(first.textContent).not.toBe(generated[0]!.prompt);
    expect(screen.getByText("Aufgabe 1 von 10")).toBeVisible();
  });

  it('"Andere Aufgaben" zieht eine neue Auswahl', async () => {
    const user = userEvent.setup();
    const rng = seededRandom(3);
    const first = generateMentalMathTasks(defaults, rng);
    const second = generateMentalMathTasks(defaults, rng);
    expect(second.map((task) => task.id)).not.toEqual(
      first.map((task) => task.id),
    );
    // Dritter Zug für die Reihenfolge der Runde.
    const expected = shuffleMathTasks(second, rng);

    render(<MentalMathApp random={seededRandom(3)} />);
    await user.click(screen.getByRole("button", { name: "Aufgaben erzeugen" }));
    await user.click(screen.getByRole("button", { name: "Andere Aufgaben" }));
    await user.click(screen.getByRole("button", { name: "Runde starten" }));
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      expected[0]!.prompt,
    );
  });

  it("setzt Brüche in der Liste eigener Aufgaben mit KaTeX", async () => {
    const user = userEvent.setup();
    render(<MentalMathApp />);
    await user.click(screen.getByRole("button", { name: "Eigene Aufgaben" }));
    const input = screen.getByRole("textbox", {
      name: "Eine Aufgabe pro Zeile",
    });
    await user.clear(input);
    await user.click(input);
    await user.paste("7 + 8\n19 + 1 + 3+ \\frac{1}{2}");
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]!.querySelector(".katex")).toBeNull();
    expect(items[1]!.querySelector(".katex")).not.toBeNull();
  });

  it("zeigt eigene Aufgaben ohne Ergebnis", async () => {
    const user = userEvent.setup();
    render(<MentalMathApp />);
    await user.click(screen.getByRole("button", { name: "Eigene Aufgaben" }));
    expect(screen.getByText("7 + 8")).toBeVisible();
    expect(screen.getByRole("list").textContent ?? "").not.toMatch(/=\s*\d/);
    expect(screen.queryByText("= 15")).not.toBeInTheDocument();
  });
});

it("keeps a failed save retryable and does not count it twice", async () => {
  const user = userEvent.setup();
  put.mockRejectedValueOnce(new Error("disk full"));
  render(<MentalMathApp />);
  await user.click(screen.getByRole("button", { name: "Eigene Aufgaben" }));
  const source = screen.getByRole("textbox", {
    name: "Eine Aufgabe pro Zeile",
  });
  await user.clear(source);
  await user.type(source, "7 * 8");
  await user.click(screen.getByRole("button", { name: "Runde starten" }));
  const answer = screen.getByRole("textbox", { name: "Dein Ergebnis" });
  await user.type(answer, "54{Enter}");
  await screen.findByRole("alert");
  expect(answer).toHaveValue("54");
  await user.click(screen.getByRole("button", { name: "Prüfen" }));
  await screen.findByText("Noch nicht.");
  expect(put.mock.calls[0]![0]).toEqual(put.mock.calls[1]![0]);
  await user.clear(answer);
  await user.type(answer, "56{Enter}");
  await screen.findByText("Gut gerechnet");
  expect(put.mock.calls[2]![0].assessment.selfCorrected).toBe(true);
  await user.click(
    screen.getByRole("button", { name: "Neue Runde zusammenstellen" }),
  );
  expect(
    screen.getByRole("button", {
      name: "Meine Fehler und Wiederholungen üben",
    }),
  ).toBeVisible();
});

it("shows a load failure instead of an empty history", async () => {
  list.mockRejectedValueOnce(new Error("storage unavailable"));
  render(<MentalMathApp />);
  expect(await screen.findByRole("alert")).toHaveTextContent("nicht geladen");
  expect(
    screen.queryByText("Hier erscheinen deine Fehler und Wiederholungen."),
  ).not.toBeInTheDocument();
});

it("marks solutions as help and allows a short round to end", async () => {
  const user = userEvent.setup();
  render(<MentalMathApp />);
  await user.click(screen.getByRole("button", { name: "Eigene Aufgaben" }));
  const source = screen.getByRole("textbox", {
    name: "Eine Aufgabe pro Zeile",
  });
  await user.clear(source);
  await user.type(source, "2 + 3");
  await user.click(screen.getByRole("button", { name: "Runde starten" }));
  const answer = screen.getByRole("textbox", { name: "Dein Ergebnis" });
  await user.type(answer, "4{Enter}");
  await user.click(
    await screen.findByRole("button", { name: "Lösungsweg zeigen" }),
  );
  await user.clear(answer);
  await user.type(answer, "5{Enter}");
  await screen.findByText("Gut gerechnet");
  expect(put.mock.calls[1]![0].help).toBe("solution");
  expect(
    screen.getByRole("link", { name: "Für heute fertig" }),
  ).toHaveAttribute("href", "/");
});

describe("Hinweis und Lösungsweg bei Fehlern (D-008)", () => {
  async function start(source: string) {
    const user = userEvent.setup();
    render(<MentalMathApp />);
    await user.click(screen.getByRole("button", { name: "Eigene Aufgaben" }));
    const input = screen.getByRole("textbox", {
      name: "Eine Aufgabe pro Zeile",
    });
    await user.clear(input);
    // Einfügen statt Tippen: „{“ ist bei user.type eine Tastenangabe.
    await user.click(input);
    await user.paste(source);
    await user.click(screen.getByRole("button", { name: "Runde starten" }));
    return {
      user,
      answer: screen.getByRole("textbox", { name: "Dein Ergebnis" }),
    };
  }

  it("zeigt nach dem ersten Fehlversuch einen Hinweis, nach dem zweiten den Lösungsweg", async () => {
    const { user, answer } = await start("47 + 8");
    // Vor dem ersten Versuch weder Hinweis noch Lösung (Regel M-1).
    expect(screen.queryByText(/Tipp:/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Lösungsweg zeigen" }),
    ).not.toBeInTheDocument();

    await user.type(answer, "45{Enter}");
    expect(await screen.findByText("Noch nicht.")).toBeVisible();
    expect(
      screen.getByText("Zerlege am Zehner: 47 + 8 = 47 + 3 + 5."),
    ).toBeVisible();
    expect(screen.queryByText(/So geht es/)).not.toBeInTheDocument();
    // Jetzt gibt es den Knopf für den Lösungsweg.
    expect(
      screen.getByRole("button", { name: "Lösungsweg zeigen" }),
    ).toBeEnabled();
    // Keine Fehlerdiagnose für das Kind.
    expect(screen.queryByText(/vermutlich|Zehnerübergang/i)).toBeNull();

    await user.clear(answer);
    await user.type(answer, "65{Enter}");
    expect(
      await screen.findByText("Jetzt rechnest du zu Ende: 50 + 5."),
    ).toBeVisible();
    expect(screen.getByText("Von der 8 bleiben 5 übrig.")).toBeVisible();
    // Die Lösung kommt in der Hilfe nie vor.
    expect(
      screen.getByText("So geht es:").closest("div"),
    ).not.toHaveTextContent(/55|Die Lösung/);
    expect(screen.queryByText(/Tipp:/)).not.toBeInTheDocument();
  });

  it("wertet den ersten Versuch: die spätere richtige Antwort bleibt Selbstkorrektur mit Hilfe", async () => {
    const { user, answer } = await start("7 * 8");
    await user.type(answer, "54{Enter}");
    await screen.findByText("Noch nicht.");
    await user.clear(answer);
    await user.type(answer, "55{Enter}");
    await screen.findByText("Jetzt rechnest du zu Ende: 35 + 21.");
    await user.clear(answer);
    await user.type(answer, "56{Enter}");
    await screen.findByText("Gut gerechnet");
    const events = put.mock.calls.map((call) => call[0]);
    expect(events.map((event) => event.assessment.knowledge)).toEqual([
      "incorrect",
      "incorrect",
      "correct",
    ]);
    expect(events[0].assessment.selfCorrected).toBe(false);
    expect(events[0].help).toBe("none");
    expect(events[2].assessment.selfCorrected).toBe(true);
    expect(events[2].help).toBe("solution");
  });

  it("zeigt den Lösungsweg auch auf Knopfdruck und zählt ihn als Hilfe", async () => {
    const { user, answer } = await start("56 : 8");
    await user.type(answer, "6{Enter}");
    await user.click(
      await screen.findByRole("button", { name: "Lösungsweg zeigen" }),
    );
    expect(
      screen.getByText("Umkehraufgabe: 56 : 8 = ?, weil ? · 8 = 56."),
    ).toBeVisible();
    expect(screen.getByText("Jetzt rechnest du zu Ende.")).toBeVisible();
    expect(screen.queryByText(/Die Lösung|7/)).not.toBeInTheDocument();
  });

  it("zeigt Tipp und Knopf erst nach dem Fehlversuch an dieser Aufgabe", async () => {
    const { user, answer } = await start("2 + 3\n4 + 4");
    expect(screen.queryByText(/Tipp:/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Lösungsweg zeigen" }),
    ).not.toBeInTheDocument();
    await user.type(answer, "9{Enter}");
    expect(
      await screen.findByRole("button", { name: "Lösungsweg zeigen" }),
    ).toBeVisible();
    expect(screen.getByText(/Tipp:/)).toBeVisible();
    // Die nächste Aufgabe beginnt wieder ohne Hilfe.
    await user.clear(answer);
    await user.type(answer, "5{Enter}");
    await screen.findByText("Aufgabe 2 von 2");
    expect(screen.queryByText(/Tipp:/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Lösungsweg zeigen" }),
    ).not.toBeInTheDocument();
  });

  it("setzt eine Aufgabe mit Bruch mit KaTeX und zeigt einen Lösungsweg ohne Ergebnis", async () => {
    const { user, answer } = await start("19 + 1 + 3+ \\frac{1}{2}");
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.querySelector(".katex")).not.toBeNull();
    // Sichtbar ist der gesetzte Bruch, nicht der LaTeX-Text.
    expect(heading.querySelector(".katex-html")).not.toHaveTextContent(
      "\\frac",
    );
    await user.type(answer, "20{Enter}");
    await user.click(
      await screen.findByRole("button", { name: "Lösungsweg zeigen" }),
    );
    const help = screen.getByText("So geht es:").closest("div")!;
    expect(help).toHaveTextContent("Rechne zuerst 19 + 1 = 20.");
    expect(help).toHaveTextContent("Dann 20 + 3 = 23.");
    // Der Bruch im letzten Schritt ist gesetzt, die Lösung steht nirgends.
    expect(help.querySelector(".katex")).not.toBeNull();
    expect(help).not.toHaveTextContent(/23[,.]5|Die Lösung/);
    expect(help.querySelector(".katex-html")).not.toHaveTextContent("\\frac");
  });

  it("zeigt gewöhnliche Aufgaben ohne KaTeX", async () => {
    await start("7 + 8");
    expect(
      screen.getByRole("heading", { level: 1 }).querySelector(".katex"),
    ).toBeNull();
  });
});

describe("Tagesportion mit ?heute=1", () => {
  async function mistake(source: string, occurredAt: string) {
    return createMathAttempt({
      task: parseMentalMathTask(source)!,
      roundId: `runde-${occurredAt}`,
      attemptId: "1",
      answer: "0",
      selfCorrected: false,
      usedHelp: false,
      now: occurredAt,
    });
  }

  function mathItem(key: string, ...objectIds: string[]): DailyPlanItem {
    return { key, module: "mathematics", kind: "error", objectIds };
  }

  it("übt je offenem Mathe-Element den am längsten fälligen Posten und nur diese", async () => {
    const oldest = await mistake("7 * 8", "2026-10-10T08:00:00.000Z");
    const younger = await mistake("6 * 9", "2026-10-12T08:00:00.000Z");
    const addition = await mistake("12 + 5", "2026-10-11T08:00:00.000Z");
    // Nicht im Plan: darf nicht in die Runde kommen.
    const outside = await mistake("20 - 4", "2026-10-09T08:00:00.000Z");
    list.mockResolvedValue([oldest, younger, addition, outside]);
    progress.mockResolvedValue({
      openItems: [
        // Eine Familie mit zwei Posten: der ältere zählt.
        mathItem(
          "mathematics:multiply",
          younger.learningObjectId,
          oldest.learningObjectId,
        ),
        mathItem("mathematics:add", addition.learningObjectId),
        // Kein Posten mehr dazu: das Element zählt nicht.
        mathItem("mathematics:gone", "gibt-es-nicht"),
        // Klassenaufgabe und Wortschatz gehören nicht in die Runde.
        {
          ...mathItem("mathematics:klasse", outside.learningObjectId),
          route: "/klasse/7b",
        },
        {
          key: "vocabulary:x:forward",
          module: "vocabulary",
          kind: "review",
          objectIds: [outside.learningObjectId],
        },
      ],
    });
    window.history.pushState(null, "", "/frei/mathematics?heute=1");
    render(<MentalMathApp />);

    expect(await screen.findByText(/^Aufgabe 1 von/)).toBeVisible();
    expect(build).toHaveBeenCalledTimes(1);
    const chosen = build.mock.calls[0]![0] as Array<{ id: string }>;
    expect(chosen.map((entry) => entry.id)).toEqual([
      oldest.learningObjectId,
      addition.learningObjectId,
    ]);
    expect(progress).toHaveBeenCalledTimes(1);
  });

  it("sagt, dass der Teil für heute geschafft ist, wenn nichts offen ist", async () => {
    const mistaken = await mistake("7 * 8", "2026-10-10T08:00:00.000Z");
    list.mockResolvedValue([mistaken]);
    // Das Element der Portion ist erledigt und taucht nicht mehr in „offen“ auf.
    progress.mockResolvedValue({ openItems: [] });
    window.history.pushState(null, "", "/frei/mathematics?heute=1");
    render(<MentalMathApp />);

    expect(
      await screen.findByText(
        "Dein Teil für heute ist geschafft. Du kannst frei weiterüben.",
      ),
    ).toHaveAttribute("role", "status");
    expect(build).not.toHaveBeenCalled();
    expect(screen.queryByText(/^Aufgabe 1 von/)).not.toBeInTheDocument();
    // Freies Üben bleibt möglich.
    expect(screen.getByRole("button", { name: "Runde starten" })).toBeEnabled();
  });

  it("lässt das Üben frei, wenn die Portion nicht geladen werden kann", async () => {
    progress.mockRejectedValue(new Error("storage unavailable"));
    window.history.pushState(null, "", "/frei/mathematics?heute=1");
    render(<MentalMathApp />);
    expect(
      await screen.findByText(/Deine Tagesportion konnte nicht geladen werden/),
    ).toHaveAttribute("role", "status");
    expect(screen.getByRole("button", { name: "Runde starten" })).toBeEnabled();
  });

  it("lädt ohne ?heute=1 keine Portion und startet nichts", async () => {
    const mistaken = await mistake("7 * 8", "2026-10-10T08:00:00.000Z");
    list.mockResolvedValue([mistaken]);
    render(<MentalMathApp />);
    expect(
      await screen.findByRole("button", {
        name: "Meine Fehler und Wiederholungen üben",
      }),
    ).toBeVisible();
    expect(progress).not.toHaveBeenCalled();
    expect(screen.queryByText(/^Aufgabe 1 von/)).not.toBeInTheDocument();
  });
});
