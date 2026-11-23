import { readFile } from "node:fs/promises";
import { SYMBOLS } from "../src/speech/model/symbols";
import { expect, test, type Page } from "./fixtures";
import { createBox } from "./wortspeicher-helpers";

/**
 * Vorlesen mit dem Sprachmodell (docs/umsetzungsplan-sprachmodell.md, 5).
 * Ein winziges Test-Modell (e2e/speech-fixtures) gibt die Token-IDs als Audio
 * zurück. So prüft der Test die ganze Kette im Browser: Manifest, Cache mit
 * Prüfsumme, Phonemizer (eSpeak NG), Tokenizer, Stilzeile, ONNX Runtime im
 * Worker und Wiedergabe. Die Gerätestimme hat keine deutsche Stimme.
 */
const fixtures = new URL("./speech-fixtures/", import.meta.url);
const SPEED = 0.9; // SPEECH_RATE × speedPrior 1
const STYLE_ROW = 2; // min(Tokenzahl, 3 − 1); Zeile r summiert sich zu r

async function sha256(bytes: Buffer) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(bytes).digest("hex");
}

async function serveTestModel(page: Page) {
  const manifest = JSON.parse(
    await readFile(
      new URL("../public/speech/manifest.json", import.meta.url),
      "utf8",
    ),
  ) as { languages: Record<string, unknown> };
  const model = await readFile(new URL("model.onnx", fixtures));
  const voices = await readFile(new URL("voices.npz", fixtures));
  manifest.languages = {
    de: {
      espeak: "de",
      model: {
        path: "/speech/test/model.onnx",
        sha256: await sha256(model),
        size: model.length,
      },
      voices: {
        path: "/speech/test/voices.npz",
        sha256: await sha256(voices),
        size: voices.length,
      },
      trimSamples: 0,
      defaultVoice: "test-voice",
      voiceList: [{ id: "test-voice", label: "Test" }],
    },
  };
  await page.route("**/speech/manifest.json", (route) =>
    route.fulfill({ json: manifest }),
  );
  await page.route("**/speech/test/model.onnx", (route) =>
    route.fulfill({ body: model, contentType: "application/octet-stream" }),
  );
  await page.route("**/speech/test/voices.npz", (route) =>
    route.fulfill({ body: voices, contentType: "application/octet-stream" }),
  );
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

function expectedTokens(phonemes: string) {
  const ids = [...phonemes].map((symbol) => SYMBOLS.lastIndexOf(symbol));
  return [0, ...ids, 10, 0];
}

test("Stufe 6 liest mit dem Sprachmodell vor, ohne Gerätestimme", async ({
  page,
}) => {
  test.setTimeout(120_000);
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
  await serveTestModel(page);
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
  const decoded = (played ?? []).map((value) =>
    Math.round((value - STYLE_ROW) / SPEED),
  );
  // „Rad“ → eSpeak „rˈɑːt“, Satzende „,“ (KittenTTS) als eigenes Token.
  expect(decoded).toEqual(expectedTokens("rˈɑːt ,"));
  expect(
    await page.evaluate(
      () => (window as unknown as { __spoken: string[] }).__spoken,
    ),
  ).toEqual([]);
});
