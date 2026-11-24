"use client";

import { useEffect } from "react";
import { prepareSpeechAhead } from "../../src/speech/speaker";
import { useModelSpeech } from "./use-model-speech";

/**
 * Lädt die Lernraum-Stimme und erzeugt die Texte im Hintergrund vorab, sobald
 * sie sich ändern (z. B. neue Karte, nächstes Wort). Ein Tippen auf
 * „Vorlesen“ spielt dann ohne Wartezeit.
 */
export function useSpeechAhead(texts: readonly string[], lang: string) {
  const model = useModelSpeech();
  const key = JSON.stringify(texts);
  useEffect(() => {
    if (!model || !lang) return;
    void prepareSpeechAhead(JSON.parse(key) as string[], lang).catch(() => {});
  }, [model, key, lang]);
}
