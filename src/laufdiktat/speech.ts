export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Reads text aloud via the browser's speech synthesis. A no-op where unsupported (SSR, older browsers). */
export function speak(text: string, lang: string = "de-DE"): void {
  if (!isSpeechSupported() || !text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
