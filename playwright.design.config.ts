import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env["CI"]);

/**
 * Designvergleich: jede Ansicht unter /entwicklung/screens/<id> gegen das
 * Referenzbild aus der Vorlage (docs/design/referenz/<id>.png). Nur
 * Chromium, weil die Referenzen mit Chromium gerendert sind.
 */
export default defineConfig({
  testDir: "./e2e/design",
  snapshotPathTemplate: "docs/design/referenz/{arg}{ext}",
  workers: 1,
  forbidOnly: isCI,
  reporter: isCI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3000",
    deviceScaleFactor: 1,
    serviceWorkers: "block",
    locale: "de-DE",
    ...(process.env["CHROMIUM_PATH"]
      ? { launchOptions: { executablePath: process.env["CHROMIUM_PATH"] } }
      : {}),
  },
  expect: {
    toHaveScreenshot: { animations: "disabled", caret: "hide" },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
