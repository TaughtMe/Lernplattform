"use client";

import { useEffect, useState } from "react";
import {
  SPEECH_NOTICE_EVENT,
  type SpeechNoticeDetail,
} from "../../src/speech/speaker";

/** So lange bleibt der Hinweis stehen, wenn niemand ihn schließt. */
export const SPEECH_NOTICE_MS = 8000;

/**
 * Hinweis der Sprachausgabe (z. B. „Auf diesem Gerät ist keine deutsche
 * Stimme installiert.“). Die gemeinsame Funktion `speak` meldet ihn, wenn es
 * keine lokale Stimme gibt; so wird keine Taste still stumm.
 */
export function SpeechNoticeHost() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onNotice = (event: Event) => {
      const detail = (event as CustomEvent<SpeechNoticeDetail>).detail;
      if (detail?.message) setMessage(detail.message);
    };
    window.addEventListener(SPEECH_NOTICE_EVENT, onNotice);
    return () => window.removeEventListener(SPEECH_NOTICE_EVENT, onNotice);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), SPEECH_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [message]);

  // Nur mit Hinweis im Baum: Ein dauerhaft leerer Statusbereich auf jeder
  // Seite stünde neben den Statusmeldungen der Übungen.
  if (!message) return null;
  return (
    <div className="ui ui-speech-notice" role="status">
      <p className="ui-speech-notice__text">{message}</p>
      <button
        type="button"
        className="ui-speech-notice__close"
        onClick={() => setMessage(null)}
      >
        OK
      </button>
    </div>
  );
}
