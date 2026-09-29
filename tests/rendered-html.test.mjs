import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Die Renderprüfungen laufen standardmäßig mit eingeschalteter Vorschau
// (Cookie). Der Freigabetest prüft den Schulbetrieb ohne Vorschau.
const PREVIEW = "lernraum-vorschau=1";

// Aus package.json gelesen statt hart codiert: verhindert, dass diese Tests
// bei jedem Versions-Bump erneut manuell nachgezogen werden müssen.
const { version: APP_VERSION } = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

async function render(path = "/", cookie = PREVIEW) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html", ...(cookie ? { cookie } : {}) },
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
  assert.match(html, /Bereit für dein Laufdiktat/);
  assert.match(html, /Raumcode/);
  assert.match(html, /Lehrerbereich/);
  assert.match(html, /Lernraum starten/);
  // Design 2a: ein Tier, ein Code, sonst nichts.
  assert.match(html, /Dein Tier/);
  assert.match(html, /Nach der vierten Ziffer geht es los/);
  assert.doesNotMatch(html, /Frei üben/);
  assert.doesNotMatch(html, /Raum beitreten/);
  assert.match(html, /href="\/impressum"/);
  assert.match(html, /href="\/datenschutz"/);
  assert.match(html, new RegExp(`>v${APP_VERSION.replace(/\./g, "\\.")}<`));
  assert.doesNotMatch(html, /<strong>Freies Üben<\/strong>/);
  assert.doesNotMatch(html, /Beispiel-Lerngruppen|Duell|Mein Haus/);
  assert.doesNotMatch(
    html,
    /codex-preview|react-loading-skeleton|Building your site/i,
  );
});

test("server-renders the released pilot entry pages", async () => {
  for (const [path, title] of [
    ["/raum", "Raum beitreten"],
    ["/frei/mathematics", "Kopfrechnen"],
    ["/lehrer/live", "Laufdiktat Lehrerdashboard"],
    ["/impressum", "Angaben gemäß"],
    ["/datenschutz", "Persönliche Lernstände"],
  ]) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), new RegExp(title), path);
  }
});

test("server-renders the complete learning and teacher workspaces", async () => {
  for (const [path, title] of [
    ["/lernen", "Meine Startseite"],
    ["/lernen/material", "Lernwerkstatt"],
    ["/frei/german/lernwoerter", "Lernwörter"],
    ["/klasse/7b", "Klasse 7b"],
    ["/lernbox", "LernBox"],
    ["/lehrer", "Übersicht"],
    ["/lehrer/klassen", "Klassen und Schüler"],
    ["/lehrer/material", "Material"],
    ["/lehrer/aufgaben", "Aufgaben"],
    ["/lehrer/einstellungen", "Einstellungen"],
    ["/haus", "Mein Haus"],
    ["/lehrer/haeuser", "Häuser"],
  ]) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), new RegExp(title), path);
  }
});

test("shows only released areas without preview and redirects the rest", async () => {
  const releasedRoutes = [
    "/",
    "/raum",
    "/frei/mathematics",
    "/lehrer/live",
    "/datenschutz",
    "/impressum",
  ];
  const previewRoutes = [
    "/frei",
    "/frei/german",
    "/frei/german/laufdiktat",
    "/frei/german/lernwoerter",
    "/frei/typing",
    "/frei/vocabulary",
    "/haus",
    "/klasse/7b",
    "/klasse/7b/aufgaben/vokabeln",
    "/lernbox",
    "/lernen",
    "/lernen/aufgaben",
    "/lernen/einstellungen",
    "/lernen/faecher/deutsch",
    "/lernen/fortschritt",
    "/lernen/klasse",
    "/lernen/material",
    "/lehrer",
    "/lehrer/aufgaben",
    "/lehrer/einstellungen",
    "/lehrer/klassen",
    "/lehrer/material",
    "/lehrer/haeuser",
  ];
  const offRoutes = ["/demo/mathematics", "/duell"];

  for (const path of releasedRoutes) {
    const response = await render(path, null);
    assert.equal(response.status, 200, path);
    if (path === "/") {
      const html = await response.text();
      assert.doesNotMatch(html, /href="\/lernen/);
    }
  }

  for (const path of [...previewRoutes, ...offRoutes]) {
    const response = await render(path, null);
    assert.equal(response.status, 307, path);
    const location = new URL(
      response.headers.get("location") ?? "",
      "http://localhost",
    );
    assert.equal(
      location.pathname,
      path.startsWith("/lehrer") ? "/lehrer/live" : "/",
      path,
    );
    assert.equal(location.search, "", path);
  }

  for (const path of offRoutes) {
    const response = await render(path);
    assert.equal(
      response.status,
      307,
      `${path} bleibt auch in der Vorschau aus`,
    );
  }

  const enable = await render("/lernbox?vorschau=an", null);
  assert.equal(enable.status, 307);
  assert.match(enable.headers.get("set-cookie") ?? "", /lernraum-vorschau=1/);
  assert.equal(
    new URL(enable.headers.get("location") ?? "", "http://localhost").search,
    "",
  );
});

test("ships the update-aware service worker", async () => {
  const [worker, version] = await Promise.all([
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../public/version.json", import.meta.url), "utf8"),
  ]);
  const escapedVersion = APP_VERSION.replace(/\./g, "\\.");
  assert.match(worker, new RegExp(`const APP_VERSION = "${escapedVersion}"`));
  assert.match(worker, /SKIP_WAITING/);
  assert.match(worker, /request\.mode === "navigate"/);
  assert.match(
    worker,
    /const CACHE_NAME = `lernraum-\$\{APP_VERSION\}-\$\{BUILD_FINGERPRINT\}`/,
  );
  assert.match(
    worker,
    /name\.startsWith\("lernraum-"\) && name !== CACHE_NAME/,
  );
  assert.match(
    worker,
    /if \(response\.ok\) await cache\.put\(request, response\.clone\(\)\)/,
  );
  assert.deepEqual(JSON.parse(version).version, APP_VERSION);
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
  const [header, studentHeader, layout, styles, strategy] = await Promise.all([
    readFile(
      new URL("../app/components/app-header.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/components/student-header.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../docs/device-support.md", import.meta.url), "utf8"),
  ]);
  assert.match(header, /student-header/);
  assert.match(studentHeader, /student-dashboard__mobile-nav/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /body\s*{[^}]*min-width:\s*0/s);
  assert.match(styles, /@media\s*\(max-width:\s*370px\)/);
  assert.match(styles, /pointer:\s*coarse/);
  assert.match(strategy, /iOS Safari/);
  assert.match(strategy, /Android Chrome/);
});
