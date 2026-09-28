import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the Lernraum landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html[^>]+lang="de"/i);
  assert.match(html, /Gemeinsam lernen, im Unterricht und zu Hause/);
  assert.match(html, /Raumcode/);
  assert.match(html, /Lehrer-Login/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Building your site/i);
});

test("server-renders all student and teacher entry pages", async () => {
  for (const [path, marker] of [
    ["/start", "Mein Lernraum"], ["/lernen", "Lernen"], ["/lernen/wortspeicher", "Wortspeicher"], ["/tastenwelt", "Tastenwelt"],
    ["/haus", "Mein Haus"], ["/raum", "Raum beitreten"], ["/profil", "Profil"], ["/duell", "Duell"],
    ["/lehrer", "Lehrerbereich"], ["/lehrer/laufdiktat", "Laufdiktat"], ["/lehrer/haus", "Häuser"], ["/lehrer/auswertung", "Auswertung"],
  ]) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), new RegExp(marker), path);
  }
});

test("keeps the versioned learning contract framework-independent", async () => {
  const contract = await readFile(new URL("../src/domain/learning-bundle.ts", import.meta.url), "utf8");
  assert.match(contract, /LEARNING_BUNDLE_VERSION = "1\.0\.0"/);
  assert.match(contract, /interface LearningEventV1/);
  assert.match(contract, /Record<LearningDirection, DirectionProgressV1>/);
  assert.doesNotMatch(contract, /from ["'](?:react|next)/);
  for (const file of ["leitner", "dictation", "typing", "houses", "enrollment"]) {
    assert.doesNotMatch(await readFile(new URL(`../src/domain/${file}.ts`, import.meta.url), "utf8"), /from ["'](?:react|next)/, file);
  }
});

test("ships the Laufdiktat room schema and never syncs personal data", async () => {
  const api = await readFile(new URL("../app/lib/room-api.ts", import.meta.url), "utf8");
  for (const rpc of ["open_room_secure", "join_room_secure", "update_session_secure", "upsert_progress_secure", "get_room_students_secure", "end_room_secure"]) {
    assert.match(api, new RegExp(rpc), rpc);
  }
  const migrations = await readFile(new URL("../supabase/migrations/20260710130000_security_hardening_compat.sql", import.meta.url), "utf8");
  assert.match(migrations, /create or replace function public\.join_room_secure/);
  assert.doesNotMatch(api, /lernraum:personal/);
});
