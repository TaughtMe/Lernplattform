import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the Lernraum start page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html[^>]+lang="de"/i);
  assert.match(html, /Lernraum/);
  assert.match(html, /Gemeinsam lernen, im Unterricht und zu Hause/);
  assert.match(html, /Öffentliche Demo/);
  assert.match(html, /Meine LernBox öffnen/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Building your site/i);
});

test("server-renders stable module entry pages", async () => {
  for (const [path, title] of [["/lernen", "Heute lernen"], ["/lernbox", "Meine LernBox"], ["/raum", "Raum beitreten"], ["/lehrer", "Lehrer-Login"]]) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), new RegExp(title), path);
  }
});

test("keeps the versioned learning contract framework-independent", async () => {
  const contract = await readFile(new URL("../src/domain/learning-bundle.ts", import.meta.url), "utf8");
  assert.match(contract, /LEARNING_BUNDLE_VERSION = "1\.0\.0"/);
  assert.match(contract, /interface LearningEventV1/);
  assert.match(contract, /Record<LearningDirection, DirectionProgressV1>/);
  assert.doesNotMatch(contract, /from ["'](?:react|next)/);
});
