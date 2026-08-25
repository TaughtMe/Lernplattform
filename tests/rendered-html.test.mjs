import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Lernraum start page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html[^>]+lang="de"/i);
  assert.match(html, /Lernraum/);
  assert.match(html, /Wie möchtest du heute lernen/);
  assert.match(html, /Mein Lernraum/);
  assert.match(html, /href="\/impressum"/);
  assert.match(html, /href="\/datenschutz"/);
  assert.match(html, />v0\.2\.0</);
  assert.doesNotMatch(html, /<strong>Freies Üben<\/strong>/);
  assert.doesNotMatch(html, /Beispiel-Lerngruppen|Duell|Mein Haus/);
  assert.doesNotMatch(
    html,
    /codex-preview|react-loading-skeleton|Building your site/i,
  );
});

test("server-renders stable module entry pages", async () => {
  for (const [path, title] of [
    ["/lernen", "Heute üben"],
    ["/lernen/faecher/deutsch", "Fach in deinem Lernraum"],
    ["/lernen/faecher/vokabeln", "Vokabeln"],
    ["/frei/german/lernwoerter", "Vom Ansehen zum sicheren Abruf"],
    ["/frei/typing", "Schritt für Schritt sicher tippen"],
    ["/klasse/7b", "Inhalte aus dieser Klasse"],
    ["/lernbox", "Meine LernBox"],
    ["/raum", "Raum beitreten"],
    ["/lehrer", "Klassenverwaltung"],
    ["/impressum", "Angaben gemäß"],
    ["/datenschutz", "Persönliche Lernstände"],
  ]) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), new RegExp(title), path);
  }
});

test("ships the update-aware service worker", async () => {
  const [worker, version] = await Promise.all([
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../public/version.json", import.meta.url), "utf8"),
  ]);
  assert.match(worker, /const APP_VERSION = "0\.2\.0"/);
  assert.match(worker, /SKIP_WAITING/);
  assert.match(worker, /request\.mode === "navigate"/);
  assert.deepEqual(JSON.parse(version).version, "0.2.0");
});

test("keeps the versioned learning contract framework-independent", async () => {
  const contract = await readFile(
    new URL("../src/domain/learning-bundle.ts", import.meta.url),
    "utf8",
  );
  assert.match(contract, /LEARNING_BUNDLE_VERSION = "1\.0\.0"/);
  assert.match(contract, /learningEventV1Schema = z/);
  assert.match(contract, /type LearningEventV1 = z\.infer/);
  assert.match(contract, /learningProgressV1Schema/);
  assert.match(contract, /learningBundleV1Schema\.safeParse/);
  assert.doesNotMatch(contract, /from ["'](?:react|next)/);
});

test("keeps mobile and tablet support in the platform shell", async () => {
  const [header, layout, styles, strategy] = await Promise.all([
    readFile(
      new URL("../app/components/app-header.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../docs/device-support.md", import.meta.url), "utf8"),
  ]);
  assert.match(header, /mobile-navigation/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /body\s*{[^}]*min-width:\s*0/s);
  assert.match(styles, /@media\s*\(max-width:\s*370px\)/);
  assert.match(styles, /pointer:\s*coarse/);
  assert.match(strategy, /iOS Safari/);
  assert.match(strategy, /Android Chrome/);
});
