"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  hasLocalVoiceFor,
  preloadVoices,
  speak,
  stopSpeaking,
} from "../../src/speech/speaker";
import { Icon } from "./icons";
import { Button } from "./primitives";

/**
 * Knopf „Vorlesen“ für Anleitungen (Audit C-007): Kinder, die noch nicht
 * flüssig lesen, hören den Text. Es spricht nur eine Stimme, die auf dem Gerät
 * läuft (B-012); gibt es keine, bleibt der Knopf weg und die Seite sieht aus
 * wie vorher. Ein zweiter Klick beendet das Vorlesen.
 */
export function ReadAloudButton({
  text,
  lang = "de-DE",
  label = "Anleitung vorlesen",
  className,
}: {
  /** Der Text, der gesprochen wird; derselbe, den das Kind liest. */
  text: string;
  lang?: string;
  /** Name für Screenreader; enthält das sichtbare Wort „Vorlesen“. */
  label?: string;
  className?: string;
}) {
  const [hasVoice, setHasVoice] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  /** Nummer des laufenden Vorlesens, 0 wenn keines läuft. */
  const active = useRef(0);
  const counter = useRef(0);

  useEffect(() => {
    let alive = true;
    const check = () => {
      if (alive) setHasVoice(hasLocalVoiceFor(lang));
    };
    void preloadVoices().then(check);
    // Eine Stimme, die erst später geladen wird, schaltet den Knopf frei.
    const synth =
      typeof window === "undefined" ? undefined : window.speechSynthesis;
    synth?.addEventListener?.("voiceschanged", check);
    return () => {
      alive = false;
      synth?.removeEventListener?.("voiceschanged", check);
    };
  }, [lang]);

  // Wer die Seite verlässt, während der Knopf spricht, stoppt die Ausgabe.
  useEffect(
    () => () => {
      if (active.current !== 0) stopSpeaking();
    },
    [],
  );

  const toggle = useCallback(async () => {
    if (speaking) {
      active.current = 0;
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const mine = ++counter.current;
    active.current = mine;
    setSpeaking(true);
    try {
      await speak(text, lang, { localOnly: true });
    } finally {
      if (active.current === mine) {
        active.current = 0;
        setSpeaking(false);
      }
    }
  }, [lang, speaking, text]);

  if (!hasVoice) return null;

  return (
    <Button
      variant="soft"
      size="sm"
      className={className}
      aria-label={speaking ? "Stopp, Vorlesen beenden" : label}
      onClick={() => void toggle()}
    >
      <Icon name="speaker" size={16} />
      {speaking ? "Stopp" : "Vorlesen"}
    </Button>
  );
}
