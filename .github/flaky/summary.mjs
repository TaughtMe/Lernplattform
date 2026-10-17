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
          row.errors.add(
            (result.error?.message ?? result.status).split("\n")[0].slice(0, 200),
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
