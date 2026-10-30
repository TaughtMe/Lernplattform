import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env["CI"]);
const port = 3200;
const baseURL = `http://127.0.0.1:${port}`;

if (!existsSync("dist/server/wrangler.json")) {
  throw new Error(
    "dist/server fehlt: Vor dem Produktionslauf `npm run build` ausführen.",
  );
}

/**
 * Hauptseiten gegen den Produktions-Build (Audit A-006). Anders als die
 * übrigen Konfigurationen läuft hier kein Entwicklungsserver, sondern das
 * gebaute Worker-Artefakt `dist/server` in der lokalen Workers-Laufzeit
 * (`wrangler dev --local`: kein Login, keine Netzressourcen). Es gibt weder
 * Vorschau-Cookie noch `LERNRAUM_VORSCHAU`, und der Service Worker bleibt
 * erlaubt: So sieht die Testseite, was Schüler im Schulbetrieb bekommen.
 *
 * `vinext start` scheitert dafür unter Node an `cloudflare:`-Importen im
 * Bundle (ERR_UNSUPPORTED_ESM_URL_SCHEME); `wrangler dev` kennt sie.
 * Voraussetzung ist `npm run build`.
 */
export default defineConfig({
  testDir: "./e2e/production",
  fullyParallel: true,
  // Alle Projekte teilen einen Server und einen Port; seriell bleibt der Lauf
  // reproduzierbar.
  workers: 1,
  forbidOnly: isCI,
  // Eine Wiederholung liefert in CI nur die Spur (trace) für die Fehlersuche.
  // `failOnFlakyTests` lässt den Lauf trotzdem scheitern: Ein Test, der erst
  // beim zweiten Versuch besteht, ist ein Befund und wird nicht still grün.
  retries: isCI ? 1 : 0,
  failOnFlakyTests: isCI,
  reporter: isCI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Anders als in `playwright.config.ts` bewusst nicht blockiert: Die
    // Registrierung von /sw.js gehört zum Vertrag des Produktions-Builds.
    serviceWorkers: "allow",
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
  },
  webServer: {
    command: `npx wrangler dev --config dist/server/wrangler.json --local --ip 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      WRANGLER_SEND_METRICS: "false",
    },
  },
  projects: [
    { name: "production-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "production-webkit", use: { ...devices["Desktop Safari"] } },
    // Handy-Fenster wie in der Entwicklungs-Suite (`mobile-chrome`,
    // `mobile-safari`): Die Schüler üben meist am Handy, und die Navigation
    // liegt dort in der unteren Leiste bzw. in der Schublade.
    { name: "production-mobile-chrome", use: { ...devices["Pixel 7"] } },
    { name: "production-iphone", use: { ...devices["iPhone 14"] } },
  ],
});
