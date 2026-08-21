/**
 * Kurzer Ton plus Vibration nach jedem Scan im Klassenbriefkasten (siehe
 * Entscheidungsprotokoll Punkt 6). Bewusst eine eigene, winzige Kopie statt
 * eines Imports aus src/tastschreiben/sound.ts — beide Module sollen
 * unabhängig bleiben, und der Bedarf hier ist auf zwei feste Töne begrenzt.
 */
let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window || "webkitAudioContext" in window)) return null;
  if (!audioContext) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContext = new Ctor();
  }
  return audioContext;
}

function beep(frequency: number, durationS: number): void {
  const ctx = getContext();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.frequency.value = frequency;
  oscillator.type = "sine";
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationS);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + durationS);
}

export function playScanFeedback(success: boolean): void {
  beep(success ? 880 : 220, success ? 0.12 : 0.2);
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(success ? 60 : [40, 40, 40]);
  }
}
