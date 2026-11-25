import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LearningWordStage } from "../../../src/domain/learning-word";

const speaker = vi.hoisted(() => ({
  hasLocalVoiceFor: vi.fn<(lang: string) => boolean>(),
  preloadVoices: vi.fn<() => Promise<unknown[]>>(),
  speak: vi.fn<(text: string, lang: string) => Promise<string>>(),
  stopSpeaking: vi.fn<() => void>(),
}));
vi.mock("../../../src/speech/speaker", () => speaker);

import { RECALL_INSTRUCTIONS, RoundScreen } from "./round-screen";

const WORD = "Fahrrad";

beforeEach(() => {
  // Geprüft wird der Weg über die Gerätestimme: Lernraum-Stimme auf diesem
  // Gerät aus (Einstellungen „Vorlesen“, Entscheidung 82).
  window.localStorage.setItem("lernraum:vorlesen-modell", "0");
  speaker.hasLocalVoiceFor.mockReturnValue(true);
  speaker.preloadVoices.mockResolvedValue([]);
  speaker.speak.mockResolvedValue("spoken");
});

afterEach(() => {
  window.localStorage.removeItem("lernraum:vorlesen-modell");
  cleanup();
  vi.clearAllMocks();
});

function renderRound(
  stage: LearningWordStage,
  phase: "memorize" | "recall",
  block: readonly string[] = [WORD],
) {
  return render(
    <RoundScreen
      title="Wortbox"
      stage={stage}
      index={0}
      total={3}
      phase={phase}
      block={block}
      usedHelp={false}
      onBack={() => {}}
      onFinishMemorize={() => {}}
      onHelp={() => {}}
      onSubmit={() => {}}
      onRetry={() => {}}
    />,
  );
}

/** Alles, was vorgelesen wurde, als ein Text in Kleinbuchstaben. */
function spokenText() {
  return speaker.speak.mock.calls
    .map(([text]) => text)
    .join(" ")
    .toLowerCase();
}

describe("Wortspeicher: Vorlesen verrät das Wort nie", () => {
  it.each([1, 2, 3, 4, 5, 6] as const)(
    "Stufe %i: liest beim Schreiben nur die Anleitung",
    async (stage) => {
      const user = userEvent.setup();
      renderRound(stage, "recall", stage === 5 ? [WORD, "Sonne"] : [WORD]);
      await user.click(
        await screen.findByRole("button", { name: "Aufgabe vorlesen" }),
      );
      expect(speaker.speak).toHaveBeenCalledWith(
        RECALL_INSTRUCTIONS[stage],
        "de-DE",
      );
      expect(spokenText()).not.toContain(WORD.toLowerCase());
      expect(spokenText()).not.toContain("sonne");
      expect(spokenText()).not.toContain("_");
    },
  );

  it.each([4, 5] as const)(
    "Stufe %i: liest beim Merken nur die Anleitung",
    async (stage) => {
      const user = userEvent.setup();
      renderRound(stage, "memorize", stage === 5 ? [WORD, "Sonne"] : [WORD]);
      await user.click(
        await screen.findByRole("button", { name: "Anleitung vorlesen" }),
      );
      expect(speaker.speak).toHaveBeenCalledOnce();
      expect(spokenText()).not.toContain(WORD.toLowerCase());
      expect(spokenText()).not.toContain("sonne");
    },
  );

  it("zeigt ohne lokale Stimme keinen Knopf", async () => {
    speaker.hasLocalVoiceFor.mockReturnValue(false);
    renderRound(2, "recall");
    await act(async () => {});
    expect(
      screen.queryByRole("button", { name: "Aufgabe vorlesen" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(RECALL_INSTRUCTIONS[2])).toBeVisible();
  });
});
