import { expect, test, type Page } from "@playwright/test";
import { extractPdfTextRuns } from "./pdf-text";

const CLASS_ID = "123e4567-e89b-42d3-a456-426614174001";
const NAMES = [
  "Anton",
  "Berta",
  "Cäsar",
  "Dora",
  "Emil",
  "Fiona",
  "Gustav",
  "Hanna",
  "Ida",
  "Jonas",
  "Klara",
  "Leon",
  "Mia",
  "Nils",
  "Olga",
  "Paul",
  "Quirin",
  "Rosa",
  "Sven",
  "Tilda",
  "Uwe",
  "Vera",
  "Willi",
  "Zoe",
];

/** Legt eine Klasse mit Schülern direkt in der lokalen Lehrerdatenbank an. */
async function seedClass(page: Page, names: readonly string[]) {
  // Die App legt die Datenbank beim ersten Öffnen an.
  await page.goto("/lehrer");
  await page.waitForFunction(async () =>
    (await indexedDB.databases()).some(
      (entry) => entry.name === "lernraum:teacher:v1",
    ),
  );
  await page.evaluate(
    async ({ classId, students }) => {
      const open = () =>
        new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open("lernraum:teacher:v1");
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      // Warten, bis die App ihre Tabellen angelegt hat.
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const probe = await open();
        const ready = probe.objectStoreNames.contains("members");
        probe.close();
        if (ready) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const db = await open();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(["classes", "members"], "readwrite");
        tx.objectStore("classes").put({
          id: classId,
          name: "Klasse 3a",
          teacherName: "Frau Test",
          schoolYear: "2026/27",
          enabledModules: ["vocabulary"],
          createdAt: "2026-08-25T10:00:00.000Z",
          updatedAt: "2026-08-25T10:00:00.000Z",
        });
        students.forEach((displayName, index) => {
          const number = String(index).padStart(2, "0");
          tx.objectStore("members").put({
            id: `123e4567-e89b-42d3-a456-4266141741${number}`,
            classId,
            displayName,
            enrollmentToken: number.repeat(16),
            createdAt: `2026-08-25T10:05:${number}.000Z`,
          });
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { classId: CLASS_ID, students: [...names] },
  );
}

// Befund C-006: Der Lehrerrahmen ist am Bildschirm so hoch wie das Fenster und
// scrollt in sich. Ohne Druckregel kam nur die erste Bildschirmseite auf Papier
// (12 von 24 Codes, dazu die mobile Kopfzeile).
test("der QR-Bogen druckt alle 24 Namen über mehrere Seiten ohne Bedienelemente", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "page.pdf() gibt es nur in Chromium");
  await seedClass(page, NAMES);

  await page.goto(`/lehrer/klassen?klasse=${CLASS_ID}`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "QR-Bogen drucken" }).click();
  await expect(
    page.getByRole("heading", { name: "QR-Bogen für Klasse 3a" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /^Einschreibungs-QR/ }),
  ).toHaveCount(NAMES.length);

  const pdf = await page.pdf({ format: "A4" });
  const pages = extractPdfTextRuns(pdf);
  const printed = pages.flat();

  // Mehr als eine Seite, und jeder Name steht genau einmal im Ausdruck.
  expect(pages.length).toBeGreaterThanOrEqual(2);
  for (const name of NAMES) {
    expect(
      printed.filter((run) => run === name),
      `„${name}“ im PDF`,
    ).toHaveLength(1);
  }
  // Keine Kopfzeile, Leiste oder Schaltfläche: außer den Namen steht nichts da.
  expect(printed.filter((run) => !NAMES.includes(run))).toEqual([]);
  // Keine Seite bleibt leer.
  for (const [index, runs] of pages.entries()) {
    expect(runs.length, `Seite ${index + 1}`).toBeGreaterThan(0);
  }
});
