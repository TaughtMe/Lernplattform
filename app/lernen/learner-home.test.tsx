import "fake-indexeddb/auto";
import { cleanup, render, screen } from "@testing-library/react";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LearningEventV1 } from "../../src/domain/learning-bundle";
import {
  createLearningBoxCard,
  type LearningBoxCard,
} from "../../src/domain/learning-box";
import { learningWordId } from "../../src/domain/learning-word-progress";
import { PersonalLearningDatabase } from "../../src/storage/personal-learning-events";
import { LearnerHome } from "./learner-home";

// Die Startseite öffnet die Datenbank des persönlichen Bereichs mit dem
// Standardnamen; fake-indexeddb ersetzt IndexedDB für jeden Test neu.
const NOW = new Date(2026, 9, 19, 12, 0);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function dueCard(index: number): LearningBoxCard {
  return {
    ...createLearningBoxCard({
      deckId: "stapel",
      question: `Frage ${index}`,
      answer: `Antwort ${index}`,
      now: NOW.getTime() - 20 * DAY,
    }),
    interval: 3,
    box: 2,
    nextReview: NOW.getTime() - 2 * HOUR,
    lastReviewed: NOW.getTime() - 3 * DAY,
    reverseInterval: 3,
    reverseBox: 2,
    reverseNextReview: NOW.getTime() - 2 * HOUR,
  };
}

function event(
  objectId: string,
  occurredAt: Date,
  direction: LearningEventV1["direction"] = "prompt-to-answer",
): LearningEventV1 {
  return {
    id: `${objectId}-${occurredAt.getTime()}-${direction}`,
    learningObjectId: objectId,
    occurredAt: occurredAt.toISOString(),
    source: "learning-box",
    learningArea: "vocabulary",
    roundId: `runde-${objectId}`,
    direction,
    answerMode: "typed",
    help: "none",
    assessment: {
      knowledge: "correct",
      writing: "correct",
      selfCorrected: false,
    },
  };
}

async function seed(
  fill: (database: PersonalLearningDatabase) => Promise<void>,
) {
  const database = new PersonalLearningDatabase();
  await fill(database);
  database.close();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
});

afterEach(async () => {
  cleanup();
  vi.useRealTimers();
  await Dexie.delete(new PersonalLearningDatabase().name);
});

describe("LearnerHome", () => {
  it("zeigt die Tagesportion von 20 statt des gesamten Rückstands", async () => {
    // 150 fällige Karten (jeweils beide Richtungen) bilden den Rückstand.
    await seed(async (database) => {
      await database.learningBoxCards.bulkPut(
        Array.from({ length: 150 }, (_, index) => dueCard(index)),
      );
    });
    render(<LearnerHome />);

    expect(await screen.findByText("0 von 20 Aufgaben heute")).toBeVisible();
    expect(screen.getByText("heute dran")).toBeVisible();
    expect(screen.getByText("0 / 20")).toBeVisible();
    expect(
      screen.getByText("Noch 20 Aufgaben, dann ist der Tag voll."),
    ).toBeVisible();
    expect(screen.queryByText(/150|300/)).not.toBeInTheDocument();
    // „Weiterlernen“ startet die Portion im Modul des ersten offenen Elements.
    for (const link of screen.getAllByRole("link", { name: "Weiterlernen" })) {
      expect(link).toHaveAttribute("href", "/lernbox?heute=1");
    }
  });

  it("zählt erledigte Elemente, aber freies Üben lässt das Ziel nicht wachsen", async () => {
    await seed(async (database) => {
      await database.learningBoxCards.bulkPut(
        Array.from({ length: 150 }, (_, index) => dueCard(index)),
      );
    });
    const first = render(<LearnerHome />);
    expect(await screen.findByText("0 von 20 Aufgaben heute")).toBeVisible();
    first.unmount();

    // Vorgemerktes Element beantwortet, dazu viel freies Üben an anderem Stoff.
    const stored = await (async () => {
      const database = new PersonalLearningDatabase();
      const [plan] = await database.dailyPlans.toArray();
      database.close();
      return plan!;
    })();
    const planned = stored.items[0]!;
    await seed(async (database) => {
      await database.learningEvents.bulkPut([
        event(
          planned.objectIds[0]!,
          new Date(NOW.getTime() + 5 * 60_000),
          planned.direction === "reverse"
            ? "answer-to-prompt"
            : "prompt-to-answer",
        ),
        ...Array.from({ length: 40 }, (_, index) =>
          event(`frei-${index}`, new Date(NOW.getTime() + 10 * 60_000)),
        ),
      ]);
    });
    vi.setSystemTime(new Date(NOW.getTime() + HOUR));
    render(<LearnerHome />);

    expect(await screen.findByText("1 von 20 Aufgaben heute")).toBeVisible();
    expect(screen.getByText("1 / 20")).toBeVisible();
    expect(
      screen.getByText("Noch 19 Aufgaben, dann ist der Tag voll."),
    ).toBeVisible();
  });

  it("meldet das Tagesziel als geschafft, wenn alle Elemente erledigt sind", async () => {
    const word = "Fahrrad";
    await seed(async (database) => {
      await database.learningWordProgress.put({
        id: learningWordId(word),
        word,
        stage: 2,
        box: 3,
        dueAt: new Date(NOW.getTime() - DAY).toISOString(),
        attempts: 2,
        incorrectAttempts: 0,
        helpUses: 0,
        lastPracticedAt: new Date(NOW.getTime() - 3 * DAY).toISOString(),
      });
    });
    const first = render(<LearnerHome />);
    expect(await screen.findByText("0 von 1 Aufgabe heute")).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: "Weiterlernen" })[0],
    ).toHaveAttribute("href", "/frei/german/lernwoerter?heute=1");
    first.unmount();

    await seed(async (database) => {
      await database.learningEvents.put({
        ...event(learningWordId(word), new Date(NOW.getTime() + 60_000)),
        source: "learning-word",
        learningArea: "german",
      });
    });
    render(<LearnerHome />);
    expect(
      await screen.findByText(
        "Tagesziel geschafft – alles Weitere ist ein Extra",
      ),
    ).toBeVisible();
    expect(screen.getByText("Für heute ist alles geschafft.")).toBeVisible();
    // Ohne offenes Element gilt wieder die Empfehlung beziehungsweise „Üben“.
    expect(
      screen.getAllByRole("link", { name: "Weiterlernen" })[0],
    ).not.toHaveAttribute("href", expect.stringContaining("heute=1"));
  });

  it("führt bei einer Klassenaufgabe direkt zu deren Übungsseite", async () => {
    await seed(async (database) => {
      await database.learningEvents.put({
        ...event("klasse-wort", new Date(NOW.getTime() - HOUR)),
        source: "lesson",
        practice: { title: "Klassenaufgabe", route: "/klasse/7b/aufgaben" },
        assessment: {
          knowledge: "incorrect",
          writing: "incorrect",
          selfCorrected: false,
        },
      });
    });
    render(<LearnerHome />);
    expect(await screen.findByText("0 von 1 Aufgabe heute")).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: "Weiterlernen" })[0],
    ).toHaveAttribute("href", "/klasse/7b/aufgaben");
  });

  it("zeigt ohne Lernstand keine Portion und keinen Rückstand", async () => {
    render(<LearnerHome />);
    expect(
      await screen.findByText("Heute ist nichts dran – frei üben"),
    ).toBeVisible();
    expect(screen.getByText("Für heute ist alles geschafft.")).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: "Weiterlernen" })[0],
    ).toHaveAttribute("href", "/ueben");
  });

  it("stürzt nicht ab und zeigt keinen Rückstand, wenn der Lernstand nicht lädt", async () => {
    await seed(async (database) => {
      await database.learningEvents.put({ id: "kaputt" } as never);
    });
    render(<LearnerHome />);
    expect(
      await screen.findByText("Heute ist nichts dran – frei üben"),
    ).toBeVisible();
    expect(
      screen.queryByText(/von \d+ Aufgaben heute/),
    ).not.toBeInTheDocument();
  });
});
