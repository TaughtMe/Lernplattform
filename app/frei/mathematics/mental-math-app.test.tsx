import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DailyPlanItem } from "../../../src/domain/daily-plan";
import { parseMentalMathTask } from "../../../src/domain/mental-math";
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
  await screen.findByText("Noch nicht – probiere es erneut.");
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
  await user.click(screen.getByRole("button", { name: "Lösung ansehen" }));
  await user.type(
    screen.getByRole("textbox", { name: "Dein Ergebnis" }),
    "5{Enter}",
  );
  await screen.findByText("Gut gerechnet");
  expect(put.mock.calls[0]![0].help).toBe("solution");
  expect(
    screen.getByRole("link", { name: "Für heute fertig" }),
  ).toHaveAttribute("href", "/");
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
