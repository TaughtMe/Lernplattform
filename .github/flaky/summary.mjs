// Vorübergehend: zählt Fehlschläge je Test aus dem JSON-Bericht.
import { readFileSync, existsSync } from "node:fs";
const file = process.argv[2];
if (!existsSync(file)) {
  console.log(`${file}: kein Bericht`);
  process.exit(0);
}
const report = JSON.parse(readFileSync(file, "utf8"));
const rows = new Map();
const walk = (suite) => {
  for (const spec of suite.specs ?? [])
    for (const test of spec.tests ?? []) {
      const key = `${test.projectName} | ${spec.file}:${spec.line} | ${spec.title}`;
      const row = rows.get(key) ?? { pass: 0, fail: 0, errors: new Set() };
      for (const result of test.results ?? []) {
        if (result.status === "passed") row.pass++;
        else {
          row.fail++;
          const plain = (result.error?.message ?? result.status).replace(
            /\u001b\[[0-9;]*m/g,
            "",
          );
          const lines = plain
            .split("\n")
            .filter((l) => /^(Error|Locator|\s*- waiting for)/.test(l.trim()))
            .slice(0, 3)
            .join(" / ");
          row.errors.add(
            `Zeile ${result.error?.location?.line}: ${lines}`.slice(0, 400),
          );
        }
      }
      rows.set(key, row);
    }
  for (const child of suite.suites ?? []) walk(child);
};
for (const suite of report.suites ?? []) walk(suite);
for (const [key, row] of rows)
  console.log(`FLAKY-RESULT ${key}: ${row.fail} von ${row.pass + row.fail} fehlgeschlagen`, [...row.errors]);
