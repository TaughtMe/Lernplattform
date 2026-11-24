import {
  installLanguage,
  isModelAvailable,
  languageStatus,
  loadModelManifest,
  pregenerate,
  prepareModel,
  preloadModel,
  speakWithModel,
  stopModel,
} from "./model/model-speaker";
import { unlockAudio } from "./model/player";
import { speechRoutes } from "./model/route";
import {
  missingVoiceMessage,
  normalizeSpeechLang,
  pickLocalVoice,
} from "./voices";

/**
 * Gemeinsame Sprachausgabe aller Stellen (LernBox, Live-Spiel, Station,
 * Wortspeicher Stufe 6, Startpunkt, Vorlesen). Mit `model: true` spricht
 * zuerst die Lernraum-Stimme (Entscheidung 82). Von den Stimmen des Geräts
 * nutzt sie nur solche, die auf dem Gerät laufen (Entscheidung 58, Befund
 * B-012). Gibt es keine passende, spricht sie nicht und meldet das über
 * `SPEECH_NOTICE_EVENT`, damit das Kind einen Hinweis sieht statt einer
 * stummen Taste.
 */
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
/** Ergebnis von `speak`: gesprochen, keine lokale Stimme, keine Sprachausgabe, abgelöst. */
export type SpeakOutcome = "spoken" | "no-voice" | "unavailable" | "replaced";

/** Fenster-Ereignis mit dem Hinweistext in `detail.message`. */
export const SPEECH_NOTICE_EVENT = "lernraum-speech-notice";
export type SpeechNoticeDetail = { message: string };

/** Meldet einen Hinweis zur Sprachausgabe (z. B. „keine deutsche Stimme“). */
export function announceSpeechNotice(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<SpeechNoticeDetail>(SPEECH_NOTICE_EVENT, {
      detail: { message },
    }),
  );
}

/** Hinweis, wenn das Gerät gar keine Sprachausgabe hat. */
export const NO_SPEECH_MESSAGE = "Dieses Gerät kann nicht vorlesen.";

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
  const list = synth()?.getVoices?.() ?? [];
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
 * Lernraum-Stimme (Plan `docs/umsetzungsplan-sprachmodell.md`): Die Aufrufer
 * geben `model` mit, wenn Freigabe und Schalter je Gerät sie erlauben
 * (`useModelSpeech`). Ohne diese Option sprechen nur lokale Gerätestimmen.
 */
export type ModelOption = {
  /** Lernraum-Stimme erlaubt (Freigabe `sprachmodell` und Geräteschalter). */
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

/**
 * Lädt das Modell und erzeugt die Texte vorab, damit Vorlesen sofort klingt
 * (z. B. die aktuelle Karte, das nächste Wort). Nur für installierte
 * Sprachen: Vorab-Arbeit lädt nie ungefragt 34 MB.
 */
export async function prepareSpeechAhead(
  texts: readonly string[],
  lang: string,
  /** Kennung des Aufrufers: Er verwirft nur seine eigenen alten Aufträge. */
  owner = "vorab",
): Promise<void> {
  const manifest = await loadModelManifest();
  if (!manifest || !isModelAvailable(lang)) return;
  if ((await languageStatus(lang)) !== "installed") return;
  void preloadModel(lang);
  await pregenerate([...texts], lang, SPEECH_RATE, owner);
}

/**
 * Gibt es (nach `preloadVoices`) eine passende Stimme, die auf dem Gerät
 * läuft? Netzstimmen zählen nie (B-012). Mit `model` zählt auch die
 * Lernraum-Stimme, wenn es für die Sprache ein Modell gibt.
 */
export function hasLocalVoiceFor(
  lang: string,
  options: ModelOption = {},
): boolean {
  if (options.model && isModelAvailable(lang)) return true;
  return pickLocalVoice(readVoices(), lang) !== null;
}

/** Gleichbedeutend mit `hasLocalVoiceFor`: Es gibt nur lokale Stimmen. */
export const hasVoiceFor = hasLocalVoiceFor;

/** Die Optionen ohne `model`, für den Weg über die Gerätestimme. */
function systemOptions(options: SpeakOptions): SpeakOptions {
  const rest = { ...options };
  delete rest.model;
  return rest;
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
  /** Gespeicherte Wunschstimme (Vorlese-Plan 3.4); nur, wenn sie lokal läuft. */
  voiceURI?: string | null;
  /** Läuft kurz bevor die Stimme spricht (z. B. „Anhören“ mitzählen). */
  onStart?: () => void;
  /** Ohne Hinweis bleiben, wenn die Stelle selbst einen zeigt. */
  silentNotice?: boolean;
};

/**
 * Liest einen Text mit der besten Stimme des Geräts vor. Ist die Liste noch
 * leer, wartet es höchstens `VOICE_WAIT_MS` (danach auch auf das späte
 * Nachladen von Safari). Ohne lokale Stimme passender Sprache spricht es
 * nicht, meldet den Hinweis und liefert `"no-voice"`. Eine laufende Ausgabe
 * wird beendet; das Ergebnis kommt, wenn das Sprechen zu Ende ist.
 */
export async function speak(
  text: string,
  lang: string,
  options: SpeakOptions = {},
): Promise<SpeakOutcome> {
  if (options.model) return speakPreferringModel(text, lang, options);
  const speech = synth();
  if (!speech) {
    if (!options.silentNotice) announceSpeechNotice(NO_SPEECH_MESSAGE);
    return "unavailable";
  }
  const mine = ++generation;
  stopModel();
  let voices = readVoices();
  if (voices.length === 0) {
    voices = await Promise.race([
      preloadVoices(),
      delay(VOICE_WAIT_MS).then(readVoices),
    ]);
  }
  if (mine !== generation) return "replaced";
  let voice = pickLocalVoice(voices, lang, options.voiceURI);
  if (!voice && voices.length === 0) {
    // Die Liste kam noch nicht: auf das Ende des Ladens warten, statt ohne
    // Stimme (und damit womöglich mit einer Netzstimme) zu sprechen.
    voice = pickLocalVoice(await preloadVoices(), lang, options.voiceURI);
    if (mine !== generation) return "replaced";
  }
  if (!voice) {
    if (!options.silentNotice) announceSpeechNotice(missingVoiceMessage(lang));
    return "no-voice";
  }
  speech.cancel();
  await delay(SPEAK_DELAY_MS);
  // Zwischenzeitlich wurde schon etwas Neues angefordert: nur das Neueste zählt.
  if (mine !== generation) return "replaced";
  options.onStart?.();
  await utter(speech, text, lang, {
    voice,
    rate: options.rate ?? SPEECH_RATE,
    timeoutMs: SAFETY_TIMEOUT_MS,
  });
  return "spoken";
}

/**
 * Lernraum-Stimme (Entscheidung 82): Gibt es ein Modell für die Sprache,
 * spricht es; fällt es aus, nur eine Stimme, die auf dem Gerät läuft. Ohne
 * Modell für die Sprache geht der Aufruf an die Gerätestimme.
 */
async function speakPreferringModel(
  text: string,
  lang: string,
  options: SpeakOptions,
): Promise<SpeakOutcome> {
  const mine = ++generation;
  // Ton noch in der Geste freigeben, vor dem ersten `await` (iOS): LernBox
  // und Laufdiktat rufen `speak` direkt im Klick auf.
  unlockAudio();
  await loadModelManifest();
  if (mine !== generation) return "replaced";
  if (!isModelAvailable(lang)) return speak(text, lang, systemOptions(options));
  // Sprache noch nicht installiert: Mit Gerätestimme gleich vorlesen und die
  // Sprache im Hintergrund installieren; ohne Gerätestimme auf das Modell warten.
  if ((await languageStatus(lang)) !== "installed") {
    if (mine !== generation) return "replaced";
    void installLanguage(lang);
    if (readVoices().length === 0) {
      await Promise.race([preloadVoices(), delay(VOICE_WAIT_MS)]);
    }
    if (mine !== generation) return "replaced";
    if (hasLocalVoiceFor(lang)) {
      return speak(text, lang, systemOptions(options));
    }
  }
  if (mine !== generation) return "replaced";
  synth()?.cancel();
  const routes = speechRoutes({
    modelAllowed: true,
    modelAvailable: true,
    localSystemVoice: hasLocalVoiceFor(lang),
  });
  for (const route of routes) {
    if (mine !== generation) return "replaced";
    if (route === "model") {
      const spoken = await speakWithModel(text, lang, {
        speed: options.rate ?? SPEECH_RATE,
        ...(options.onStart ? { onStart: options.onStart } : {}),
      });
      if (spoken) return mine === generation ? "spoken" : "replaced";
    } else {
      return speak(text, lang, systemOptions(options));
    }
  }
  if (!options.silentNotice) announceSpeechNotice(missingVoiceMessage(lang));
  return "no-voice";
}

/** Beendet eine laufende Ausgabe (z. B. beim Verlassen der Übung). */
export function stopSpeaking() {
  generation += 1;
  synth()?.cancel();
  stopModel();
}

/** Wartet bis zu `timeoutMs` auf eine passende lokale Stimme. */
async function waitForVoice(
  lang: string,
  timeoutMs: number,
): Promise<SpeechSynthesisVoice | null> {
  const speech = synth();
  if (!speech) return null;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const voice = pickLocalVoice(readVoices(), lang);
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
  let modelFailed = false;
  if (options.model) {
    // Ton noch in der Geste freigeben, vor dem ersten `await` (iOS).
    unlockAudio();
    await loadModelManifest();
    if (isModelAvailable(lang)) {
      if (await prepareModel(lang)) return "ready";
      // Rückfall: nur Stimmen, die auf dem Gerät laufen (B-012).
      modelFailed = true;
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
  const voice = modelFailed
    ? pickLocalVoice(readVoices(), lang)
    : (pickLocalVoice(readVoices(), lang) ??
      (await waitForVoice(lang, timeoutMs)));
  if (!voice) return "no-voice";

  if (speech.speaking || speech.pending) {
    speech.cancel();
    await delay(SPEAK_DELAY_MS);
  }
  await utter(speech, " ", lang, { voice, volume: 0, timeoutMs: warmupMs });
  return "ready";
}
