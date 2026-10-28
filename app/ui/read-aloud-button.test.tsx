import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const speaker = vi.hoisted(() => ({
  hasLocalVoiceFor: vi.fn<(lang: string) => boolean>(),
  preloadVoices: vi.fn<() => Promise<unknown[]>>(),
  speak:
    vi.fn<(text: string, lang: string, options?: object) => Promise<void>>(),
  stopSpeaking: vi.fn<() => void>(),
}));
vi.mock("../../src/speech/speaker", () => speaker);

import { ReadAloudButton } from "./read-aloud-button";

const voiceListeners = new Set<() => void>();

beforeEach(() => {
  voiceListeners.clear();
  speaker.hasLocalVoiceFor.mockReturnValue(true);
  speaker.preloadVoices.mockResolvedValue([]);
  speaker.speak.mockResolvedValue(undefined);
  vi.stubGlobal("speechSynthesis", {
    addEventListener: (_type: string, listener: () => void) =>
      voiceListeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) =>
      voiceListeners.delete(listener),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("ReadAloudButton", () => {
  it("bleibt ohne lokale Stimme ausgeblendet", async () => {
    speaker.hasLocalVoiceFor.mockReturnValue(false);
    const { container } = render(<ReadAloudButton text="So geht es." />);
    await act(async () => {});
    expect(container).toBeEmptyDOMElement();
    expect(speaker.hasLocalVoiceFor).toHaveBeenCalledWith("de-DE");
  });

  it("erscheint, sobald eine lokale Stimme geladen ist", async () => {
    speaker.hasLocalVoiceFor.mockReturnValue(false);
    render(<ReadAloudButton text="So geht es." />);
    await act(async () => {});
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    speaker.hasLocalVoiceFor.mockReturnValue(true);
    act(() => voiceListeners.forEach((listener) => listener()));
    expect(
      screen.getByRole("button", { name: "Anleitung vorlesen" }),
    ).toBeVisible();
  });

  it("liest den Text mit einer lokalen Stimme vor und zeigt währenddessen „Stopp“", async () => {
    let finish: () => void = () => {};
    speaker.speak.mockReturnValue(
      new Promise<void>((resolve) => (finish = resolve)),
    );
    const user = userEvent.setup();
    render(<ReadAloudButton text="Schreibe das Wort ab." />);
    await user.click(
      await screen.findByRole("button", { name: "Anleitung vorlesen" }),
    );
    expect(speaker.speak).toHaveBeenCalledWith(
      "Schreibe das Wort ab.",
      "de-DE",
      { localOnly: true },
    );
    expect(
      screen.getByRole("button", { name: "Stopp, Vorlesen beenden" }),
    ).toHaveTextContent("Stopp");
    await act(async () => finish());
    expect(
      screen.getByRole("button", { name: "Anleitung vorlesen" }),
    ).toHaveTextContent("Vorlesen");
  });

  it("beendet das Vorlesen beim zweiten Klick", async () => {
    speaker.speak.mockReturnValue(new Promise<void>(() => {}));
    const user = userEvent.setup();
    render(<ReadAloudButton text="So geht es." label="Hinweis vorlesen" />);
    await user.click(
      await screen.findByRole("button", { name: "Hinweis vorlesen" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Stopp, Vorlesen beenden" }),
    );
    expect(speaker.stopSpeaking).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Hinweis vorlesen" }),
    ).toBeVisible();
  });

  it("verstummt, wenn die Seite während des Vorlesens verlassen wird", async () => {
    speaker.speak.mockReturnValue(new Promise<void>(() => {}));
    const user = userEvent.setup();
    const { unmount } = render(<ReadAloudButton text="So geht es." />);
    await user.click(await screen.findByRole("button", { name: /vorlesen/i }));
    unmount();
    expect(speaker.stopSpeaking).toHaveBeenCalledTimes(1);
  });

  it("greift nicht in fremdes Sprechen ein, wenn er selbst nichts sagt", async () => {
    const { unmount } = render(<ReadAloudButton text="So geht es." />);
    await screen.findByRole("button", { name: /vorlesen/i });
    unmount();
    expect(speaker.stopSpeaking).not.toHaveBeenCalled();
  });
});
