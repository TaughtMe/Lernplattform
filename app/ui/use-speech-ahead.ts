"use client";

import { useEffect, useId } from "react";
import { prepareSpeechAhead } from "../../src/speech/speaker";
import { useModelSpeech } from "./use-model-speech";

/**
 * Lädt die Lernraum-Stimme und erzeugt die Texte im Hintergrund vorab, sobald
 * sie sich ändern (z. B. neue Karte, nächstes Wort). Ein Tippen auf
 * „Vorlesen“ spielt dann ohne Wartezeit.
 */
export function useSpeechAhead(texts: readonly string[], lang: string) {
  const model = useModelSpeech();
  // Jeder Aufruf verwirft nur seine eigenen alten Vorab-Aufträge (z. B.
  // stören sich Frage und Antwort einer LernBox-Karte nicht).
  const owner = useId();
  const key = JSON.stringify(texts);
  useEffect(() => {
    if (!model || !lang) return;
    void prepareSpeechAhead(JSON.parse(key) as string[], lang, owner).catch(
      () => {},
    );
  }, [model, key, lang, owner]);
}
