import type { Page } from "@playwright/test";

export type FakeVoiceKind = "local" | "network" | "none";
export type SpokenUtterance = { text: string; lang: string; voice: string };

/**
 * Ersetzt die Sprachausgabe des Browsers: eine deutsche Stimme auf dem Gerät
 * („local“), nur eine deutsche Netzstimme („network“) oder keine Stimme.
 * Gesprochenes landet in `window.__spoken`.
 */
export async function fakeSpeech(page: Page, kind: FakeVoiceKind) {
  await page.addInitScript((voiceKind: FakeVoiceKind) => {
    const voices =
      voiceKind === "none"
        ? []
        : [
            {
              name: voiceKind === "local" ? "Anna" : "Google Deutsch",
              lang: "de-DE",
              voiceURI: voiceKind,
              default: true,
              localService: voiceKind === "local",
            },
          ];
    const spoken: { text: string; lang: string; voice: string }[] = [];
    (window as unknown as { __spoken: typeof spoken }).__spoken = spoken;
    class FakeUtterance {
      text: string;
      lang = "";
      voice: { voiceURI: string } | null = null;
      rate = 1;
      volume = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: FakeUtterance,
      configurable: true,
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        speaking: false,
        pending: false,
        getVoices: () => voices,
        addEventListener() {},
        removeEventListener() {},
        cancel() {},
        speak(utterance: FakeUtterance) {
          if (utterance.volume > 0 && utterance.text.trim()) {
            spoken.push({
              text: utterance.text,
              lang: utterance.lang,
              voice: utterance.voice?.voiceURI ?? "",
            });
          }
          setTimeout(() => utterance.onend?.(), 5);
        },
      },
    });
  }, kind);
}

export function spokenUtterances(page: Page) {
  return page.evaluate(
    () => (window as unknown as { __spoken: SpokenUtterance[] }).__spoken ?? [],
  );
}
