import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LearningEventV1 } from "../../../src/domain/learning-bundle";
import { mathRoundSnapshotSchema } from "../../../src/domain/math-round-snapshot";
import { parseRoundSnapshot } from "../../../src/domain/round-snapshot";
import { ROUND_SNAPSHOT_KEYS } from "../../../src/storage/round-snapshot";
import { RoundGuardProvider } from "../../ui/round-guard";
import { StudentFrame } from "../../views/shell/student-frame";
import { MentalMathApp } from "./mental-math-app";

const { put, list, progress } = vi.hoisted(() => ({
  put: vi.fn(),
  list: vi.fn(),
  progress: vi.fn(),
}));

vi.mock("../../../src/storage/daily-plan", () => ({
  createDailyPlanRepository: () => ({ progress }),
}));

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

beforeEach(() => {
  put.mockReset().mockResolvedValue(undefined);
  list.mockReset().mockResolvedValue([]);
  progress.mockReset().mockResolvedValue({ openItems: [] });
  window.history.pushState(null, "", "/frei/mathematics");
});

afterEach(() => {
  localStorage.clear();
});

type User = ReturnType<typeof userEvent.setup>;

const SUMS = Array.from({ length: 10 }, (_, index) => index + 1);
const SLOW = { timeout: 4000 };

function mount() {
  return render(
    <RoundGuardProvider>
      <StudentFrame
        items={[
          { href: "/ueben", label: "Üben", icon: "pencil", active: true },
        ]}
        profileHref="/lernen/einstellungen"
      >
        <MentalMathApp />
      </StudentFrame>
    </RoundGuardProvider>,
  );
}

/** Eigene Aufgaben „1 + 1“ bis „10 + 10“ in dieser Reihenfolge. */
async function startRound(user: User) {
  await user.click(screen.getByRole("button", { name: "Eigene Aufgaben" }));
  fireEvent.change(
    screen.getByRole("textbox", { name: "Eine Aufgabe pro Zeile" }),
    { target: { value: SUMS.map((n) => `${n} + ${n}`).join("\n") } },
  );
  await user.click(screen.getByRole("button", { name: "Runde starten" }));
}

const position = () => screen.getByText(/^Aufgabe \d+ von 10$/).textContent;

/** Löst die nächsten Aufgaben richtig und wartet jeweils auf die folgende. */
async function solve(user: User, from: number, count: number) {
  for (let n = from; n < from + count; n += 1) {
    expect(position()).toBe(`Aufgabe ${n} von 10`);
    await user.type(
      screen.getByRole("textbox", { name: "Dein Ergebnis" }),
      `${n * 2}{Enter}`,
    );
    if (n < 10) {
      await waitFor(
        () => expect(position()).toBe(`Aufgabe ${n + 1} von 10`),
        SLOW,
      );
    }
  }
}

function savedSnapshot() {
  return parseRoundSnapshot(
    localStorage.getItem(ROUND_SNAPSHOT_KEYS.kopfrechnen),
    {
      module: "kopfrechnen",
      now: new Date(),
      state: mathRoundSnapshotSchema,
    },
  );
}

const events = () => put.mock.calls.map(([event]) => event as LearningEventV1);

describe("Kopfrechnen: Runde fortsetzen (C-001)", { timeout: 20_000 }, () => {
  it("bietet nach drei Antworten und Neuladen „Weitermachen (3 von 10)“ an und wertet nichts doppelt", async () => {
    const user = userEvent.setup();
    const first = mount();
    await startRound(user);
    await solve(user, 1, 3);
    await waitFor(() => expect(savedSnapshot()?.done).toBe(3));

    first.unmount();
    mount();
    const resume = await screen.findByRole("button", {
      name: "Weitermachen (3 von 10)",
    });
    await user.click(resume);
    expect(position()).toBe("Aufgabe 4 von 10");

    await solve(user, 4, 7);
    expect(await screen.findByText("Gut gerechnet", {}, SLOW)).toBeVisible();

    // Zehn Antworten mit zehn verschiedenen Kennungen, alle in derselben Runde.
    expect(events()).toHaveLength(10);
    expect(new Set(events().map((event) => event.id)).size).toBe(10);
    expect(new Set(events().map((event) => event.roundId)).size).toBe(1);
    expect(localStorage.getItem(ROUND_SNAPSHOT_KEYS.kopfrechnen)).toBeNull();
  });

  it("behält einen Fehlversuch: die spätere richtige Antwort bleibt Selbstkorrektur", async () => {
    const user = userEvent.setup();
    const first = mount();
    await startRound(user);
    await solve(user, 1, 3);
    await user.type(
      screen.getByRole("textbox", { name: "Dein Ergebnis" }),
      "99{Enter}",
    );
    await screen.findByText("Noch nicht.");
    await waitFor(() => expect(savedSnapshot()?.state.corrected).toBe(true));
    const before = events().length;

    first.unmount();
    mount();
    await user.click(
      await screen.findByRole("button", { name: "Weitermachen (3 von 10)" }),
    );
    expect(position()).toBe("Aufgabe 4 von 10");
    await user.type(
      screen.getByRole("textbox", { name: "Dein Ergebnis" }),
      "8{Enter}",
    );
    await waitFor(() => expect(events()).toHaveLength(before + 1));
    const [wrong, right] = events().slice(-2) as [
      LearningEventV1,
      LearningEventV1,
    ];
    expect(wrong.assessment.knowledge).toBe("incorrect");
    expect(right.assessment).toMatchObject({
      knowledge: "correct",
      selfCorrected: true,
    });
    // Eine neue Kennung: Der Versuch überschreibt keinen gespeicherten.
    expect(right.id).not.toBe(wrong.id);
  });

  it("fragt bei einem Tipp auf die Leiste, das Logo und „Runde beenden“ nach", async () => {
    const user = userEvent.setup();
    mount();
    await startRound(user);
    await solve(user, 1, 3);

    await user.click(screen.getByRole("link", { name: "Üben" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Runde wirklich beenden?");
    expect(screen.getByRole("button", { name: "Weiterüben" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Weiterüben" }));
    expect(window.location.pathname).toBe("/frei/mathematics");
    expect(position()).toBe("Aufgabe 4 von 10");

    await user.click(screen.getByRole("link", { name: "Zur Startseite" }));
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: "Weiterüben" }));

    await user.click(screen.getByRole("button", { name: "Runde beenden" }));
    await user.click(await screen.findByRole("button", { name: "Beenden" }));
    expect(
      await screen.findByRole("heading", { name: "Kopfrechnen" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Weitermachen (3 von 10)" }),
    ).toBeVisible();
  });

  it("verwirft den Zwischenstand bei „Neu anfangen“", async () => {
    const user = userEvent.setup();
    const first = mount();
    await startRound(user);
    await solve(user, 1, 2);
    await waitFor(() => expect(savedSnapshot()?.done).toBe(2));
    first.unmount();

    mount();
    const offer = await screen.findByRole("region", {
      name: "Du warst mitten in einer Runde",
    });
    await user.click(
      within(offer).getByRole("button", { name: "Neu anfangen" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Weitermachen/ })).toBeNull(),
    );
    expect(localStorage.getItem(ROUND_SNAPSHOT_KEYS.kopfrechnen)).toBeNull();
  });

  it("bietet bei einem kaputten Zwischenstand nichts an", async () => {
    localStorage.setItem(ROUND_SNAPSHOT_KEYS.kopfrechnen, '{"v":1,"x":');
    mount();
    await screen.findByRole("heading", { name: "Kopfrechnen" });
    expect(screen.queryByRole("button", { name: /Weitermachen/ })).toBeNull();
  });
});
