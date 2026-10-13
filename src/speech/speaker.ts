import { normalizeSpeechLang, pickVoice } from "./voices";

/** Gemeinsames Tempo für alle Stellen (Vorlese-Plan 3.1); kalibrierbar. */
export const SPEECH_RATE = 0.9;
/** Manche Browser verwerfen ein `speak()` direkt nach `cancel()`. */
export const SPEAK_DELAY_MS = 50;
/** So lange wartet `speak`, wenn die Stimmenliste noch leer ist. */
export const VOICE_WAIT_MS = 300;
/** Safari löst `voiceschanged` nicht zuverlässig aus: kurz nachfragen. */
const PRELOAD_POLLS = 5;
const PRELOAD_POLL_MS = 250;
/** Stufe 6: so lange wartet `prepareSpeech` auf eine Stimme und auf das Aufwärmen. */
export const PREPARE_TIMEOUT_MS = 3000;
export const WARMUP_TIMEOUT_MS = 1500;
/** Fällt `onend` aus (bekannter Fehler einiger Browser), endet das Sprechen hier. */
const SAFETY_TIMEOUT_MS = 12_000;

export type SpeechReadiness = "ready" | "no-voice" | "unavailable";

let cachedVoices: SpeechSynthesisVoice[] = [];
let preloading: Promise<SpeechSynthesisVoice[]> | undefined;
let generation = 0;

/** Nur für Tests: Zwischenspeicher zurücksetzen. */
export function resetSpeechState() {
  cachedVoices = [];
  preloading = undefined;
  generation += 1;
}

export function isSpeechAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

function synth(): SpeechSynthesis | undefined {
  return isSpeechAvailable() ? window.speechSynthesis : undefined;
}

function readVoices(): SpeechSynthesisVoice[] {
  const list = synth()?.getVoices() ?? [];
  if (list.length > 0) cachedVoices = list;
  return cachedVoices;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Lädt die Stimmenliste früh: sofort, über `voiceschanged` und durch kurzes
 * Nachfragen. Das Ergebnis wird zwischengespeichert.
 */
export function preloadVoices(): Promise<SpeechSynthesisVoice[]> {
  const speech = synth();
  if (!speech) return Promise.resolve([]);
  const known = readVoices();
  if (known.length > 0) return Promise.resolve(known);
  if (preloading) return preloading;
  preloading = new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let polls = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      speech.removeEventListener?.("voiceschanged", onChange);
      clearInterval(timer);
      preloading = undefined;
      resolve(readVoices());
    };
    const onChange = () => {
      if (readVoices().length > 0) finish();
    };
    speech.addEventListener?.("voiceschanged", onChange);
    const timer = setInterval(() => {
      polls += 1;
      if (readVoices().length > 0 || polls >= PRELOAD_POLLS) finish();
    }, PRELOAD_POLL_MS);
  });
  return preloading;
}

/** Gibt es auf diesem Gerät (nach `preloadVoices`) eine passende Stimme? */
export function hasVoiceFor(lang: string): boolean {
  return pickVoice(readVoices(), lang) !== null;
}

/** Spricht eine Äußerung und wartet auf ihr Ende (oder Fehler, oder Sicherheitsgrenze). */
function utter(
  speech: SpeechSynthesis,
  text: string,
  lang: string,
  options: {
    voice: SpeechSynthesisVoice | null;
    rate?: number;
    volume?: number;
    timeoutMs: number;
  },
): Promise<void> {
  return new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = normalizeSpeechLang(lang);
    if (options.voice) utterance.voice = options.voice;
    if (options.rate !== undefined) utterance.rate = options.rate;
    if (options.volume !== undefined) utterance.volume = options.volume;
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, options.timeoutMs);
    utterance.onend = done;
    utterance.onerror = done;
    speech.speak(utterance);
  });
}

export type SpeakOptions = {
  rate?: number;
  /** Gespeicherte Wunschstimme (Vorlese-Plan 3.4). */
  voiceURI?: string | null;
};

/**
 * Liest einen Text mit der besten Stimme des Geräts vor. Ist die Liste noch
 * leer, wartet es höchstens `VOICE_WAIT_MS` und liest dann trotzdem vor, damit
 * sich ein Tippen nie „tot“ anfühlt. Eine laufende Ausgabe wird beendet; das
 * Ergebnis kommt, wenn das Sprechen zu Ende ist.
 */
export async function speak(
  text: string,
  lang: string,
  options: SpeakOptions = {},
): Promise<void> {
  const speech = synth();
  if (!speech) return;
  const mine = ++generation;
  let voices = readVoices();
  if (voices.length === 0) {
    voices = await Promise.race([
      preloadVoices(),
      delay(VOICE_WAIT_MS).then(readVoices),
    ]);
  }
  if (mine !== generation) return;
  const voice = pickVoice(voices, lang, options.voiceURI);
  speech.cancel();
  await delay(SPEAK_DELAY_MS);
  // Zwischenzeitlich wurde schon etwas Neues angefordert: nur das Neueste zählt.
  if (mine !== generation) return;
  await utter(speech, text, lang, {
    voice,
    rate: options.rate ?? SPEECH_RATE,
    timeoutMs: SAFETY_TIMEOUT_MS,
  });
}

/** Beendet eine laufende Ausgabe (z. B. beim Verlassen der Übung). */
export function stopSpeaking() {
  generation += 1;
  synth()?.cancel();
}

/** Wartet bis zu `timeoutMs` auf eine passende Stimme. */
async function waitForVoice(
  lang: string,
  timeoutMs: number,
): Promise<SpeechSynthesisVoice | null> {
  const speech = synth();
  if (!speech) return null;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const voice = pickVoice(readVoices(), lang);
    if (voice) return voice;
    const left = deadline - Date.now();
    if (left <= 0) return null;
    await new Promise<void>((resolve) => {
      const onChange = () => finish();
      const finish = () => {
        speech.removeEventListener?.("voiceschanged", onChange);
        clearTimeout(timer);
        resolve();
      };
      speech.addEventListener?.("voiceschanged", onChange);
      const timer = setTimeout(finish, Math.min(100, left));
    });
  }
}

/**
 * Macht die Sprachausgabe für Stufe 6 bereit (Plan 2.4): wartet auf eine
 * passende Stimme (höchstens `timeoutMs`) und spricht eine stumme Äußerung
 * (`volume = 0`) mit dieser Stimme, damit Sprachdienst und Stimme geladen sind,
 * bevor das erste Wort kommt. Muss im Klick-Handler von „Starten“ aufgerufen
 * werden (Nutzergeste, die iOS für Ton verlangt).
 */
export async function prepareSpeech(
  lang: string,
  options: { timeoutMs?: number; warmupMs?: number } = {},
): Promise<SpeechReadiness> {
  const speech = synth();
  if (!speech) return "unavailable";
  const timeoutMs = options.timeoutMs ?? PREPARE_TIMEOUT_MS;
  const warmupMs = options.warmupMs ?? WARMUP_TIMEOUT_MS;

  // Schnellweg: Ist die Stimme schon bekannt, beginnt das Aufwärmen ohne Umweg
  // noch in der Nutzergeste.
  const voice =
    pickVoice(readVoices(), lang) ?? (await waitForVoice(lang, timeoutMs));
  if (!voice) return "no-voice";

  if (speech.speaking || speech.pending) {
    speech.cancel();
    await delay(SPEAK_DELAY_MS);
  }
  await utter(speech, " ", lang, { voice, volume: 0, timeoutMs: warmupMs });
  return "ready";
}
