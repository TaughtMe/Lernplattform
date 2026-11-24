"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  hasVoiceFor,
  prepareSpeech,
  preloadModelSpeech,
  preloadVoices,
  speak,
  stopSpeaking,
  type SpeechReadiness,
} from "../../src/speech/speaker";
import { useModelSpeech } from "../ui/use-model-speech";

/** Ohne Vorschau dieselben Aufrufe wie vor dem Sprachmodell. */
function voiceFor(lang: string, model: boolean) {
  return model ? hasVoiceFor(lang, { model }) : hasVoiceFor(lang);
}

/**
 * Sprachausgabe für Stufe 6: Bereitschaft, Vorbereiten im Klick und Sprechen.
 * Die Ansicht bekommt nur Zustände und Rückrufe. Mit der Vorschau
 * „sprachmodell“ und einem Modell für die Sprache spricht das Sprachmodell im
 * Browser (docs/umsetzungsplan-sprachmodell.md, 3.4); sonst wie bisher.
 */
export function useSpeech(lang = "de-DE") {
  const model = useModelSpeech();
  /** `undefined`, solange die Stimmenliste noch nicht geladen ist. */
  const [hasVoice, setHasVoice] = useState<boolean | undefined>();
  const [speaking, setSpeaking] = useState(false);
  const active = useRef(0);

  useEffect(() => {
    let alive = true;
    const check = () => {
      if (alive) setHasVoice(voiceFor(lang, model));
    };
    void preloadVoices().then(check);
    if (model) void preloadModelSpeech(lang).then(check);
    return () => {
      alive = false;
    };
  }, [lang, model]);

  // Eine Stimme, die erst nach dem ersten Warten geladen wird, schaltet Stufe 6 frei.
  useEffect(() => {
    const speech =
      typeof window === "undefined" ? undefined : window.speechSynthesis;
    if (!speech?.addEventListener) return;
    const onChange = () => {
      if (voiceFor(lang, model)) setHasVoice(true);
    };
    speech.addEventListener("voiceschanged", onChange);
    return () => speech.removeEventListener("voiceschanged", onChange);
  }, [lang, model]);

  // Beim Verlassen der Seite verstummt eine laufende Ausgabe.
  useEffect(() => stopSpeaking, []);

  /** Muss direkt im Klick-Handler von „Starten“ aufgerufen werden. */
  const prepare = useCallback(
    (): Promise<SpeechReadiness> =>
      model ? prepareSpeech(lang, { model }) : prepareSpeech(lang),
    [lang, model],
  );

  const say = useCallback(
    async (word: string) => {
      active.current += 1;
      setSpeaking(true);
      try {
        await (model ? speak(word, lang, { model }) : speak(word, lang));
      } finally {
        active.current -= 1;
        if (active.current === 0) setSpeaking(false);
      }
    },
    [lang, model],
  );

  return { hasVoice, speaking, prepare, say, stop: stopSpeaking };
}
