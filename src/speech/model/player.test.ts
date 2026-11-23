import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Ein AudioContext, der angehalten bleibt (kein Audiogerät, keine Freigabe). */
class StuckAudioContext {
  static copied: number[][] = [];
  static started = 0;
  state = "suspended";
  sampleRate = 24000;
  destination = {};
  resume() {
    return new Promise<void>(() => {});
  }
  createBuffer(_channels: number, length: number) {
    return {
      length,
      copyToChannel: (source: Float32Array) =>
        StuckAudioContext.copied.push(Array.from(source)),
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      onended: null as (() => void) | null,
      connect() {},
      start: () => {
        StuckAudioContext.started += 1;
      },
      stop() {},
    };
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
  StuckAudioContext.copied = [];
  StuckAudioContext.started = 0;
  vi.stubGlobal("AudioContext", StuckAudioContext);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("playSamples", () => {
  it("hängt nicht, wenn der AudioContext angehalten bleibt", async () => {
    const { playSamples, RESUME_TIMEOUT_MS } = await import("./player");
    let finished = false;
    const playing = playSamples(Float32Array.of(1, 2, 3), 24000).then(() => {
      finished = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    // Die Samples sind schon im Puffer, bevor auf resume() gewartet wird.
    expect(StuckAudioContext.copied).toEqual([[1, 2, 3]]);
    // Nur der stumme Freigabe-Ton von unlockAudio ist schon gestartet.
    const beforeResume = StuckAudioContext.started;
    await vi.advanceTimersByTimeAsync(RESUME_TIMEOUT_MS);
    expect(StuckAudioContext.started).toBe(beforeResume + 1);
    await vi.advanceTimersByTimeAsync(2000);
    await playing;
    expect(finished).toBe(true);
  });

  it("endet sofort beim Stoppen", async () => {
    const { playSamples, stopAudio } = await import("./player");
    const playing = playSamples(new Float32Array(240000), 24000);
    await vi.advanceTimersByTimeAsync(1000);
    stopAudio();
    await expect(playing).resolves.toBeUndefined();
  });
});
