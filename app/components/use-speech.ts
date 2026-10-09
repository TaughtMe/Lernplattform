"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  hasVoiceFor,
  prepareSpeech,
  preloadVoices,
  speak,
  stopSpeaking,
  type SpeechReadiness,
} from "../../src/speech/speaker";

/**
 * Sprachausgabe für Stufe 6: Bereitschaft, Vorbereiten im Klick und Sprechen.
 * Die Ansicht bekommt nur Zustände und Rückrufe.
 */
export function useSpeech(lang = "de-DE") {
  /** `undefined`, solange die Stimmenliste noch nicht geladen ist. */
  const [hasVoice, setHasVoice] = useState<boolean | undefined>();
  const [speaking, setSpeaking] = useState(false);
  const active = useRef(0);

  useEffect(() => {
    let alive = true;
    void preloadVoices().then(() => {
      if (alive) setHasVoice(hasVoiceFor(lang));
    });
    return () => {
      alive = false;
    };
  }, [lang]);

  // Beim Verlassen der Seite verstummt eine laufende Ausgabe.
  useEffect(() => stopSpeaking, []);

  /** Muss direkt im Klick-Handler von „Starten“ aufgerufen werden. */
  const prepare = useCallback(
    (): Promise<SpeechReadiness> => prepareSpeech(lang),
    [lang],
  );

  const say = useCallback(
    async (word: string) => {
      active.current += 1;
      setSpeaking(true);
      try {
        await speak(word, lang);
      } finally {
        active.current -= 1;
        if (active.current === 0) setSpeaking(false);
      }
    },
    [lang],
  );

  return { hasVoice, speaking, prepare, say, stop: stopSpeaking };
}
