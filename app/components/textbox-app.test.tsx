import "fake-indexeddb/auto";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TEXTBOX_TEXTS } from "../../src/domain/textbox-library";
import {
  buildBlankingPlan,
  finishMemorize,
  sessionFromRun,
  startRun,
  submitRound,
} from "../../src/domain/textbox-session";
import {
  PersonalLearningDatabase,
  createTextboxRepository,
} from "../../src/storage/personal-learning-events";
import { TextboxApp } from "./textbox-app";

const text = TEXTBOX_TEXTS[0]!; // „Der kleine Hund“
const databases: PersonalLearningDatabase[] = [];

async function setup(
  prepare?: (
    repository: ReturnType<typeof createTextboxRepository>,
  ) => Promise<void>,
) {
  const database = new PersonalLearningDatabase(`app-${crypto.randomUUID()}`);
  databases.push(database);
  const repository = createTextboxRepository(database);
  await prepare?.(repository);
  render(<TextboxApp repository={repository} />);
  return { database, repository };
}

afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

async function startText(
  user: ReturnType<typeof userEvent.setup>,
  title = text.title,
) {
  await user.click(
    await screen.findByRole("button", { name: `${title} üben` }),
  );
}

async function playRound(
  user: ReturnType<typeof userEvent.setup>,
  round: number,
  freeText = text.text,
) {
  expect(
    await screen.findByRole("heading", {
      name: `Durchgang ${round} von 4: Merken`,
    }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Ich bin bereit" }));
  if (round === 4) {
    await user.type(
      await screen.findByRole("textbox", {
        name: "Dein Text aus dem Gedächtnis",
      }),
      freeText,
    );
  } else {
    await screen.findAllByRole("textbox");
  }
  await user.click(screen.getByRole("button", { name: "Prüfen" }));
  expect(
    await screen.findByRole("heading", {
      name: `Durchgang ${round} von 4: Kontrolle`,
    }),
  ).toBeInTheDocument();
}

describe("TextboxApp", () => {
  it("führt einen Text durch alle vier Durchgänge und merkt sich den Bestwert", async () => {
    const user = userEvent.setup();
    const { database, repository } = await setup();
    await startText(user);
    for (const round of [1, 2, 3] as const) {
      await playRound(user, round);
      expect(screen.getByText("0 %")).toBeInTheDocument(); // alle Lücken leer
      await user.click(
        screen.getByRole("button", {
          name: `Weiter zu Durchgang ${round + 1}`,
        }),
      );
    }
    await playRound(user, 4);
    expect(screen.getByText("100 %")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ergebnis ansehen" }));
    expect(
      await screen.findByRole("heading", { name: "Geschafft!" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("erster Bestwert");
    expect(await repository.listCompleted()).toHaveLength(1);
    expect(await database.learningEvents.count()).toBe(1);

    await user.click(
      screen.getByRole("button", { name: "Anderen Text wählen" }),
    );
    const row = (
      await screen.findByRole("heading", { name: text.title })
    ).closest("li")!;
    expect(row).toHaveTextContent("1 Übung");
    expect(row).toHaveTextContent("Bestwert: 100 %");
  });

  it("zeigt in Durchgang 1 Markierungen und schreibt in den Lücken", async () => {
    const user = userEvent.setup();
    await setup();
    await startText(user);
    expect((await screen.findAllByText(/fehlt gleich/)).length).toBeGreaterThan(
      0,
    );
    await user.click(screen.getByRole("button", { name: "Ich bin bereit" }));
    const gaps = await screen.findAllByRole("textbox");
    expect(gaps[0]).toHaveFocus();
    expect(gaps[0]).toHaveAccessibleName(`Lücke 1 von ${gaps.length}`);
    // Der Originaltext ist während des Schreibens nicht abrufbar.
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });

  /** Legt vor dem Öffnen eine Einheit an, die nach Durchgang 1 unterbrochen wurde. */
  async function prepareOpen(
    repository: ReturnType<typeof createTextboxRepository>,
  ) {
    let state = finishMemorize(startRun(text, "alt"), 10);
    const gaps = buildBlankingPlan(text, "alt")[0].size;
    state = submitRound(
      state,
      text,
      Array.from({ length: gaps }, () => ""),
      10,
    );
    await repository.saveRound(
      sessionFromRun(state, text, {
        startedAt: "2026-10-08T08:00:00.000Z",
        now: "2026-10-08T08:05:00.000Z",
      }),
    );
  }

  it("setzt eine angefangene Einheit mit der Merkphase des nächsten Durchgangs fort", async () => {
    const user = userEvent.setup();
    await setup(prepareOpen);
    await user.click(
      await screen.findByRole("button", { name: `${text.title} weiterüben` }),
    );
    const group = await screen.findByRole("group", {
      name: "Angefangene Übung",
    });
    expect(group).toHaveTextContent("Durchgang 2 von 4");
    await user.click(within(group).getByRole("button", { name: "Fortsetzen" }));
    expect(
      await screen.findByRole("heading", { name: "Durchgang 2 von 4: Merken" }),
    ).toBeInTheDocument();
    expect(document.querySelector("mark")).toBeNull();
  });

  it("verwirft die angefangene Einheit bei „Neu beginnen“", async () => {
    const user = userEvent.setup();
    const { repository } = await setup(prepareOpen);
    await user.click(
      await screen.findByRole("button", { name: `${text.title} weiterüben` }),
    );
    await user.click(screen.getByRole("button", { name: "Neu beginnen" }));
    expect(
      await screen.findByRole("heading", { name: "Durchgang 1 von 4: Merken" }),
    ).toBeInTheDocument();
    expect(await repository.getOpen(text.id)).toBeUndefined();
  });

  it("speichert den Abschluss bei doppeltem Klick nur einmal", async () => {
    const user = userEvent.setup();
    const { database, repository } = await setup();
    await startText(user);
    for (const round of [1, 2, 3] as const) {
      await playRound(user, round);
      await user.click(
        screen.getByRole("button", {
          name: `Weiter zu Durchgang ${round + 1}`,
        }),
      );
    }
    await playRound(user, 4, "Im Garten");
    const finish = screen.getByRole("button", { name: "Ergebnis ansehen" });
    await user.dblClick(finish);
    await screen.findByRole("heading", { name: "Geschafft!" });
    expect(await repository.listCompleted()).toHaveLength(1);
    expect(await database.learningEvents.count()).toBe(1);
  });

  it("geht nach Ablauf der Merkzeit von selbst zum Schreiben", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await setup();
    await startText(user);
    expect(await screen.findByRole("timer")).toHaveTextContent("1:00");
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByRole("timer")).toHaveTextContent("0:30");
    await act(async () => {
      vi.advanceTimersByTime(31_000);
    });
    await waitFor(() =>
      expect(screen.queryByRole("timer")).not.toBeInTheDocument(),
    );
    expect((await screen.findAllByRole("textbox")).length).toBeGreaterThan(0);
  });
});
