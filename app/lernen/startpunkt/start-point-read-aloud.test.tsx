import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSpellingStartPoint } from "../../../src/domain/start-point";

const speaker = vi.hoisted(() => ({
  NO_SPEECH_MESSAGE: "Dieses Gerät kann nicht vorlesen.",
  hasLocalVoiceFor: vi.fn<(lang: string) => boolean>(),
  preloadVoices: vi.fn<() => Promise<unknown[]>>(),
  prepareSpeech: vi.fn<(lang: string) => Promise<string>>(),
  speak: vi.fn<(text: string, lang: string) => Promise<string>>(),
  stopSpeaking: vi.fn<() => void>(),
}));
vi.mock("../../../src/speech/speaker", () => speaker);

import { StartPointApp } from "./start-point-app";

function repository() {
  return {
    recordSpelling: vi.fn().mockResolvedValue(false),
    recordMath: vi.fn().mockResolvedValue(false),
  };
}

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

describe("Startpunkt: Vorlesen", () => {
  it.each(["ready", "no-voice"] as const)(
    "Rechtschreibung (%s): liest nur die Anleitung, nie das Wort",
    async (readiness) => {
      speaker.prepareSpeech.mockResolvedValue(readiness);
      const user = userEvent.setup();
      render(<StartPointApp repository={repository()} />);
      await user.click(
        screen.getAllByRole("button", { name: "Startpunkt suchen" })[0]!,
      );
      await user.click(
        await screen.findByRole("button", { name: "Aufgabe vorlesen" }),
      );
      const spoken = speaker.speak.mock.calls
        .map(([text]) => text.toLowerCase())
        .join(" ");
      expect(spoken).toMatch(/schreibe/);
      expect(spoken).not.toContain("_");
      for (const task of buildSpellingStartPoint()) {
        expect(spoken).not.toContain(task.payload.word.toLowerCase());
      }
    },
  );

  it("Kopfrechnen: liest Anleitung und Aufgabe, aber kein Ergebnis", async () => {
    const user = userEvent.setup();
    render(<StartPointApp repository={repository()} random={() => 0.5} />);
    await user.click(
      screen.getAllByRole("button", { name: "Startpunkt suchen" })[1]!,
    );
    await user.click(
      await screen.findByRole("button", { name: "Aufgabe vorlesen" }),
    );
    const [text] = speaker.speak.mock.calls[0]!;
    expect(text).toMatch(
      /^Rechne im Kopf und schreibe das Ergebnis auf\. \d+ (plus|minus|mal|geteilt durch) \d+$/,
    );
  });
});
