/**
 * Reine Stimmenwahl für die Sprachausgabe des Geräts (Vorlese-Plan 3.1).
 * Kein Browserzugriff: Stimmen werden als einfache Objekte übergeben.
 */
export type SpeechVoiceLike = {
  name: string;
  lang: string;
  voiceURI: string;
  default?: boolean;
  /**
   * `true`, wenn die Stimme auf dem Gerät läuft. Nur solche Stimmen nutzt
   * Lernraum (Entscheidung 58, Befund B-012): Der Text verlässt das Gerät nicht.
   */
  localService?: boolean;
};

const SHORT_CODES: Record<string, string> = {
  de: "de-DE",
  en: "en-GB",
  fr: "fr-FR",
  es: "es-ES",
};

/** `de` → `de-DE`; vollständige Codes bleiben, nur die Schreibweise wird vereinheitlicht. */
export function normalizeSpeechLang(lang: string): string {
  const parts = lang.trim().replace(/_/g, "-").split("-").filter(Boolean);
  const language = (parts[0] ?? "").toLowerCase();
  if (parts.length === 1) return SHORT_CODES[language] ?? language;
  return [language, ...parts.slice(1).map((part) => part.toUpperCase())].join(
    "-",
  );
}

function languageOf(lang: string) {
  return normalizeSpeechLang(lang).split("-")[0] ?? "";
}

/**
 * Qualitätsmerkmale im Namen geben Pluspunkte. Die Liste steht nur hier:
 * moderne neuronale Stimmen („Natural“, „Neural“, „Online“), hochwertige
 * Systemstimmen („Premium“, „Enhanced“, „Siri“) und die Google-Stimmen von
 * Chrome und Android.
 */
const QUALITY_BONUS: readonly [RegExp, number][] = [
  [/natural/i, 30],
  [/neural/i, 30],
  [/premium/i, 30],
  [/enhanced/i, 25],
  [/siri/i, 25],
  [/online/i, 20],
  [/google/i, 20],
];

/** Bekannte schwache Stimmen: eSpeak und die Kompaktstimmen von macOS. */
const WEAK_PENALTY: readonly [RegExp, number][] = [
  [/espeak/i, 60],
  [/compact/i, 40],
];

const EXACT_REGION = 100;
const SAME_LANGUAGE = 50;

/**
 * Punktzahl einer Stimme für die gewünschte Sprache; `null` heißt
 * „ausgeschlossen“ (andere Sprache).
 */
export function rankVoice(voice: SpeechVoiceLike, lang: string): number | null {
  const wanted = normalizeSpeechLang(lang);
  const own = normalizeSpeechLang(voice.lang);
  let score: number;
  if (own === wanted) score = EXACT_REGION;
  else if (languageOf(own) === languageOf(wanted)) score = SAME_LANGUAGE;
  else return null;

  const label = `${voice.name} ${voice.voiceURI}`;
  for (const [pattern, bonus] of QUALITY_BONUS) {
    if (pattern.test(label)) score += bonus;
  }
  for (const [pattern, penalty] of WEAK_PENALTY) {
    if (pattern.test(label)) score -= penalty;
  }
  // Bei Gleichstand gewinnt die Systemvorgabe.
  if (voice.default) score += 1;
  return score;
}

/**
 * Wählt die Stimme: Eine gespeicherte Wunschstimme gewinnt, wenn sie
 * vorhanden ist und zur Sprache passt. Sonst die beste nach `rankVoice`, ohne
 * Treffer `null` (dann setzt der Aufrufer nur `lang`).
 */
export function pickVoice<T extends SpeechVoiceLike>(
  voices: readonly T[],
  lang: string,
  preferredVoiceURI?: string | null,
): T | null {
  if (preferredVoiceURI) {
    const preferred = voices.find(
      (voice) =>
        voice.voiceURI === preferredVoiceURI && rankVoice(voice, lang) !== null,
    );
    if (preferred) return preferred;
  }
  let best: T | null = null;
  let bestScore = -Infinity;
  for (const voice of voices) {
    const score = rankVoice(voice, lang);
    if (score !== null && score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}

/** Nur Stimmen, die sicher auf dem Gerät laufen (`localService === true`). */
export function localVoicesOnly<T extends SpeechVoiceLike>(
  voices: readonly T[],
): T[] {
  return voices.filter((voice) => voice.localService === true);
}

/**
 * Stimmenwahl für alle Stellen der App: wie `pickVoice`, aber nur unter den
 * Stimmen des Geräts. Gibt es keine passende, ist das Ergebnis `null`; eine
 * Netzstimme wird nie gewählt, auch nicht als Wunschstimme.
 */
export function pickLocalVoice<T extends SpeechVoiceLike>(
  voices: readonly T[],
  lang: string,
  preferredVoiceURI?: string | null,
): T | null {
  return pickVoice(localVoicesOnly(voices), lang, preferredVoiceURI);
}

const LANGUAGE_ADJECTIVES: Record<string, string> = {
  de: "deutsche",
  en: "englische",
  fr: "französische",
  es: "spanische",
  it: "italienische",
  tr: "türkische",
  pl: "polnische",
  uk: "ukrainische",
  ru: "russische",
  ar: "arabische",
  la: "lateinische",
};

/**
 * Hinweis, wenn es auf dem Gerät keine passende Stimme gibt. Die Funktion
 * entfällt nicht still; das Kind erfährt, warum nichts zu hören ist.
 */
export function missingVoiceMessage(lang: string): string {
  const adjective = LANGUAGE_ADJECTIVES[languageOf(lang)];
  return adjective
    ? `Auf diesem Gerät ist keine ${adjective} Stimme installiert.`
    : "Auf diesem Gerät ist keine passende Stimme installiert.";
}
