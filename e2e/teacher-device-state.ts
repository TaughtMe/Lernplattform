/**
 * Grundzustand aller Browser-Läufe: Das Gerät ist als „Mein Gerät“ markiert
 * (Schlüssel und Form wie `src/storage/teacher-device.ts`). Mit eingeschalteter
 * Vorschau (Bereich `lehrer-geraet`) fragt der Lehrerbereich sonst beim ersten
 * Öffnen nach dem Gerätetyp. Nur `lehrer-tafelmodus.spec.ts` beginnt leer.
 */
export function ownTeacherDeviceState(origin: string) {
  return {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [
          {
            name: "lernraum.lehrer-geraet",
            value: JSON.stringify({
              v: 1,
              type: "own",
              chosenAt: "2026-01-01T00:00:00.000Z",
            }),
          },
        ],
      },
    ],
  };
}
