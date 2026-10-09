import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PREPARE_TIMEOUT_MS,
  SPEAK_DELAY_MS,
  SPEECH_RATE,
  VOICE_WAIT_MS,
  hasVoiceFor,
  isSpeechAvailable,
  prepareSpeech,
  preloadVoices,
  resetSpeechState,
  speak,
  stopSpeaking,
} from "./speaker";

class FakeUtterance {
  text: string;
  lang = "";
  voice: unknown = null;
  rate = 1;
  volume = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

type FakeVoice = {
  name: string;
  lang: string;
  voiceURI: string;
  default: boolean;
};
const anna: FakeVoice = {
  name: "Anna (Premium)",
  lang: "de-DE",
  voiceURI: "anna",
  default: false,
};
const simple: FakeVoice = {
  name: "Anna",
  lang: "de-DE",
  voiceURI: "simple",
  default: true,
};

function installSynth(
  initial: FakeVoice[],
  options: { endsSpeaking?: boolean } = {},
) {
  const listeners = new Set<() => void>();
  const log: string[] = [];
  const spoken: FakeUtterance[] = [];
  const synth = {
    voices: initial,
    speaking: false,
    pending: false,
    getVoices: () => synth.voices,
    addEventListener: (_type: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) =>
      listeners.delete(listener),
    cancel: () => log.push("cancel"),
    speak: (utterance: FakeUtterance) => {
      log.push(`speak:${utterance.text.trim() || "(stumm)"}`);
      spoken.push(utterance);
      if (options.endsSpeaking !== false)
        setTimeout(() => utterance.onend?.(), 20);
    },
  };
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  return {
    synth,
    log,
    spoken,
    loadVoices(voices: FakeVoice[]) {
      synth.voices = voices;
      for (const listener of [...listeners]) listener();
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  resetSpeechState();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("isSpeechAvailable", () => {
  it("is false without speech synthesis and true with it", () => {
    expect(isSpeechAvailable()).toBe(false);
    installSynth([]);
    expect(isSpeechAvailable()).toBe(true);
  });
});

describe("preloadVoices", () => {
  it("returns a loaded list immediately", async () => {
    installSynth([anna]);
    await expect(preloadVoices()).resolves.toEqual([anna]);
    expect(hasVoiceFor("de-DE")).toBe(true);
    expect(hasVoiceFor("en-GB")).toBe(false);
  });

  it("returns an empty list without speech synthesis", async () => {
    await expect(preloadVoices()).resolves.toEqual([]);
  });

  it("waits for voiceschanged", async () => {
    const env = installSynth([]);
    const loaded = preloadVoices();
    env.loadVoices([anna]);
    await expect(loaded).resolves.toEqual([anna]);
  });

  it("asks again when voiceschanged never comes (Safari)", async () => {
    const env = installSynth([]);
    const loaded = preloadVoices();
    await vi.advanceTimersByTimeAsync(500);
    env.synth.voices = [anna];
    await vi.advanceTimersByTimeAsync(250);
    await expect(loaded).resolves.toEqual([anna]);
  });

  it("gives up with an empty list after the polls", async () => {
    installSynth([]);
    const loaded = preloadVoices();
    await vi.advanceTimersByTimeAsync(2000);
    await expect(loaded).resolves.toEqual([]);
    expect(hasVoiceFor("de-DE")).toBe(false);
  });

  it("shares one run between parallel calls", async () => {
    const env = installSynth([]);
    const first = preloadVoices();
    const second = preloadVoices();
    expect(second).toBe(first);
    env.loadVoices([anna]);
    await first;
  });
});

describe("speak", () => {
  it("sets the voice already on the first call (regression)", async () => {
    const env = installSynth([simple, anna]);
    const done = speak("Rad", "de");
    await vi.advanceTimersByTimeAsync(SPEAK_DELAY_MS);
    expect(env.spoken).toHaveLength(1);
    expect(env.spoken[0]).toMatchObject({
      text: "Rad",
      lang: "de-DE",
      voice: anna,
      rate: SPEECH_RATE,
    });
    await vi.advanceTimersByTimeAsync(50);
    await done;
  });

  it("calls cancel first and speaks only after 50 ms", async () => {
    const env = installSynth([anna]);
    void speak("Rad", "de-DE");
    await vi.advanceTimersByTimeAsync(SPEAK_DELAY_MS - 1);
    expect(env.log).toEqual(["cancel"]);
    await vi.advanceTimersByTimeAsync(1);
    expect(env.log).toEqual(["cancel", "speak:Rad"]);
  });

  it("waits at most 300 ms for an empty list and then speaks with the language only", async () => {
    const env = installSynth([]);
    void speak("Rad", "de-DE");
    await vi.advanceTimersByTimeAsync(VOICE_WAIT_MS);
    expect(env.spoken).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(SPEAK_DELAY_MS);
    expect(env.spoken).toHaveLength(1);
    expect(env.spoken[0]).toMatchObject({ lang: "de-DE", voice: null });
  });

  it("uses a voice that arrives while waiting", async () => {
    const env = installSynth([]);
    void speak("Rad", "de-DE");
    await vi.advanceTimersByTimeAsync(100);
    env.loadVoices([anna]);
    await vi.advanceTimersByTimeAsync(SPEAK_DELAY_MS + 10);
    expect(env.spoken[0]).toMatchObject({ voice: anna });
  });

  it("honours a saved voice and a custom rate", async () => {
    const env = installSynth([anna, simple]);
    void speak("Rad", "de-DE", { voiceURI: "simple", rate: 0.7 });
    await vi.advanceTimersByTimeAsync(SPEAK_DELAY_MS);
    expect(env.spoken[0]).toMatchObject({ voice: simple, rate: 0.7 });
  });

  it("only speaks the newest request when two come quickly", async () => {
    const env = installSynth([anna]);
    void speak("eins", "de-DE");
    void speak("zwei", "de-DE");
    await vi.advanceTimersByTimeAsync(SPEAK_DELAY_MS * 2);
    expect(env.spoken.map((u) => u.text)).toEqual(["zwei"]);
  });

  it("resolves when the browser reports an error", async () => {
    const env = installSynth([anna], { endsSpeaking: false });
    const done = speak("Rad", "de-DE");
    await vi.advanceTimersByTimeAsync(SPEAK_DELAY_MS);
    env.spoken[0]!.onerror?.();
    await expect(done).resolves.toBeUndefined();
  });

  it("resolves after the safety limit when no end event comes", async () => {
    installSynth([anna], { endsSpeaking: false });
    const done = speak("Rad", "de-DE");
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(done).resolves.toBeUndefined();
  });

  it("does nothing without speech synthesis", async () => {
    await expect(speak("Rad", "de-DE")).resolves.toBeUndefined();
  });

  it("stopSpeaking cancels and drops a pending request", async () => {
    const env = installSynth([anna]);
    void speak("Rad", "de-DE");
    await vi.advanceTimersByTimeAsync(10);
    stopSpeaking();
    await vi.advanceTimersByTimeAsync(SPEAK_DELAY_MS * 2);
    expect(env.spoken).toHaveLength(0);
    expect(
      env.log.filter((entry) => entry === "cancel").length,
    ).toBeGreaterThanOrEqual(2);
  });
});

describe("prepareSpeech", () => {
  it("is unavailable without speech synthesis", async () => {
    await expect(prepareSpeech("de-DE")).resolves.toBe("unavailable");
  });

  it("warms up with a silent utterance (volume 0) and the chosen voice before any word", async () => {
    const env = installSynth([simple, anna]);
    const ready = prepareSpeech("de-DE");
    await vi.advanceTimersByTimeAsync(30);
    await expect(ready).resolves.toBe("ready");
    expect(env.spoken).toHaveLength(1);
    expect(env.spoken[0]).toMatchObject({
      text: " ",
      volume: 0,
      voice: anna,
      lang: "de-DE",
    });
    // Danach hat das erste Wort die Stimme schon.
    void speak("Rad", "de-DE");
    await vi.advanceTimersByTimeAsync(SPEAK_DELAY_MS);
    expect(env.spoken[1]).toMatchObject({ text: "Rad", voice: anna });
  });

  it("starts the warm-up synchronously when the voice is already known", () => {
    const env = installSynth([anna]);
    void prepareSpeech("de-DE");
    expect(env.log).toEqual(["speak:(stumm)"]);
  });

  it("waits for voiceschanged", async () => {
    const env = installSynth([]);
    const ready = prepareSpeech("de-DE");
    await vi.advanceTimersByTimeAsync(500);
    env.loadVoices([anna]);
    await vi.advanceTimersByTimeAsync(150);
    await expect(ready).resolves.toBe("ready");
  });

  it("asks again when the event never comes", async () => {
    const env = installSynth([]);
    const ready = prepareSpeech("de-DE");
    await vi.advanceTimersByTimeAsync(1000);
    env.synth.voices = [anna];
    await vi.advanceTimersByTimeAsync(250);
    await expect(ready).resolves.toBe("ready");
  });

  it("returns no-voice after the time limit", async () => {
    const env = installSynth([
      { name: "Samantha", lang: "en-US", voiceURI: "s", default: true },
    ]);
    const ready = prepareSpeech("de-DE");
    await vi.advanceTimersByTimeAsync(PREPARE_TIMEOUT_MS + 100);
    await expect(ready).resolves.toBe("no-voice");
    expect(env.spoken).toHaveLength(0);
  });

  it("does not hang when the silent utterance never ends", async () => {
    installSynth([anna], { endsSpeaking: false });
    const ready = prepareSpeech("de-DE", { warmupMs: 1500 });
    await vi.advanceTimersByTimeAsync(1600);
    await expect(ready).resolves.toBe("ready");
  });

  it("cancels a running output before warming up", async () => {
    const env = installSynth([anna]);
    env.synth.speaking = true;
    const ready = prepareSpeech("de-DE");
    await vi.advanceTimersByTimeAsync(SPEAK_DELAY_MS + 30);
    await expect(ready).resolves.toBe("ready");
    expect(env.log.slice(0, 2)).toEqual(["cancel", "speak:(stumm)"]);
  });

  it("honours custom time limits", async () => {
    installSynth([]);
    const ready = prepareSpeech("de-DE", { timeoutMs: 500 });
    await vi.advanceTimersByTimeAsync(600);
    await expect(ready).resolves.toBe("no-voice");
  });
});
