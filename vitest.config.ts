import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "next/link": fileURLToPath(
        new URL("./tests/next-link-stub.tsx", import.meta.url),
      ),
      "next/navigation": fileURLToPath(
        new URL("./tests/next-navigation-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "app/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: [
        "src/domain/**/*.ts",
        "src/storage/**/*.ts",
        "src/speech/**/*.ts",
        "src/integrations/**/*.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "src/integrations/cloud-sync/testing/**",
        // Lädt das Google-Skript und braucht echte Browser-Anmeldung, keine eigene Logik.
        "src/integrations/cloud-sync/google-identity.ts",
        // Erzeugt nur den Supabase-Client mit festen Optionen.
        "src/integrations/laufdiktat/live-room-client.ts",
      ],
      thresholds: {
        branches: 85,
        functions: 90,
        lines: 90,
        statements: 90,
        "src/integrations/**/*.ts": {
          statements: 95,
          branches: 90,
          functions: 93,
          lines: 95,
        },
        // Sicherheitskern: Merge, Umschlag, Uhr, Hash und Verschlüsselung
        "src/integrations/{crypto/**,content-transfer/crypto.ts,cloud-sync/{merge,engine,envelope,hlc,hash,dedupe}.ts}":
          {
            statements: 90,
            branches: 88,
            functions: 95,
            lines: 93,
          },
      },
    },
  },
});
