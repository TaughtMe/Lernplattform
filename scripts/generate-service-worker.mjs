import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
  await readFile(join(projectRoot, "package.json"), "utf8"),
);
const templatePath = join(projectRoot, "scripts", "service-worker.template.js");
const hash = createHash("sha256");
const sourceRoots = ["app", "src", "worker"];
const sourceExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".css",
  ".json",
]);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(path)));
    else if (sourceExtensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

const files = [templatePath, join(projectRoot, "package.json")];
for (const sourceRoot of sourceRoots) {
  files.push(...(await collectFiles(join(projectRoot, sourceRoot))));
}

for (const path of files) {
  hash.update(relative(projectRoot, path));
  hash.update(await readFile(path));
}

const fingerprint = hash.digest("hex").slice(0, 12);
const template = await readFile(templatePath, "utf8");
const serviceWorker = template
  .replaceAll("__APP_VERSION__", packageJson.version)
  .replaceAll("__BUILD_FINGERPRINT__", fingerprint);

await writeFile(join(projectRoot, "public", "sw.js"), serviceWorker);
await writeFile(
  join(projectRoot, "public", "version.json"),
  `${JSON.stringify({ version: packageJson.version, build: fingerprint })}\n`,
);
