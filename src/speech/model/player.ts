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

/** So lange wartet die Wiedergabe höchstens auf `resume()`. */
export const RESUME_TIMEOUT_MS = 1000;
/** Bleibt `onended` aus (z. B. ohne Audiogerät), endet es nach Dauer + Puffer. */
const END_GRACE_MS = 1500;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Spielt Samples ab; das Ergebnis kommt am Ende oder beim Stoppen. Ein
 * angehaltener `AudioContext` (kein Audiogerät, keine Freigabe) darf das
 * Vorlesen nicht für immer blockieren.
 */
export async function playSamples(
  samples: Float32Array,
  sampleRate: number,
): Promise<void> {
  const audio = context ?? unlockAudio();
  if (!audio || samples.length === 0) return;
  stopAudio();
  const buffer = audio.createBuffer(1, samples.length, sampleRate);
  buffer.copyToChannel(new Float32Array(samples), 0);
  if (audio.state !== "running") {
    await Promise.race([
      audio.resume().catch(() => {}),
      delay(RESUME_TIMEOUT_MS),
    ]);
  }
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.connect(audio.destination);
  const durationMs = (samples.length / sampleRate) * 1000;
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (playing?.source === source) playing = undefined;
      resolve();
    };
    const timer = setTimeout(finish, durationMs + END_GRACE_MS);
    playing = { source, finish };
    source.onended = finish;
    source.start();
  });
}
