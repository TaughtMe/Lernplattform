import type { BrowserContext, Page } from "@playwright/test";

/** Schlüssel und Form wie `src/storage/teacher-device.ts`. */
const TEACHER_DEVICE_KEY = "lernraum.lehrer-geraet";

/**
 * Markiert das Gerät als „Mein Gerät“, bevor die Seite lädt. Mit eingeschalteter
 * Vorschau (Bereich `lehrer-geraet`) fragt der Lehrerbereich sonst beim ersten
 * Öffnen nach dem Gerätetyp; Tests, die nicht die Auswahl prüfen, überspringen
 * sie so.
 */
export async function markOwnDevice(target: Page | BrowserContext) {
  await target.addInitScript(
    ([key, type]) => {
      try {
        if (!localStorage.getItem(key)) {
          localStorage.setItem(
            key,
            JSON.stringify({
              v: 1,
              type,
              chosenAt: new Date().toISOString(),
            }),
          );
        }
      } catch {
        // Speicher gesperrt: dann bleibt es bei der Auswahl.
      }
    },
    [TEACHER_DEVICE_KEY, "own"] as const,
  );
}
