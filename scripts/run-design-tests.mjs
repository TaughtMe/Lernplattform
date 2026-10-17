/**
 * Designvergleich in zwei Schritten (`npm run test:design`):
 *
 * 1. Die Referenzen werden aus der Vorlage im selben Browser neu gerendert, in
 *    dem anschließend die App läuft. Ablage in einem temporären Verzeichnis,
 *    die eingecheckten PNGs in docs/design/referenz bleiben unverändert.
 * 2. Playwright vergleicht die App gegen diese frischen Bilder.
 *
 * So hängt das Ergebnis nicht vom Chromium-Build ab, mit dem die eingecheckten
 * Bilder entstanden sind, sondern nur von echten Unterschieden zwischen
 * Vorlage und Umsetzung. Weitere Argumente gehen an `playwright test`.
 *
 * `DESIGN_REFERENCE_DIR` (vorgegeben) überspringt das Rendern und nutzt das
 * Verzeichnis unverändert, z. B. um Referenzen mehrfach zu verwenden.
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const run = (command, args, env) =>
  spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  }).status ?? 1;

const given = process.env["DESIGN_REFERENCE_DIR"];
const dir = given ?? (await mkdtemp(path.join(tmpdir(), "design-referenz-")));
let status = 0;
try {
  if (!given) {
    status = run(
      process.execPath,
      ["scripts/render-design-references.mjs", "--implemented"],
      { DESIGN_REFERENCE_DIR: dir },
    );
  }
  if (status === 0) {
    status = run(
      "npx",
      [
        "playwright",
        "test",
        "--config",
        "playwright.design.config.ts",
        ...process.argv.slice(2),
      ],
      { DESIGN_REFERENCE_DIR: dir },
    );
  }
} finally {
  if (!given) await rm(dir, { recursive: true, force: true });
}
process.exit(status);
