import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env["CI"]);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Vinext compiles routes on demand. Serial browser runs avoid navigation
  // aborts while several projects request new RSC routes at the same time.
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // The service worker has its own render contract test. Blocking it here
    // keeps browser runs focused on the current development build instead of
    // mixing cached assets into WebKit and Safari test contexts.
    serviceWorkers: "block",
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "desktop-firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "desktop-webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
    { name: "tablet-safari", use: { ...devices["iPad Mini"] } },
    {
      name: "minimum-width",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 320, height: 720 },
      },
    },
  ],
});
