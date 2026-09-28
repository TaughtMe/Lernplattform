/** Sprachausgabe über die Web Speech API (lokal im Browser, keine Übertragung). */
export function speak(text: string, lang: string): void {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* Sprachausgabe nicht verfügbar */
  }
}
