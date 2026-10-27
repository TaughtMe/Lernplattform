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
import { resolveStages, resolveVisibility } from "../../src/domain/release";
import { ReleaseProvider } from "../release/release-context";
import { TextboxApp } from "./textbox-app";

const text = TEXTBOX_TEXTS[0]!; // „Der kleine Hund“
const databases: PersonalLearningDatabase[] = [];

/**
 * Ein Durchlauf mit allen vier Durchgängen tippt den ganzen Text und rendert
 * dabei viele Ansichten. Allein dauert er etwa 2 s; auf einem ausgelasteten
 * Rechner (voller Testlauf, CI) reichen die 5 s Standard nicht. Gilt nur für
 * diese Durchläufe, nicht pauschal.
 */
const VIER_DURCHGAENGE = 20_000;

async function setup(
  prepare?: (
    repository: ReturnType<typeof createTextboxRepository>,
  ) => Promise<void>,
  options: { query?: string; stages?: string } = {},
) {
  const database = new PersonalLearningDatabase(`app-${crypto.randomUUID()}`);
  databases.push(database);
  const repository = createTextboxRepository(database);
  await prepare?.(repository);
  window.history.pushState(
    null,
    "",
    `/frei/german/textbox${options.query ?? ""}`,
  );
  const visibility = resolveVisibility(resolveStages(options.stages), false);
  render(
    <ReleaseProvider value={visibility}>
      <TextboxApp repository={repository} />
    </ReleaseProvider>,
  );
  return { database, repository };
}

afterEach(async () => {
  vi.useRealTimers();
  window.history.pushState(null, "", "/");
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
  it(
    "führt einen Text durch alle vier Durchgänge und merkt sich den Bestwert",
    async () => {
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
      await user.click(
        screen.getByRole("button", { name: "Ergebnis ansehen" }),
      );
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
        await screen.findByRole("heading", { name: new RegExp(text.title) })
      ).closest("li")!;
      expect(row).toHaveTextContent("1 Übung");
      expect(row).toHaveTextContent("Bestwert: 100 %");
    },
    VIER_DURCHGAENGE,
  );

  it("zeigt in Durchgang 1 Markierungen und schreibt in den Lücken", async () => {
    const user = userEvent.setup();
    await setup();
    await startText(user);
    expect((await screen.findAllByText(/fehlt gleich/)).length).toBeGreaterThan(
      0,
    );
    await user.click(screen.getByRole("button", { name: "Ich bin bereit" }));
    const gaps = await screen.findAllByRole("textbox");
    // Der Fokus wird nach dem Rendern gesetzt, nicht im selben Schritt.
    await waitFor(() => expect(gaps[0]).toHaveFocus());
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

  it("behält beim Wiederholen von Durchgang 1 den Versuch gespeichert", async () => {
    const user = userEvent.setup();
    const { repository } = await setup();
    await startText(user);
    await playRound(user, 1);
    await waitFor(async () =>
      expect(await repository.getOpen(text.id)).toBeDefined(),
    );
    await user.click(
      screen.getByRole("button", { name: "Durchgang wiederholen" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Durchgang 1 von 4: Merken" }),
    ).toBeInTheDocument();
    expect((await repository.getOpen(text.id))?.rounds).toHaveLength(1);
  });

  it("speichert beim Wiederholen von Durchgang 2 weiter beide Durchgänge", async () => {
    const user = userEvent.setup();
    const { repository } = await setup();
    await startText(user);
    await playRound(user, 1);
    await user.click(
      screen.getByRole("button", { name: "Weiter zu Durchgang 2" }),
    );
    await playRound(user, 2);
    await waitFor(async () =>
      expect((await repository.getOpen(text.id))?.rounds).toHaveLength(2),
    );
    await user.click(
      screen.getByRole("button", { name: "Durchgang wiederholen" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Durchgang 2 von 4: Merken" }),
    ).toBeInTheDocument();
    expect((await repository.getOpen(text.id))?.rounds).toHaveLength(2);
  });

  it(
    "wertet jeden Versuch in Durchgang 4; der letzte ist das Ergebnis und steht im Verlauf",
    async () => {
      const user = userEvent.setup();
      const { repository, database } = await setup();
      await startText(user);
      for (const round of [1, 2, 3] as const) {
        await playRound(user, round);
        await user.click(
          screen.getByRole("button", {
            name: `Weiter zu Durchgang ${round + 1}`,
          }),
        );
      }
      // Versuch 1: nur ein Teil des Textes.
      await playRound(user, 4, "Im Garten wohnt ein Hund");
      expect(screen.getByText(/Wörtern richtig geschrieben/)).toBeVisible();
      expect(screen.queryByText(/in diesem Durchgang/)).not.toBeInTheDocument();
      const first = screen.getByText(/ %$/).textContent!.replace(" %", "");
      await user.click(
        screen.getByRole("button", { name: "Durchgang wiederholen" }),
      );
      // Versuch 2: der ganze Text, fehlerfrei.
      await playRound(user, 4);
      expect(screen.getByRole("status")).toHaveTextContent(
        `Versuch 2 in diesem Durchgang: ${first} % → 100 %`,
      );
      expect(screen.queryByText(/zählt nicht|Übungsversuch/)).toBeNull();
      await waitFor(async () => {
        const open = await repository.getOpen(text.id);
        expect(open?.rounds[3]?.retries).toHaveLength(1);
      });
      const stored = (await repository.getOpen(text.id))!.rounds[3]!;
      expect(stored.score.percent).toBeLessThan(30);
      expect(stored.retries![0]!.score.percent).toBe(100);
      expect(stored.retries![0]!.at).toBeDefined();

      await user.click(
        screen.getByRole("button", { name: "Ergebnis ansehen" }),
      );
      expect(
        await screen.findByRole("heading", { name: "Geschafft!" }),
      ).toBeInTheDocument();
      const [done] = await repository.listCompleted();
      expect(done!.finalPercent).toBe(100);
      expect(
        screen.getByText(/Ergebnis aus Durchgang 4, Versuch 2/),
      ).toBeVisible();
      expect(screen.getByText(`Versuch 2: ${first} % → 100 %`)).toBeVisible();
      expect(screen.queryByText(/zählt nicht|Übungsversuch/)).toBeNull();
      // Lernstand: das Ereignis folgt dem letzten Versuch.
      const events = await database.learningEvents.toArray();
      expect(events).toHaveLength(1);
      expect(events[0]!.assessment.writing).toBe("correct");
      // Der Verlauf zeigt die Entwicklung aller Versuche.
      await user.click(screen.getByRole("button", { name: "Verlauf ansehen" }));
      expect(
        await screen.findByText(`Durchgang 4: ${first} % → 100 %`, {
          exact: false,
        }),
      ).toBeInTheDocument();
    },
    VIER_DURCHGAENGE,
  );

  it(
    "speichert den Abschluss bei doppeltem Klick nur einmal",
    async () => {
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
    },
    VIER_DURCHGAENGE,
  );

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

  it(
    "führt vom Abschluss und aus der Bibliothek zum Verlauf eines Textes",
    async () => {
      const user = userEvent.setup();
      await setup();
      await startText(user);
      for (const round of [1, 2, 3] as const) {
        await playRound(user, round);
        await user.click(
          screen.getByRole("button", {
            name: `Weiter zu Durchgang ${round + 1}`,
          }),
        );
      }
      await playRound(user, 4);
      await user.click(
        screen.getByRole("button", { name: "Ergebnis ansehen" }),
      );
      await user.click(
        await screen.findByRole("button", { name: "Verlauf ansehen" }),
      );
      expect(
        await screen.findByRole("heading", { name: text.title }),
      ).toBeInTheDocument();
      expect(screen.getByText("Bestwert").nextSibling).toHaveTextContent(
        "100 %",
      );
      expect(screen.getByRole("img")).toHaveAccessibleName(
        /ein Wert, 100 Prozent/,
      );
      await user.click(screen.getByRole("button", { name: "Zur Textauswahl" }));
      await user.click(
        await screen.findByRole("button", {
          name: `${text.title}: Verlauf ansehen`,
        }),
      );
      await user.click(screen.getByRole("button", { name: "Erneut üben" }));
      expect(
        await screen.findByRole("heading", {
          name: "Durchgang 1 von 4: Merken",
        }),
      ).toBeInTheDocument();
    },
    VIER_DURCHGAENGE,
  );

  describe("Wortspeicher-Brücke", () => {
    it("schlägt Texte mit den mitgebrachten Wörtern vor und blendet sie aus", async () => {
      const user = userEvent.setup();
      await setup(undefined, { query: "?woerter=Ball,rennt,Wiese,xyz" });
      const panel = await screen.findByRole("region", {
        name: "Passende Texte zu deinen Wörtern",
      });
      expect(within(panel).getAllByRole("listitem")[0]).toHaveTextContent(
        `${text.title}Enthält 3 deiner 4 Wörter.`,
      );
      await user.click(
        within(panel).getByRole("button", {
          name: `${text.title} mit deinen Wörtern üben`,
        }),
      );
      await screen.findByRole("heading", { name: "Durchgang 1 von 4: Merken" });
      // „Wiese“ gehört nicht zu den Zielwörtern, wird aber als geübtes Wort markiert.
      expect(
        [...document.querySelectorAll("mark")].map((mark) =>
          mark.textContent?.replace("(fehlt gleich)", "").trim(),
        ),
      ).toContain("Wiese");
    });

    it("zeigt ohne Treffer die Bibliothek mit vorgewähltem Schwerpunkt", async () => {
      await setup(undefined, {
        query: "?woerter=gibtesnicht&sammlung=double-consonants",
      });
      expect(
        await screen.findByText(/noch keinen passenden Text/),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Thema · 1" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: "Filter „Doppelkonsonanten“ entfernen",
        }),
      ).toBeInTheDocument();
    });

    it("ignoriert ungültige Parameter", async () => {
      await setup(undefined, { query: "?woerter=%3Cb%3E&sammlung=nope" });
      await screen.findByRole("heading", { name: "Textbox" });
      expect(
        screen.queryByRole("region", {
          name: "Passende Texte zu deinen Wörtern",
        }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Thema" })).toBeInTheDocument();
    });

    async function finishWith(
      user: ReturnType<typeof userEvent.setup>,
      typed: string,
    ) {
      for (const round of [1, 2, 3] as const) {
        await playRound(user, round);
        await user.click(
          screen.getByRole("button", {
            name: `Weiter zu Durchgang ${round + 1}`,
          }),
        );
      }
      await playRound(user, 4, typed);
      await user.click(
        screen.getByRole("button", { name: "Ergebnis ansehen" }),
      );
      await screen.findByRole("heading", { name: "Geschafft!" });
    }

    it(
      "bietet nach Fehlern die Fehlerwörter im Wortspeicher an",
      async () => {
        const user = userEvent.setup();
        await setup();
        await startText(user);
        await finishWith(user, "Im Garten");
        const link = screen.getByRole("link", {
          name: "Fehlerwörter im Wortspeicher üben",
        });
        const url = new URL(link.getAttribute("href")!, "http://x");
        expect(url.pathname).toBe("/frei/german/lernwoerter");
        expect(url.searchParams.get("woerter")).toContain("wohnt");
      },
      VIER_DURCHGAENGE,
    );

    it(
      "zeigt den Link nicht, wenn alles richtig war oder der Wortspeicher aus ist",
      async () => {
        const user = userEvent.setup();
        await setup();
        await startText(user);
        await finishWith(user, text.text);
        expect(
          screen.queryByRole("link", {
            name: "Fehlerwörter im Wortspeicher üben",
          }),
        ).not.toBeInTheDocument();
      },
      VIER_DURCHGAENGE,
    );

    it(
      "blendet die Aktion aus, wenn der Wortspeicher nicht sichtbar ist",
      async () => {
        const user = userEvent.setup();
        await setup(undefined, { stages: "wortspeicher=aus" });
        await startText(user);
        await finishWith(user, "Im Garten");
        expect(
          screen.queryByRole("link", {
            name: "Fehlerwörter im Wortspeicher üben",
          }),
        ).not.toBeInTheDocument();
      },
      VIER_DURCHGAENGE,
    );
  });
});
