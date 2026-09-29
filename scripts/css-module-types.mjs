/**
 * Erzeugt für jedes CSS-Modul unter app/ eine Typdeklaration
 * (`name.module.css.d.ts`) mit genau den Klassen der Datei. So prüft
 * TypeScript jeden Zugriff wie `styles.header`; Tippfehler fallen auf.
 *
 * Aufruf: node scripts/css-module-types.mjs          (schreiben)
 *         node scripts/css-module-types.mjs --check  (nur prüfen, für CI)
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

async function* modules(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* modules(full);
    else if (entry.name.endsWith(".module.css")) yield full;
  }
}

function classNames(css) {
  const names = new Set();
  postcss.parse(css).walkRules((rule) => {
    if (rule.parent?.type === "atrule" && /keyframes$/.test(rule.parent.name))
      return;
    selectorParser((selectors) => {
      selectors.walkClasses((node) => names.add(node.value));
    }).processSync(rule.selector);
  });
  return [...names].sort();
}

function declaration(names) {
  const lines = names.map((name) =>
    /^[A-Za-z_$][\w$]*$/.test(name)
      ? `  readonly ${name}: string;`
      : `  readonly ${JSON.stringify(name)}: string;`,
  );
  return [
    "// Erzeugt von scripts/css-module-types.mjs – nicht von Hand ändern.",
    "declare const styles: {",
    ...lines,
    "};",
    "export default styles;",
    "",
  ].join("\n");
}

let stale = 0;
for await (const file of modules(path.join(root, "app"))) {
  const target = `${file}.d.ts`;
  const expected = declaration(classNames(await readFile(file, "utf8")));
  const current = await readFile(target, "utf8").catch(() => "");
  if (current === expected) continue;
  if (check) {
    console.error(`Veraltet: ${path.relative(root, target)}`);
    stale += 1;
  } else {
    await writeFile(target, expected);
    console.log(`geschrieben: ${path.relative(root, target)}`);
  }
}
if (stale) {
  console.error("Bitte `npm run css-types` ausführen.");
  process.exit(1);
}
