"use client";

import { useSyncExternalStore } from "react";
import {
  isModelSpeechEnabled,
  subscribeVoicePreferences,
} from "../../src/speech/model/voice-preferences";
import { useAreaVisible } from "../release/release-context";

/**
 * Liest die Lernraum-Stimme (KittenTTS) vor? Freigabe `sprachmodell` und der
 * Schalter in den Einstellungen „Vorlesen“ (je Gerät, Vorgabe an).
 */
export function useModelSpeech(): boolean {
  const released = useAreaVisible("sprachmodell");
  const enabled = useSyncExternalStore(
    subscribeVoicePreferences,
    isModelSpeechEnabled,
    () => true,
  );
  return released && enabled;
}
