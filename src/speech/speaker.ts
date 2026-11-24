import {
  installLanguage,
  isModelAvailable,
  languageStatus,
  loadModelManifest,
  prepareModel,
  preloadModel,
  speakWithModel,
  stopModel,
} from "./model/model-speaker";
import { unlockAudio } from "./model/player";
import { speechRoutes } from "./model/route";
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

/**
 * Sprachmodell im Browser (Plan `docs/umsetzungsplan-sprachmodell.md`): nur
 * mit der Vorschau-Freigabe „sprachmodell“. Ohne diese Option bleibt alles wie
 * vor dem Plan.
 */
export type ModelOption = {
  /** Freigabe `sprachmodell` ist sichtbar. */
  model?: boolean;
};

/**
 * Lädt das Manifest des Sprachmodells und danach im Hintergrund das Modell
 * selbst. Das Ergebnis kommt, sobald bekannt ist, ob es ein Modell gibt.
 */
export async function preloadModelSpeech(lang: string): Promise<boolean> {
  const manifest = await loadModelManifest();
  const available = manifest !== null && isModelAvailable(lang);
  // Nur Installiertes vorwärmen: Eine Seite zu öffnen lädt keine 34 MB.
  if (available && (await languageStatus(lang)) === "installed") {
    void preloadModel(lang);
  }
  return available;
}

/** Gibt es auf diesem Gerät (nach `preloadVoices`) eine passende Stimme? */
export function hasVoiceFor(lang: string, options: ModelOption = {}): boolean {
  if (options.model && isModelAvailable(lang)) return true;
  return pickVoice(readVoices(), lang) !== null;
}

/** Die Optionen ohne `model`, für den Weg über die Gerätestimme. */
function systemOptions(
  options: SpeakOptions,
  localOnly: boolean,
): SpeakOptions {
  const result: SpeakOptions = {};
  if (localOnly) result.localOnly = true;
  if (options.rate !== undefined) result.rate = options.rate;
  if (options.voiceURI !== undefined) result.voiceURI = options.voiceURI;
  return result;
}

/** Nur Stimmen, die auf dem Gerät laufen: Der Text verlässt es nicht (B-012). */
function localVoices(): SpeechSynthesisVoice[] {
  return readVoices().filter((voice) => voice.localService);
}

/** Gibt es eine passende Stimme, die auf dem Gerät läuft (auch das Modell)? */
export function hasLocalVoiceFor(
  lang: string,
  options: ModelOption = {},
): boolean {
  if (options.model && isModelAvailable(lang)) return true;
  return pickVoice(localVoices(), lang) !== null;
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

export type SpeakOptions = ModelOption & {
  rate?: number;
  /** Gespeicherte Wunschstimme (Vorlese-Plan 3.4). */
  voiceURI?: string | null;
  /**
   * Nur Stimmen, die auf dem Gerät laufen. Gibt es keine, bleibt es stumm,
   * statt den Text an eine Netzwerkstimme zu schicken (B-012).
   */
  localOnly?: boolean;
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
  if (options.model) return speakPreferringModel(text, lang, options);
  const speech = synth();
  if (!speech) return;
  const mine = ++generation;
  stopModel();
  let voices = readVoices();
  if (voices.length === 0) {
    voices = await Promise.race([
      preloadVoices(),
      delay(VOICE_WAIT_MS).then(readVoices),
    ]);
  }
  if (mine !== generation) return;
  if (options.localOnly) voices = voices.filter((entry) => entry.localService);
  const voice = pickVoice(voices, lang, options.voiceURI);
  if (options.localOnly && !voice) return;
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

/**
 * Vorschau „sprachmodell“ (Plan 2.2): Gibt es ein Modell für die Sprache,
 * spricht es; fällt es aus, nur eine Stimme, die auf dem Gerät läuft. Ohne
 * Modell bleibt alles wie vor dem Plan.
 */
async function speakPreferringModel(
  text: string,
  lang: string,
  options: SpeakOptions,
): Promise<void> {
  const mine = ++generation;
  // Ton noch in der Geste freigeben, vor dem ersten `await` (iOS): LernBox
  // und Laufdiktat rufen `speak` direkt im Klick auf.
  unlockAudio();
  await loadModelManifest();
  if (mine !== generation) return;
  if (!isModelAvailable(lang)) {
    return speak(
      text,
      lang,
      systemOptions(options, options.localOnly === true),
    );
  }
  // Sprache noch nicht installiert: Mit Gerätestimme gleich vorlesen und die
  // Sprache im Hintergrund installieren; ohne Gerätestimme auf das Modell warten.
  if ((await languageStatus(lang)) !== "installed") {
    if (mine !== generation) return;
    void installLanguage(lang);
    if (readVoices().length === 0) {
      await Promise.race([preloadVoices(), delay(VOICE_WAIT_MS)]);
    }
    if (mine !== generation) return;
    if (hasVoiceFor(lang)) {
      return speak(
        text,
        lang,
        systemOptions(options, options.localOnly === true),
      );
    }
  }
  if (mine !== generation) return;
  synth()?.cancel();
  const routes = speechRoutes({
    modelAllowed: true,
    modelAvailable: true,
    localSystemVoice: hasLocalVoiceFor(lang),
    anySystemVoice: hasVoiceFor(lang),
    localOnly: true,
  });
  for (const route of routes) {
    if (mine !== generation) return;
    if (route === "model") {
      const spoken = await speakWithModel(text, lang, {
        speed: options.rate ?? SPEECH_RATE,
      });
      if (spoken) return;
    } else {
      await speak(text, lang, systemOptions(options, true));
      return;
    }
  }
}

/** Beendet eine laufende Ausgabe (z. B. beim Verlassen der Übung). */
export function stopSpeaking() {
  generation += 1;
  synth()?.cancel();
  stopModel();
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
  options: ModelOption & { timeoutMs?: number; warmupMs?: number } = {},
): Promise<SpeechReadiness> {
  let localOnly = false;
  if (options.model) {
    // Ton noch in der Geste freigeben, vor dem ersten `await` (iOS).
    unlockAudio();
    await loadModelManifest();
    if (isModelAvailable(lang)) {
      if (await prepareModel(lang)) return "ready";
      // Rückfall: nur Stimmen, die auf dem Gerät laufen (B-012).
      localOnly = true;
      if (!synth()) return "unavailable";
      await preloadVoices();
      if (!hasLocalVoiceFor(lang)) return "no-voice";
    }
  }
  const speech = synth();
  if (!speech) return "unavailable";
  const timeoutMs = options.timeoutMs ?? PREPARE_TIMEOUT_MS;
  const warmupMs = options.warmupMs ?? WARMUP_TIMEOUT_MS;

  // Schnellweg: Ist die Stimme schon bekannt, beginnt das Aufwärmen ohne Umweg
  // noch in der Nutzergeste.
  const voice = localOnly
    ? pickVoice(localVoices(), lang)
    : (pickVoice(readVoices(), lang) ?? (await waitForVoice(lang, timeoutMs)));
  if (!voice) return "no-voice";

  if (speech.speaking || speech.pending) {
    speech.cancel();
    await delay(SPEAK_DELAY_MS);
  }
  await utter(speech, " ", lang, { voice, volume: 0, timeoutMs: warmupMs });
  return "ready";
}
