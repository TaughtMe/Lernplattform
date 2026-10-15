import { defineConfig, globalIgnores } from "eslint/config";
import eslint from "@eslint/js";
import next from "@next/eslint-plugin-next";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "dist/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
    "docs/design/**",
  ]),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs.flat["recommended-latest"],
  jsxA11y.flatConfigs.recommended,
  next.configs["core-web-vitals"],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    files: ["src/domain/**/*.{ts,tsx}", "src/storage/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*", "react", "react/*", "@/app/*"],
              message:
                "Der fachliche Kern muss framework-unabhängig und außerhalb der Oberfläche testbar bleiben.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["app/views/**/*.{ts,tsx}"],
    ignores: ["app/views/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/components/*",
                "**/src/storage/*",
                "**/src/integrations/*",
                "dexie",
                "@supabase/*",
              ],
              message:
                "Ansichten in app/views sind rein: Daten und Aktionen kommen über Props (umsetzungsplan-lernraum-ui-v2.md).",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
