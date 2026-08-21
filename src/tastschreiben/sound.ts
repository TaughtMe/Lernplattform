export const SOUND_STORAGE_KEY = "tastschreiben-sound";

export function isSoundSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
}

/** Standardmäßig an — wer nicht möchte, schaltet bewusst ab (Einstellung bleibt pro Gerät erhalten). */
export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SOUND_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // localStorage kann in privaten Fenstern fehlen — die Einstellung gilt dann nur für diese Seitenansicht.
  }
}

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (!isSoundSupported()) return null;
  if (!sharedContext) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedContext = new Ctor();
  }
  return sharedContext;
}

/** Kurzer synthetischer Ton statt einer Audiodatei — kein Asset nötig, funktioniert überall, wo Web Audio verfügbar ist. */
function beep(frequency: number, durationS: number, type: OscillatorType, volume: number): void {
  if (!isSoundEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  oscillator.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationS);
  oscillator.start(now);
  oscillator.stop(now + durationS);
}

export function playClick(): void {
  beep(660, 0.045, "sine", 0.05);
}

export function playError(): void {
  beep(180, 0.12, "sawtooth", 0.06);
}

export function playComplete(): void {
  beep(880, 0.09, "sine", 0.07);
  setTimeout(() => beep(1320, 0.12, "sine", 0.06), 90);
}
