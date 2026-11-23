/**
 * Gewählte Vorlesestimme je Sprache (Einstellungen „Vorlesen“), nur auf diesem
 * Gerät. Die Sprache kommt vom Inhalt (z. B. Deckssprache der LernBox); hier
 * steht nur, welche Stimme in dieser Sprache spricht.
 */
const STORAGE_KEY = "lernraum:vorlesestimme";
const CHANGE_EVENT = "lernraum-vorlesestimme";

export type VoicePreferences = Readonly<Record<string, string>>;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Gelesene Wahl; Unlesbares ergibt keine Wahl (dann gilt die Vorgabe). */
export function readVoicePreferences(): VoicePreferences {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

/** Gewählte Stimme einer Grundsprache (`de`, `en`) oder `null`. */
export function preferredVoice(language: string): string | null {
  return readVoicePreferences()[language] ?? null;
}

/** Speichert die Wahl und meldet sie an offene Einstellungen. */
export function setPreferredVoice(language: string, voice: string): void {
  try {
    storage()?.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...readVoicePreferences(), [language]: voice }),
    );
  } catch {
    // Ohne Speicher gilt die Wahl nur bis zum Neuladen nicht; Vorgabe bleibt.
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

/** Ruft `listener` auf, wenn sich die Wahl ändert (auch in anderen Tabs). */
export function subscribeVoicePreferences(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
