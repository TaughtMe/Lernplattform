import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env["CI"]);

/**
 * Designvergleich: jede Ansicht unter /entwicklung/screens/<id> gegen das
 * Referenzbild aus der Vorlage. Nur Chromium, weil die Referenzen mit
 * Chromium gerendert sind.
 *
 * `npm run test:design` rendert die Referenzen vorher im selben Browser in ein
 * temporäres Verzeichnis (`DESIGN_REFERENCE_DIR`, scripts/run-design-tests.mjs).
 * Ohne diese Variable gelten die eingecheckten Bilder in docs/design/referenz;
 * sie hängen vom Chromium-Build ab, mit dem sie erzeugt wurden.
 */
const referenceDir =
  process.env["DESIGN_REFERENCE_DIR"] ?? "docs/design/referenz";

export default defineConfig({
  testDir: "./e2e/design",
  snapshotPathTemplate: `${referenceDir}/{arg}{ext}`,
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
