import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Anbindung des Sprachmodells in speaker.ts (docs/umsetzungsplan-sprachmodell.md, 3.4). */
const model = vi.hoisted(() => ({
  available: false,
  isModelAvailable: vi.fn(() => model.available),
  loadModelManifest: vi.fn(async () => (model.available ? {} : null)),
  prepareModel: vi.fn(async () => true),
  preloadModel: vi.fn(async () => true),
  speakWithModel: vi.fn(async () => true),
  stopModel: vi.fn(),
  installed: true,
  languageStatus: vi.fn(async () =>
    model.installed ? "installed" : "missing",
  ),
  installLanguage: vi.fn(async () => true),
}));
vi.mock("./model/model-speaker", () => model);
const player = vi.hoisted(() => ({ unlockAudio: vi.fn() }));
vi.mock("./model/player", () => player);

import {
  hasLocalVoiceFor,
  hasVoiceFor,
  prepareSpeech,
  resetSpeechState,
  speak,
  stopSpeaking,
} from "./speaker";

type Voice = {
  name: string;
  lang: string;
  voiceURI: string;
  localService: boolean;
};
let voices: Voice[];
let spoken: { text: string; voice: Voice | null }[];

beforeEach(() => {
  vi.useFakeTimers();
  resetSpeechState();
  model.available = false;
  model.installed = true;
  voices = [];
  spoken = [];
  class Utterance {
    text: string;
    voice: Voice | null = null;
    lang = "";
    rate = 1;
    volume = 1;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
  vi.stubGlobal("speechSynthesis", {
    speaking: false,
    pending: false,
    getVoices: () => voices,
    addEventListener() {},
    removeEventListener() {},
    cancel: vi.fn(),
    speak: (utterance: Utterance) => {
      spoken.push({ text: utterance.text, voice: utterance.voice });
      setTimeout(() => utterance.onend?.(), 1);
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const network: Voice = {
  name: "Google Deutsch",
  lang: "de-DE",
  voiceURI: "g",
  localService: false,
};
const local: Voice = {
  name: "Anna",
  lang: "de-DE",
  voiceURI: "a",
  localService: true,
};

async function run<T>(promise: Promise<T>) {
  await vi.runAllTimersAsync();
  return promise;
}

describe("Sprachmodell in der Vorschau", () => {
  it("spricht mit dem Modell, wenn es eins für die Sprache gibt", async () => {
    model.available = true;
    voices = [network];
    await run(speak("Rad", "de-DE", { model: true }));
    expect(model.speakWithModel).toHaveBeenCalledWith("Rad", "de-DE", {
      speed: 0.9,
    });
    expect(spoken).toEqual([]);
  });

  it("fällt bei Modellfehler nur auf eine lokale Stimme zurück, nie auf eine Netzwerkstimme", async () => {
    model.available = true;
    model.speakWithModel.mockResolvedValueOnce(false);
    voices = [network];
    await run(speak("Rad", "de-DE", { model: true }));
    expect(spoken).toEqual([]);

    model.speakWithModel.mockResolvedValueOnce(false);
    voices = [network, local];
    await run(speak("Rad", "de-DE", { model: true }));
    expect(spoken.map((entry) => entry.voice?.voiceURI)).toEqual(["a"]);
  });

  it("bleibt ohne Modell für die Sprache wie vor dem Plan", async () => {
    voices = [network];
    await run(speak("Rad", "de-DE", { model: true }));
    expect(model.speakWithModel).not.toHaveBeenCalled();
    expect(spoken.map((entry) => entry.voice?.voiceURI)).toEqual(["g"]);
    expect(hasVoiceFor("de-DE", { model: true })).toBe(true);
    expect(hasLocalVoiceFor("de-DE", { model: true })).toBe(false);
  });

  it("zählt das Modell als Stimme, die auf dem Gerät läuft", () => {
    model.available = true;
    expect(hasVoiceFor("de-DE", { model: true })).toBe(true);
    expect(hasLocalVoiceFor("de-DE", { model: true })).toBe(true);
    expect(hasLocalVoiceFor("de-DE")).toBe(false);
  });

  it("gibt den Ton in der Geste frei und meldet bereit, wenn das Modell lädt", async () => {
    model.available = true;
    const pending = prepareSpeech("de-DE", { model: true });
    expect(player.unlockAudio).toHaveBeenCalledTimes(1);
    expect(await run(pending)).toBe("ready");
    expect(model.prepareModel).toHaveBeenCalledWith("de-DE");
  });

  it("meldet ohne Modell und ohne lokale Stimme keine Stimme", async () => {
    model.available = true;
    model.prepareModel.mockResolvedValueOnce(false);
    voices = [network];
    expect(await run(prepareSpeech("de-DE", { model: true }))).toBe("no-voice");
  });

  it("stoppt auch das Modell", () => {
    stopSpeaking();
    expect(model.stopModel).toHaveBeenCalled();
  });
});

describe("Ton-Freigabe in der Geste", () => {
  it("gibt den Ton frei, bevor speak auf das Manifest wartet", () => {
    model.available = true;
    void speak("Rad", "de-DE", { model: true });
    expect(player.unlockAudio).toHaveBeenCalledTimes(1);
  });
});

describe("Sprache noch nicht installiert", () => {
  it("liest mit der Gerätestimme und installiert im Hintergrund", async () => {
    model.available = true;
    model.installed = false;
    voices = [network];
    await run(speak("Rad", "de-DE", { model: true }));
    expect(model.installLanguage).toHaveBeenCalledWith("de-DE");
    expect(model.speakWithModel).not.toHaveBeenCalled();
    expect(spoken.map((entry) => entry.text)).toEqual(["Rad"]);
  });

  it("wartet ohne Gerätestimme auf das Modell", async () => {
    model.available = true;
    model.installed = false;
    await run(speak("Rad", "de-DE", { model: true }));
    expect(model.installLanguage).toHaveBeenCalled();
    expect(model.speakWithModel).toHaveBeenCalled();
  });

  it("nimmt mit localOnly keine Netzwerkstimme, sondern wartet auf das Modell", async () => {
    model.available = true;
    model.installed = false;
    voices = [network];
    await run(speak("Rad", "de-DE", { model: true, localOnly: true }));
    expect(spoken).toEqual([]);
    expect(model.speakWithModel).toHaveBeenCalled();
  });
});
