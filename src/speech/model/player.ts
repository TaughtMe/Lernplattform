/**
 * Wiedergabe des Modell-Audios über einen gemeinsamen `AudioContext`
 * (Plan 3.3). iOS gibt Ton nur in einer Nutzergeste frei: `unlockAudio()` muss
 * synchron im Klick-Handler laufen, vor dem ersten `await`.
 */
type AudioContextConstructor = typeof AudioContext;

let context: AudioContext | undefined;
let playing: { source: AudioBufferSourceNode; finish: () => void } | undefined;

function audioContextClass(): AudioContextConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const scope = window as typeof window & {
    webkitAudioContext?: AudioContextConstructor;
  };
  return scope.AudioContext ?? scope.webkitAudioContext;
}

export function isAudioPlaybackAvailable(): boolean {
  return audioContextClass() !== undefined;
}

/** Erzeugt und weckt den `AudioContext`; ein stummer Ton schaltet iOS frei. */
export function unlockAudio(): AudioContext | undefined {
  const Context = audioContextClass();
  if (!Context) return undefined;
  try {
    context ??= new Context();
    if (context.state === "suspended") void context.resume();
    const silent = context.createBuffer(1, 1, context.sampleRate);
    const source = context.createBufferSource();
    source.buffer = silent;
    source.connect(context.destination);
    source.start();
  } catch {
    // Ohne Audio bleibt die Gerätestimme als Rückfall.
  }
  return context;
}

/** Beendet eine laufende Wiedergabe sofort. */
export function stopAudio() {
  const current = playing;
  playing = undefined;
  if (!current) return;
  try {
    current.source.stop();
  } catch {
    // Schon beendet.
  }
  current.finish();
}

/** Spielt Samples ab; das Ergebnis kommt am Ende oder beim Stoppen. */
export async function playSamples(
  samples: Float32Array,
  sampleRate: number,
): Promise<void> {
  const audio = context ?? unlockAudio();
  if (!audio || samples.length === 0) return;
  stopAudio();
  if (audio.state === "suspended") await audio.resume().catch(() => {});
  const buffer = audio.createBuffer(1, samples.length, sampleRate);
  buffer.copyToChannel(new Float32Array(samples), 0);
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.connect(audio.destination);
  await new Promise<void>((resolve) => {
    const finish = () => {
      if (playing?.source === source) playing = undefined;
      resolve();
    };
    playing = { source, finish };
    source.onended = finish;
    source.start();
  });
}
