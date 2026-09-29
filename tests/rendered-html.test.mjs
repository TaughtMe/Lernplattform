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
  assert.match(html, /Raumcode/);
  assert.match(html, /Raumcode Zeichen 4/);
  // Design 2a: ein Tier, ein Code, sonst nichts.
  assert.match(html, /Lehrer-Login/);
  assert.match(html, /Tippen öffnet deinen Lernraum/);
  assert.match(html, /href="\/lernen"/);
  assert.doesNotMatch(html, /Frei üben/);
  assert.doesNotMatch(html, /Raum beitreten/);
  assert.match(html, /href="\/impressum"/);
  assert.match(html, /href="\/datenschutz"/);
  // Vollbild-Screen: kein Seitenfuß, die Version steht auf den übrigen Seiten.
  assert.doesNotMatch(html, /class="ui ui-footer"/);
  assert.doesNotMatch(html, /<strong>Freies Üben<\/strong>/);
  assert.doesNotMatch(html, /Beispiel-Lerngruppen|Duell|Mein Haus/);
  assert.doesNotMatch(
    html,
    /codex-preview|react-loading-skeleton|Building your site/i,
  );
});

test("shows the app version in the footer of regular pages", async () => {
  const html = await (await render("/impressum")).text();
  assert.match(html, /class="ui ui-footer"/);
  assert.match(html, new RegExp(`>v${APP_VERSION.replace(/\./g, "\\.")}<`));
});

test("server-renders the released pilot entry pages", async () => {
  for (const [path, title] of [
    ["/raum", "Raum beitreten"],
    ["/frei/mathematics", "Kopfrechnen"],
    ["/lehrer/live", "Wortliste vorbereiten"],
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
  ]) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), new RegExp(title), path);
  }
});

test("server-renders the houses once motivation is switched on", async () => {
  process.env["LERNRAUM_FREIGABE"] = "motivation=vorschau";
  try {
    for (const [path, title] of [
      ["/haus", "Mein Haus"],
      ["/lehrer/haeuser", "Häuser"],
    ]) {
      const response = await render(path);
      assert.equal(response.status, 200, path);
      assert.match(await response.text(), new RegExp(title), path);
    }
  } finally {
    delete process.env["LERNRAUM_FREIGABE"];
  }
});

test("shows only released areas without preview and redirects the rest", async () => {
  // Entscheidung 48: Lernbereiche und Lehrerbereich sind frei.
  const releasedRoutes = [
    "/",
    "/raum",
    "/frei/mathematics",
    "/lehrer/live",
    "/datenschutz",
    "/impressum",
    "/frei/german/laufdiktat",
    "/frei/german/lernwoerter",
    "/frei/typing",
    "/klasse/7b",
    "/lernbox",
    "/lernen",
    "/lernen/einstellungen",
    "/lehrer",
    "/lehrer/klassen",
  ];
  // Motivation ist nach Entscheidung 47 im Schulbetrieb zunächst aus.
  const offRoutes = ["/demo/mathematics", "/duell", "/haus", "/lehrer/haeuser"];

  for (const path of releasedRoutes) {
    const response = await render(path, null);
    assert.equal(response.status, 200, path);
    if (path === "/") {
      // Das Tier auf der Startseite führt in den eigenen Lernraum.
      assert.match(await response.text(), /href="\/lernen"/);
    }
  }

  for (const path of offRoutes) {
    for (const cookie of [null, undefined]) {
      const response = await render(path, cookie);
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
    }
  }

  // Bereiche in der Vorschau erscheinen nur mit Vorschau-Cookie.
  process.env["LERNRAUM_FREIGABE"] = "lernbox=vorschau";
  try {
    assert.equal((await render("/lernbox", null)).status, 307);
    assert.equal((await render("/lernbox")).status, 200);
    const enable = await render("/lernbox?vorschau=an", null);
    assert.equal(enable.status, 307);
    assert.match(enable.headers.get("set-cookie") ?? "", /lernraum-vorschau=1/);
    assert.equal(
      new URL(enable.headers.get("location") ?? "", "http://localhost").search,
      "",
    );
  } finally {
    delete process.env["LERNRAUM_FREIGABE"];
  }
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
  const [shell, layout, styles, uiStyles, strategy] = await Promise.all([
    readFile(
      new URL("../app/ui/shell/student-shell.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ui/base.css", import.meta.url), "utf8"),
    readFile(new URL("../app/ui/lernraum-ui.css", import.meta.url), "utf8"),
    readFile(new URL("../docs/device-support.md", import.meta.url), "utf8"),
  ]);
  assert.match(shell, /ui-shell__tabbar/);
  assert.match(
    uiStyles,
    /\.ui-shell__tabbar\s*{[^}]*env\(safe-area-inset-bottom\)/s,
  );
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.match(styles, /body\s*{[^}]*min-width:\s*0/s);
  assert.match(styles, /@media\s*\(max-width:\s*370px\)/);
  assert.match(styles, /pointer:\s*coarse/);
  assert.match(strategy, /iOS Safari/);
  assert.match(strategy, /Android Chrome/);
});
