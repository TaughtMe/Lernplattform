import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PREPARE_TIMEOUT_MS,
  SPEAK_DELAY_MS,
  SPEECH_NOTICE_EVENT,
  SPEECH_RATE,
  hasLocalVoiceFor,
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
  localService?: boolean;
};
// Echte Browser melden `localService`; Lernraum nutzt nur lokale Stimmen.
const anna: FakeVoice = {
  name: "Anna (Premium)",
  lang: "de-DE",
  voiceURI: "anna",
  default: false,
  localService: true,
};
const simple: FakeVoice = {
  name: "Anna",
  lang: "de-DE",
  voiceURI: "simple",
  default: true,
  localService: true,
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

  // Früher sprach `speak` nach 300 ms ohne Stimme, nur mit der Sprache. Dann
  // wählt der Browser selbst, womöglich eine Netzstimme; das verbietet B-012.
  it("does not speak without a known local voice, even when the list stays empty", async () => {
    const env = installSynth([]);
    const done = speak("Rad", "de-DE");
    await vi.advanceTimersByTimeAsync(3000);
    await expect(done).resolves.toBe("no-voice");
    expect(env.spoken).toHaveLength(0);
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
    await expect(done).resolves.toBe("spoken");
  });

  it("resolves after the safety limit when no end event comes", async () => {
    installSynth([anna], { endsSpeaking: false });
    const done = speak("Rad", "de-DE");
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(done).resolves.toBe("spoken");
  });

  it("does nothing without speech synthesis", async () => {
    await expect(speak("Rad", "de-DE")).resolves.toBe("unavailable");
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

describe("local voices only (B-012)", () => {
  const cloud: FakeVoice = {
    name: "Google Deutsch",
    lang: "de-DE",
    voiceURI: "cloud",
    default: false,
    localService: false,
  };
  const onDevice: FakeVoice = {
    name: "Anna",
    lang: "de-DE",
    voiceURI: "local",
    default: false,
    localService: true,
  };

  it("hasLocalVoiceFor ignores network voices", async () => {
    installSynth([cloud]);
    await preloadVoices();
    expect(hasLocalVoiceFor("de-DE")).toBe(false);
  });

  it("hasLocalVoiceFor finds a voice that runs on the device", async () => {
    installSynth([cloud, onDevice]);
    await preloadVoices();
    expect(hasLocalVoiceFor("de-DE")).toBe(true);
    expect(hasLocalVoiceFor("en-GB")).toBe(false);
  });

  it("speaks with the local voice even if a network voice ranks higher", async () => {
    const env = installSynth([cloud, onDevice]);
    const done = speak("Rad", "de-DE");
    await vi.advanceTimersByTimeAsync(SPEAK_DELAY_MS);
    expect(env.spoken).toHaveLength(1);
    expect(env.spoken[0]).toMatchObject({ voice: onDevice });
    await vi.advanceTimersByTimeAsync(50);
    await done;
  });

  it("stays silent instead of falling back to a network voice and says why", async () => {
    const env = installSynth([cloud]);
    const notices: string[] = [];
    const listener = (event: Event) =>
      notices.push((event as CustomEvent<{ message: string }>).detail.message);
    window.addEventListener(SPEECH_NOTICE_EVENT, listener);
    await expect(speak("Rad", "de-DE")).resolves.toBe("no-voice");
    await vi.advanceTimersByTimeAsync(SPEAK_DELAY_MS);
    window.removeEventListener(SPEECH_NOTICE_EVENT, listener);
    expect(env.spoken).toHaveLength(0);
    expect(env.log).toEqual([]);
    expect(notices).toEqual([
      "Auf diesem Gerät ist keine deutsche Stimme installiert.",
    ]);
  });

  it("names the language in the notice and can leave it out", async () => {
    installSynth([onDevice]);
    const notices: string[] = [];
    const listener = (event: Event) =>
      notices.push((event as CustomEvent<{ message: string }>).detail.message);
    window.addEventListener(SPEECH_NOTICE_EVENT, listener);
    await expect(speak("cat", "en-GB")).resolves.toBe("no-voice");
    await expect(speak("cat", "en-GB", { silentNotice: true })).resolves.toBe(
      "no-voice",
    );
    window.removeEventListener(SPEECH_NOTICE_EVENT, listener);
    expect(notices).toEqual([
      "Auf diesem Gerät ist keine englische Stimme installiert.",
    ]);
  });

  it("ignores a saved network voice and uses the local one", async () => {
    const env = installSynth([cloud, onDevice]);
    void speak("Rad", "de-DE", { voiceURI: "cloud" });
    await vi.advanceTimersByTimeAsync(SPEAK_DELAY_MS);
    expect(env.spoken[0]).toMatchObject({ voice: onDevice });
  });

  it("calls onStart only when it really speaks and reports spoken", async () => {
    const env = installSynth([onDevice]);
    const onStart = vi.fn();
    const done = speak("Rad", "de-DE", { onStart });
    await vi.advanceTimersByTimeAsync(SPEAK_DELAY_MS);
    expect(onStart).toHaveBeenCalledOnce();
    expect(env.spoken).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(50);
    await expect(done).resolves.toBe("spoken");

    env.loadVoices([cloud]);
    const silent = vi.fn();
    await expect(speak("Rad", "de-DE", { onStart: silent })).resolves.toBe(
      "no-voice",
    );
    expect(silent).not.toHaveBeenCalled();
  });

  it("hasVoiceFor counts only local voices", async () => {
    installSynth([cloud]);
    await preloadVoices();
    expect(hasVoiceFor("de-DE")).toBe(false);
  });

  it("prepareSpeech reports no-voice with only a network voice", async () => {
    installSynth([cloud]);
    const ready = prepareSpeech("de-DE", { timeoutMs: 200 });
    await vi.advanceTimersByTimeAsync(300);
    await expect(ready).resolves.toBe("no-voice");
  });
});
