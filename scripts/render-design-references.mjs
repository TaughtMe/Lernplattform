/**
 * Rendert die Referenzbilder aus der Design-Vorlage `docs/design/lernraum-ui.dc.html`.
 *
 * Jeder Eintrag in `docs/design/screens.json` beschreibt einen Screen-Zustand:
 * welche Schaltflächen im Canvas vorher geklickt werden und welche Größe die
 * Fläche hat. Das Bild zeigt nur die Innenfläche der Design-Karte, damit die
 * Umsetzung unter `/entwicklung/screens/<id>` pixelgenau verglichen werden kann.
 *
 * Schriften kommen aus `@fontsource-variable/*` statt von Google Fonts, damit
 * Referenz und App dieselben Dateien nutzen. React und Babel lädt die Vorlage
 * von unpkg.com; ohne Netz kann `DESIGN_UMD_DIR` auf entpackte npm-Pakete
 * zeigen (`react-18.3.1/package`, `react-dom-18.3.1/package`,
 * `babel-standalone-7.29.0/package`).
 *
 * Aufruf: node scripts/render-design-references.mjs [id,id,...] [--update-sizes]
 * `--update-sizes` übernimmt abweichende Flächenmaße ins Manifest (nur für
 * neue Einträge gedacht; bestehende Maße sind Teil des Vertrags).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const designDir = path.join(root, "docs/design");
const outDir = path.join(designDir, "referenz");
const fontDir = path.join(root, "node_modules/@fontsource-variable");
const args = process.argv.slice(2);
const updateSizes = args.includes("--update-sizes");
const only = args.find((arg) => !arg.startsWith("--"))?.split(",");

const manifestPath = path.join(designDir, "screens.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const { screens } = manifest;

const fonts = {
  "work-sans.woff2": `${fontDir}/work-sans/files/work-sans-latin-wght-normal.woff2`,
  "work-sans-italic.woff2": `${fontDir}/work-sans/files/work-sans-latin-wght-italic.woff2`,
  "fredoka.woff2": `${fontDir}/fredoka/files/fredoka-latin-wght-normal.woff2`,
};
const fontCss = `
@font-face{font-family:"Work Sans";font-weight:300 800;font-display:block;src:url(https://fonts.gstatic.com/local/work-sans.woff2) format("woff2")}
@font-face{font-family:"Work Sans";font-style:italic;font-weight:400;font-display:block;src:url(https://fonts.gstatic.com/local/work-sans-italic.woff2) format("woff2")}
@font-face{font-family:"Fredoka";font-weight:300 700;font-display:block;src:url(https://fonts.gstatic.com/local/fredoka.woff2) format("woff2")}`;

const umdDir = process.env["DESIGN_UMD_DIR"];
const umd = umdDir && {
  "react@18.3.1/umd/react.production.min.js": `${umdDir}/react-18.3.1/package/umd/react.production.min.js`,
  "react-dom@18.3.1/umd/react-dom.production.min.js": `${umdDir}/react-dom-18.3.1/package/umd/react-dom.production.min.js`,
  "@babel/standalone@7.29.0/babel.min.js": `${umdDir}/babel-standalone-7.29.0/package/babel.min.js`,
};

// `CHROMIUM_PATH` erlaubt einen vorinstallierten Browser außerhalb von Playwright.
const browser = await chromium.launch(
  process.env["CHROMIUM_PATH"]
    ? { executablePath: process.env["CHROMIUM_PATH"] }
    : {},
);
const context = await browser.newContext({
  viewport: { width: 1700, height: 1000 },
  deviceScaleFactor: 1,
});
if (umd) {
  await context.route("https://unpkg.com/**", (route) => {
    const key = Object.keys(umd).find((k) => route.request().url().includes(k));
    return key
      ? route.fulfill({ path: umd[key], contentType: "application/javascript" })
      : route.abort();
  });
}
await context.route("https://fonts.googleapis.com/**", (route) =>
  route.fulfill({ body: fontCss, contentType: "text/css" }),
);
await context.route("https://fonts.gstatic.com/**", (route) => {
  const file = fonts[route.request().url().split("/").pop() ?? ""];
  return file
    ? route.fulfill({ path: file, contentType: "font/woff2" })
    : route.abort();
});

const page = await context.newPage();
page.on("pageerror", (error) => console.error("Vorlage:", error.message));
await page.goto(`file://${designDir}/lernraum-ui.dc.html`);
await page.locator(".dv-opt").first().waitFor({ timeout: 60_000 });
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({
  content:
    "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
});

await mkdir(outDir, { recursive: true });
for (const screen of screens) {
  if (only && !only.includes(screen.id)) continue;
  for (const selector of screen.canvas ?? []) await page.click(selector);
  await page.mouse.move(0, 0);
  const surface = page
    .locator(`[id="${screen.screen}"] .dv-card > div`)
    .first();
  const box = await surface.boundingBox();
  if (!box) throw new Error(`${screen.id}: Fläche nicht gefunden`);
  const width = Math.round(box.width);
  const height = Math.round(box.height);
  if (width !== screen.width || height !== screen.height) {
    const message = `${screen.id}: Fläche ${width}×${height}, erwartet ${screen.width}×${screen.height}`;
    if (!updateSizes) throw new Error(message);
    console.log(`${message} → übernommen`);
    Object.assign(screen, { width, height });
  }
  // Exakter Ausschnitt: Karten liegen im Canvas teils auf halben Pixeln.
  await surface.scrollIntoViewIfNeeded();
  const { x, y } = (await surface.boundingBox()) ?? box;
  await page.screenshot({
    path: path.join(outDir, `${screen.id}.png`),
    clip: {
      x: Math.round(x),
      y: Math.round(y),
      width: screen.width,
      height: screen.height,
    },
  });
  for (const selector of screen.reset ?? []) await page.click(selector);
  console.log(`${screen.id} ✓`);
}
await browser.close();
if (updateSizes) {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
