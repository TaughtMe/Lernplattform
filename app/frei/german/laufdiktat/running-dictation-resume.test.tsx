import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseRoundSnapshot } from "../../../../src/domain/round-snapshot";
import { runningDictationSnapshotSchema } from "../../../../src/domain/running-dictation-snapshot";
import { ROUND_SNAPSHOT_KEYS } from "../../../../src/storage/round-snapshot";
import { RoundGuardProvider } from "../../../ui/round-guard";
import { StudentFrame } from "../../../views/shell/student-frame";
import { RunningDictationApp } from "./running-dictation-app";

const { ingestBundle } = vi.hoisted(() => ({ ingestBundle: vi.fn() }));

vi.mock("../../../../src/storage/personal-learning-events", () => ({
  createLearningBoxRepository: () => ({ ingestBundle }),
}));

beforeEach(() => {
  ingestBundle
    .mockReset()
    .mockResolvedValue({ deckId: "stapel", added: 1, reused: 0 });
  window.history.pushState(null, "", "/frei/german/laufdiktat");
});

afterEach(() => localStorage.clear());

type User = ReturnType<typeof userEvent.setup>;

const SENTENCES = [
  "Eins.",
  "Zwei.",
  "Drei.",
  "Vier.",
  "Fünf.",
  "Sechs.",
  "Sieben.",
  "Acht.",
  "Neun.",
  "Zehn.",
];
const PAIRS: Record<string, string> = {
  library: "Bibliothek",
  classroom: "Klassenzimmer",
  school: "Schule",
  house: "Haus",
};
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
        <RunningDictationApp />
      </StudentFrame>
    </RoundGuardProvider>,
  );
}

async function startRound(user: User, source: string, vocabulary = false) {
  await screen.findByRole("heading", { name: "Laufdiktat" });
  if (vocabulary) {
    await user.click(screen.getByRole("button", { name: "Vokabeln" }));
  }
  const field = screen.getByRole("textbox");
  await user.clear(field);
  await user.click(field);
  await user.paste(source);
  const start = screen.getByRole("button", { name: "Laufdiktat starten" });
  await waitFor(() => expect(start).toBeEnabled());
  await user.click(start);
}

const shown = () => screen.getByRole("heading", { level: 1 }).textContent!;

/** Sieht die Aufgabe an und tippt `answer` oder, ohne Angabe, den Text selbst. */
async function attempt(user: User, answer?: (shown: string) => string) {
  const prompt = shown();
  await user.click(
    screen.getByRole("button", { name: "Verstanden – jetzt schreiben" }),
  );
  await user.type(
    screen.getByLabelText("Deine Antwort"),
    answer ? answer(prompt) : prompt,
  );
  await user.click(screen.getByRole("button", { name: "Prüfen" }));
}

/** Löst `count` Aufgaben richtig und geht jeweils weiter. */
async function solve(user: User, count: number) {
  for (let step = 0; step < count; step += 1) {
    await attempt(user);
    await user.click(
      screen.getByRole("button", { name: /Nächste Aufgabe|Runde abschließen/ }),
    );
  }
}

function savedSnapshot() {
  return parseRoundSnapshot(
    localStorage.getItem(ROUND_SNAPSHOT_KEYS.laufdiktat),
    {
      module: "laufdiktat",
      now: new Date(),
      state: runningDictationSnapshotSchema,
    },
  );
}

describe("Laufdiktat: Runde fortsetzen (C-001)", { timeout: 20_000 }, () => {
  it("bietet nach drei Aufgaben und Neuladen „Weitermachen (3 von 10)“ an und setzt dort fort", async () => {
    const user = userEvent.setup();
    const first = mount();
    await startRound(user, SENTENCES.join(" "));
    await solve(user, 3);
    expect(screen.getByText("4 / 10")).toBeVisible();
    await waitFor(() => expect(savedSnapshot()?.done).toBe(3));

    first.unmount();
    mount();
    await user.click(
      await screen.findByRole("button", { name: "Weitermachen (3 von 10)" }),
    );
    // Die vierte Aufgabe, nicht wieder die erste.
    expect(screen.getByText("4 / 10")).toBeVisible();
    expect(shown()).toBe("Vier.");

    await solve(user, 7);
    expect(await screen.findByText("Geschafft!", {}, SLOW)).toBeVisible();
    expect(document.body).toHaveTextContent(/10\s*Aufgaben/);
    expect(localStorage.getItem(ROUND_SNAPSHOT_KEYS.laufdiktat)).toBeNull();
  });

  it("behält die Fehlversuche: Die Vokabel kommt am Ende in die LernBox", async () => {
    const user = userEvent.setup();
    const first = mount();
    await startRound(
      user,
      Object.entries(PAIRS)
        .map(([front, back]) => `${front};${back}`)
        .join("\n"),
      true,
    );
    await solveVocabulary(user, 1);
    // Die zweite Aufgabe zuerst falsch beantworten, dann neu laden.
    await attempt(user, () => "falsch");
    await user.click(
      screen.getByRole("button", { name: "Noch einmal versuchen" }),
    );
    await waitFor(() => expect(savedSnapshot()?.state.index).toBe(1));
    const failed = savedSnapshot()!.state.items[1]!;

    first.unmount();
    mount();
    await user.click(
      await screen.findByRole("button", { name: "Weitermachen (1 von 4)" }),
    );
    expect(screen.getByText("2 / 4")).toBeVisible();
    await attempt(user, (prompt) => PAIRS[prompt]!);
    await user.click(screen.getByRole("button", { name: "Nächste Aufgabe" }));
    await solveVocabulary(user, 2);

    expect(await screen.findByText("Geschafft!", {}, SLOW)).toBeVisible();
    expect(document.body).toHaveTextContent(/1\s*Fehlversuche/);
    // Nur die Vokabel mit dem Fehlversuch geht in die LernBox.
    await waitFor(() => expect(ingestBundle).toHaveBeenCalledTimes(1));
    const bundle = ingestBundle.mock.calls[0]![0].bundle;
    expect(bundle.vocabulary).toHaveLength(1);
    expect(bundle.vocabulary[0].id).toBe(failed.id);
  });

  it("fragt bei einem Tipp auf die Leiste, das Logo und „Runde beenden“ nach", async () => {
    const user = userEvent.setup();
    mount();
    await startRound(user, SENTENCES.join(" "));
    await solve(user, 3);

    await user.click(screen.getByRole("link", { name: "Üben" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Runde wirklich beenden?");
    expect(screen.getByRole("button", { name: "Weiterüben" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Weiterüben" }));
    expect(window.location.pathname).toBe("/frei/german/laufdiktat");
    expect(screen.getByText("4 / 10")).toBeVisible();

    await user.click(screen.getByRole("link", { name: "Zur Startseite" }));
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: "Weiterüben" }));

    await user.click(screen.getByRole("button", { name: "Runde beenden" }));
    await user.click(await screen.findByRole("button", { name: "Beenden" }));
    expect(
      await screen.findByRole("heading", { name: "Laufdiktat" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Weitermachen (3 von 10)" }),
    ).toBeVisible();
  });

  it("verwirft den Zwischenstand bei „Neu anfangen“", async () => {
    const user = userEvent.setup();
    const first = mount();
    await startRound(user, SENTENCES.join(" "));
    await solve(user, 2);
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
    expect(localStorage.getItem(ROUND_SNAPSHOT_KEYS.laufdiktat)).toBeNull();
  });

  it("bietet bei einem kaputten Zwischenstand nichts an", async () => {
    localStorage.setItem(ROUND_SNAPSHOT_KEYS.laufdiktat, "[]");
    mount();
    await screen.findByRole("heading", { name: "Laufdiktat" });
    expect(screen.queryByRole("button", { name: /Weitermachen/ })).toBeNull();
  });
});

/** Löst die nächsten Vokabeln richtig. */
async function solveVocabulary(user: User, count: number) {
  for (let step = 0; step < count; step += 1) {
    await attempt(user, (prompt) => PAIRS[prompt]!);
    await user.click(
      screen.getByRole("button", { name: /Nächste Aufgabe|Runde abschließen/ }),
    );
  }
}
