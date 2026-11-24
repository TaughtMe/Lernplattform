import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { testManifest } from "./testing/manifest";

/** Warteschlange der Erzeugung (Vorab-Erzeugen und Vorlesen). */
vi.mock("./assets", () => ({
  fetchManifestJson: vi.fn(async () => testManifest),
  isAssetCached: vi.fn(async () => true),
  pruneSpeechCache: vi.fn(async () => {}),
  removeAssets: vi.fn(async () => {}),
}));
const player = vi.hoisted(() => ({
  played: [] as number[],
  isAudioPlaybackAvailable: () => true,
  unlockAudio: vi.fn(),
  stopAudio: vi.fn(),
  playSamples: vi.fn(async (samples: Float32Array) => {
    player.played.push(samples.length);
  }),
}));
vi.mock("./player", () => player);

import {
  pregenerate,
  resetModelSpeaker,
  speakWithModel,
} from "./model-speaker";

type Request = { type: string; id: number; text?: string; lang?: string };
let requests: Request[];
let release: (() => void) | undefined;
let hold: boolean;

class FakeWorker {
  private listener: ((event: { data: unknown }) => void) | undefined;
  addEventListener(type: string, listener: (event: { data: unknown }) => void) {
    if (type === "message") this.listener = listener;
  }
  terminate() {}
  postMessage(request: Request) {
    requests.push(request);
    const answer = () =>
      this.listener?.({
        data: {
          type: "audio",
          id: request.id,
          // Länge = Textlänge: zeigt, welcher Text abgespielt wurde.
          samples: new Float32Array(request.text?.length ?? 1),
          sampleRate: 24000,
        },
      });
    if (hold) {
      release = () => {
        hold = false;
        answer();
      };
    } else {
      setTimeout(answer, 0);
    }
  }
}

beforeEach(() => {
  resetModelSpeaker();
  requests = [];
  hold = false;
  release = undefined;
  player.played = [];
  vi.stubGlobal("Worker", FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

const texts = () => requests.map((request) => request.text);

describe("Warteschlange der Lernraum-Stimme", () => {
  it("rechnet ein vorab erzeugtes Wort beim Vorlesen nicht noch einmal", async () => {
    await pregenerate(["Auto"], "de-DE", 0.9);
    expect(await speakWithModel("Auto", "de-DE", { speed: 0.9 })).toBe(true);
    expect(texts()).toEqual(["Auto"]);
    expect(player.played).toEqual([4]);
  });

  it("teilt den Speicher zwischen de und de-DE", async () => {
    await pregenerate(["Haus"], "de", 0.9);
    await speakWithModel("Haus", "de-DE", { speed: 0.9 });
    expect(texts()).toEqual(["Haus"]);
  });

  it("wartet auf ein Wort, das gerade vorab entsteht, statt es doppelt zu rechnen", async () => {
    hold = true;
    void pregenerate(["Baum"], "de-DE", 0.9);
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    const spoken = speakWithModel("Baum", "de-DE", { speed: 0.9 });
    release?.();
    expect(await spoken).toBe(true);
    expect(texts()).toEqual(["Baum"]);
  });

  it("lässt Vorlesen vor wartenden Vorab-Aufträgen laufen", async () => {
    hold = true;
    void pregenerate(["eins", "zwei", "drei"], "de-DE", 0.9);
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    const spoken = speakWithModel("jetzt", "de-DE", { speed: 0.9 });
    release?.();
    await spoken;
    // „eins“ lief schon; danach kommt sofort das Vorlesen.
    expect(texts().slice(0, 2)).toEqual(["eins", "jetzt"]);
  });

  it("verwirft veraltete Vorab-Aufträge der vorigen Karte", async () => {
    hold = true;
    void pregenerate(["alt1", "alt2", "alt3"], "de-DE", 0.9);
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    const next = pregenerate(["neu"], "de-DE", 0.9);
    release?.();
    await next;
    expect(texts()).toEqual(["alt1", "neu"]);
  });
});
