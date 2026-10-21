/**
 * Schutz vor Speicherverlust (Audit B-002): Auf iPad und iPhone hat eine
 * Web-App auf dem Home-Bildschirm einen eigenen Speicher, getrennt vom
 * Browser. Wer im Browser lernt, sieht diesen Lernstand in der App nicht.
 * Hier steht nur die Entscheidung „trotzdem im Browser lernen“; der Lernstand
 * selbst liegt nie im `localStorage`.
 */
export const BROWSER_LEARNING_KEY = "lernraum:install-hint:v1:browser-ok";

type ChoiceStorage = Pick<Storage, "getItem" | "setItem">;

export function readBrowserLearningChoice(
  getStorage: () => ChoiceStorage = () => window.localStorage,
): boolean {
  try {
    return getStorage().getItem(BROWSER_LEARNING_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeBrowserLearningChoice(
  getStorage: () => ChoiceStorage = () => window.localStorage,
): boolean {
  try {
    getStorage().setItem(BROWSER_LEARNING_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

type PersistentStorage = Pick<StorageManager, "persist" | "persisted">;

/**
 * Bittet den Browser still, den Speicher nicht von sich aus zu räumen. Das ist
 * ein billiger Zusatz ohne Erfolgsgarantie: Unter iOS ist unklar, wie es mit der
 * 7-Tage-Regel zusammenwirkt, darum meldet die Oberfläche kein Ergebnis. Firefox
 * (Gecko) fragt dafür mit einem eigenen Dialog nach und wird übersprungen.
 */
export async function requestPersistentStorage(
  env: {
    storage?: PersistentStorage | undefined;
    userAgent?: string | undefined;
  } = typeof navigator === "undefined" ? {} : navigator,
): Promise<void> {
  try {
    const storage = env.storage;
    if (!storage?.persist || /Firefox\//.test(env.userAgent ?? "")) return;
    if (await storage.persisted?.()) return;
    await storage.persist();
  } catch {
    // Ohne Erfolgsversprechen: ein Fehlschlag bleibt unbemerkt.
  }
}
