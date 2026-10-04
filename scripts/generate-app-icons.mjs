/**
 * Erzeugt die App-Icons (PNG) aus einer Quell-SVG.
 *
 * Aufruf: node scripts/generate-app-icons.mjs [quelle.svg] [prefix]
 * Standard: public/favicon.svg, Prefix "icon". Neue Icon-Entwürfe bekommen
 * einen neuen Prefix (z. B. "icon-v2"), weil installierte Apps das alte Icon
 * sonst teils behalten. Danach Dateinamen in public/manifest.webmanifest,
 * app/layout.tsx und scripts/service-worker.template.js anpassen.
 *
 * Erzeugt: <prefix>-180.png, -192.png, -512.png (Motiv mit Rundung) und
 * <prefix>-maskable-512.png (vollflächiger Hintergrund, Motiv in der
 * 80-%-Schutzzone).
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.resolve(root, process.argv[2] ?? "public/favicon.svg");
const prefix = process.argv[3] ?? "icon";
const svg = await readFile(source, "utf8");
const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
// Hintergrund der maskable-Variante (helles Standardthema).
const MASKABLE_BACKGROUND = "#211f1b";

// `CHROMIUM_PATH` erlaubt einen vorinstallierten Browser außerhalb von Playwright.
const browser = await chromium.launch(
  process.env["CHROMIUM_PATH"]
    ? { executablePath: process.env["CHROMIUM_PATH"] }
    : {},
);
const page = await browser.newPage();

async function render(size, html) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;width:${size}px;height:${size}px;background:transparent}</style>${html}`,
  );
  await page.waitForFunction(() =>
    [...document.images].every((image) => image.complete),
  );
  return page.screenshot({ omitBackground: true });
}

for (const size of [180, 192, 512]) {
  const png = await render(
    size,
    `<img src="${dataUrl}" width="${size}" height="${size}">`,
  );
  await writeFile(path.join(root, "public", `${prefix}-${size}.png`), png);
}

const size = 512;
const inner = Math.round(size * 0.8);
const offset = (size - inner) / 2;
const maskable = await render(
  size,
  `<div style="width:${size}px;height:${size}px;background:${MASKABLE_BACKGROUND}"><img src="${dataUrl}" width="${inner}" height="${inner}" style="position:absolute;left:${offset}px;top:${offset}px"></div>`,
);
await writeFile(
  path.join(root, "public", `${prefix}-maskable-512.png`),
  maskable,
);

await browser.close();
