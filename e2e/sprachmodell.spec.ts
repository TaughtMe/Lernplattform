import { analyzeAccessibility } from "./accessibility-helpers";
import { expect, test, type Page } from "./fixtures";
import { createBox } from "./wortspeicher-helpers";

/**
 * Vorlesen mit dem Sprachmodell (docs/umsetzungsplan-sprachmodell.md, 5) mit
 * dem echten KittenTTS 2 Nano aus public/speech/kitten2. Geprüft wird die
 * ganze Kette im Browser: Manifest, Cache mit Prüfsumme, eSpeak NG,
 * Frontend, ONNX Runtime im Worker und Wiedergabe. Die Gerätestimme hat keine
 * deutsche Stimme. Das Modell rauscht (RandomNormalLike), die Länge ist aber
 * fest: „Rad“ mit Anna und Tempo 0,9 ergibt 34 800 Samples, gemessen mit der
 * Original-Pipeline (Python, ONNX Runtime, kittenml `_chunk`).
 */
const EXPECTED_SAMPLES = 34_800;

async function expectAccessible(page: Page) {
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
}

/** Gerätestimme ohne Stimmen; Wiedergabe des Modells wird mitgeschrieben. */
async function recordSpeech(page: Page) {
  await page.addInitScript(() => {
    const scope = window as unknown as {
      __spoken: string[];
      __played: number[][];
    };
    scope.__spoken = [];
    scope.__played = [];
    class FakeUtterance {
      text: string;
      lang = "";
      voice: unknown = null;
      rate = 1;
      volume = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: FakeUtterance,
      configurable: true,
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        speaking: false,
        pending: false,
        getVoices: () => [],
        addEventListener() {},
        removeEventListener() {},
        cancel() {},
        speak(utterance: FakeUtterance) {
          scope.__spoken.push(utterance.text);
        },
      },
    });
    const copy = AudioBuffer.prototype.copyToChannel;
    AudioBuffer.prototype.copyToChannel = function (source, channel, start) {
      scope.__played.push(Array.from(source));
      return copy.call(this, source, channel, start);
    };
  });
}

test("Stufe 6 liest mit dem Sprachmodell vor, ohne Gerätestimme", async ({
  page,
}) => {
  test.setTimeout(180_000);
  // Fehler aus Seite und Worker erscheinen in der Meldung, falls nichts spielt.
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("worker", (worker) =>
    worker.on("console", (message) =>
      problems.push(`worker ${message.type()}: ${message.text()}`),
    ),
  );
  await recordSpeech(page);
  await createBox(page, "Modellbox", ["Rad"]);

  await page.getByRole("button", { name: /^Modellbox/ }).click();
  const sheet = page.getByRole("dialog", { name: "Modellbox" });
  const stageSix = sheet.getByRole("button", { name: /^Stufe 6:/ });
  // Ohne deutsche Gerätestimme gibt es Stufe 6 nur durch das Modell.
  await expect(stageSix).toBeEnabled({ timeout: 15_000 });
  await stageSix.click();
  await sheet.getByLabel("Wörter in dieser Runde").selectOption("all");
  await sheet.getByRole("button", { name: "Starten" }).click();
  await expect(page.getByRole("button", { name: "Anhören" })).toBeVisible({
    timeout: 60_000,
  });

  try {
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (window as unknown as { __played: number[][] }).__played.length,
          ),
        { timeout: 30_000 },
      )
      .toBeGreaterThan(0);
  } catch (error) {
    throw new Error(
      `Kein Modell-Audio abgespielt.\n${problems.join("\n")}\n${String(error)}`,
    );
  }
  const [played] = await page.evaluate(
    () => (window as unknown as { __played: number[][] }).__played,
  );
  expect(played).toHaveLength(EXPECTED_SAMPLES);
  const rms = Math.sqrt(
    (played ?? []).reduce((sum, value) => sum + value * value, 0) /
      Math.max(1, played?.length ?? 1),
  );
  // Hörbarer Ton, keine Stille.
  expect(rms).toBeGreaterThan(0.03);
  expect(
    await page.evaluate(
      () => (window as unknown as { __spoken: string[] }).__spoken,
    ),
  ).toEqual([]);
});

test("Einstellungen: Stimme wählen, Englisch installieren, Probe hören", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await recordSpeech(page);
  await page.goto("/lernen/einstellungen");
  const card = page.locator("section", {
    has: page.getByRole("heading", { name: "Vorlesen" }),
  });
  await expect(card.getByLabel("Stimme für Englisch")).toBeVisible({
    timeout: 30_000,
  });
  await card.getByLabel("Stimme für Englisch").selectOption("max");
  await card.getByRole("button", { name: "Englisch installieren" }).click();
  await expect(
    card.getByRole("button", { name: "Englisch vom Gerät entfernen" }),
  ).toBeVisible({ timeout: 120_000 });
  expect(
    await page.evaluate(() => localStorage.getItem("lernraum:vorlesestimme")),
  ).toBe('{"en":"max"}');

  await card.getByRole("button", { name: "Probe hören: Englisch" }).click();
  await expect
    .poll(
      () =>
        page.evaluate(
          () => (window as unknown as { __played: number[][] }).__played.length,
        ),
      { timeout: 60_000 },
    )
    .toBeGreaterThan(0);
  await expectAccessible(page);

  // Entfernen und wieder installieren legt die Dateien erneut in den Cache.
  await card
    .getByRole("button", { name: "Englisch vom Gerät entfernen" })
    .click();
  await card.getByRole("button", { name: "Englisch installieren" }).click();
  await expect(
    card.getByRole("button", { name: "Englisch vom Gerät entfernen" }),
  ).toBeVisible({ timeout: 120_000 });
  expect(
    await page.evaluate(async () => {
      const cache = await caches.open("sprachmodell-v1");
      return (await cache.keys()).some((request) =>
        request.url.includes("/speech/kitten2/en/model.onnx"),
      );
    }),
  ).toBe(true);

  // Lernraum-Stimme je Gerät abschalten: Stimmenwahl verschwindet.
  await card
    .getByRole("checkbox", { name: "Lernraum-Stimme verwenden" })
    .uncheck();
  await expect(card.getByLabel("Stimme für Englisch")).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("lernraum:vorlesen-modell")),
  ).toBe("0");
});
