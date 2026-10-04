# Umsetzungsplan: Lernraum als installierbare Web-App (PWA)

Stand: 04.10.2026 · Ausgangsstand `claude/lernraum-ui-v2` @ `bbb4702` · vinext `1.0.0-beta.8`

Dieser Plan ist die Arbeitsgrundlage für einen KI-Agenten. Abschnitt 3 enthält die empfohlenen
Entscheidungen; offene Punkte stehen in Abschnitt 7 und werden vor der Umsetzung mit der
projektverantwortlichen Lehrkraft abgestimmt.

## 0. Arbeitsweise

- Eigener Branch, abgezweigt von `claude/lernraum-ui-v2`. Übernahme per Pull Request.
- Regeln: `AGENTS.md`, `docs/engineering-quality.md`, `docs/device-support.md`,
  `docs/architecture.md` („Lernraum wird als eine gemeinsame PWA aufgebaut“).
- Keine neuen Laufzeitabhängigkeiten, keine Datenbankänderung.
- Vor dem Push: `npm run check`, dazu `npx playwright test e2e/platform-quality.spec.ts`
  (Projekte `desktop-chromium` und `mobile-chrome`).

## 1. Befund

Symptom: Unter `https://lernplattform.toby-bryson.workers.dev/` zeigt Chrome in der Adressleiste
kein „App installieren“. Unter `laufdiktat.pages.dev` erscheint es.

Nachgewiesen lokal mit Produktions-Build (`npm run build`, `vinext start`) und Chromium über
CDP `Page.getInstallabilityErrors`:

| Zustand                                                                             | Ergebnis von Chromium       |
| ----------------------------------------------------------------------------------- | --------------------------- |
| Ist-Zustand                                                                         | `no-manifest`               |
| Gleiche Seite, Manifest-Link per Skript in `<head>` verschoben                      | keine Fehler, installierbar |
| Prototyp aus Abschnitt 3.1 auf `/`, `/lernen`, `/lehrer`, `/lernen/faecher/deutsch` | keine Fehler, installierbar |

**Ursache:** Der `<link rel="manifest">` landet im `<body>`, nicht im `<head>`. Chrome wertet
Manifest-Links aber nur im `<head>` aus. Das Manifest selbst ist korrekt und wird ausgeliefert
(`/manifest.webmanifest`, `200`, `application/manifest+json`).

Wie es dazu kommt:

1. `app/layout.tsx` nutzt ein asynchrones `generateMetadata()` mit `headers()`, um
   `metadataBase` aus dem Host zu bilden. Dadurch gelten die Metadaten als dynamisch.
2. vinext streamt dynamische Metadaten in den `<body>` und schiebt sie danach per Inline-Skript
   (`REINSERT_STREAMED_ICONS_SCRIPT` in `vinext/dist/server/app-page-route-wiring.js`) zurück in
   den `<head>`, **aber nur** `icon`- und `apple-touch-icon`-Links. Der Manifest-Link bleibt im
   `<body>`.
3. Dasselbe passiert auf jeder Seite mit eigenem `generateMetadata`, derzeit
   `app/lernen/faecher/[subject]/page.tsx`.

Gegenprobe: Mit statischem `export const metadata` im Layout steht der Manifest-Link im `<head>`.
Für Seiten mit eigenem `generateMetadata` gilt das aber nicht, deshalb reicht diese Variante
allein nicht (siehe 3.1).

Weitere Befunde, die die Installation nicht verhindern, die App aber als „funktionale Web-App“
schwächen:

- **Service Worker nur über den Seitenfuß.** `navigator.serviceWorker.register("/sw.js")` steckt in
  `app/ui/version-button.tsx`. `SiteFooter` rendert auf `/` nichts. Auf der Startseite, der
  `start_url` des Manifests, wird also kein Service Worker registriert. Wer dort installiert und
  offline startet, bekommt keine App-Hülle.
- **Nur ein SVG-Icon.** Desktop-Chrome akzeptiert `favicon.svg` mit `sizes: "any"`. Android erzeugt
  ohne PNG-Icons (192/512, maskable) aber nur ein schlechtes Icon. iOS braucht ein PNG als
  `apple-touch-icon`, sonst erscheint dort ein Screenshot als Icon.
- **Farben passen nicht zusammen.** `theme_color`/`background_color` im Manifest sind `#211f1b`,
  das Layout nutzt `#f6f2e8` (hell) und `#17150f` (dunkel). Ergebnis: ein unpassender Splash-Screen
  und eine unpassende Titelleiste.
- **Ungewollte Metadaten-Route.** `app/entwicklung/screens/manifest.ts` ist eine Hilfsdatei. Wegen
  ihres Namens behandelt vinext sie als Manifest-Route für `/entwicklung/screens`.
- **Kein `id`/`scope`** im Manifest. Wenn sich `start_url` später ändert, gilt die App sonst als
  neue App.

## 2. Ist die Beta-Version schuld?

Teilweise. Das Verhalten ist ein Fehler in vinext (das Zurückschieben vergisst `rel="manifest"`),
und er steckt **auch in der stabilen Version `vinext@1.0.1`** (geprüft im veröffentlichten Paket).
Ein Update löst das Problem also nicht.

Empfehlung:

- **Kein Umbau der Basis.** Next.js-Konventionen, vinext und das Cloudflare-Deployment bleiben.
  Wir lösen den Manifest-Link gezielt aus der Metadaten-Pipeline von vinext heraus (3.1). Dann
  hängt die Installierbarkeit nicht mehr an diesem Framework-Detail. Ein Regressionstest
  sichert das ab.
- **Fehler an vinext melden** (Issue mit minimaler Reproduktion). Ein Patch über `patch-package`
  ist nicht nötig, weil 3.1 den Fehler vollständig umgeht.
- **Update von beta.8 auf 1.0.1 separat** in eigenem PR, mit voller Testsuite. Das ist sinnvoll
  (raus aus der Beta), aber unabhängig von diesem Problem.

Warum `laufdiktat.pages.dev` funktioniert: Die alte App ist sehr wahrscheinlich eine klassische
Vite-SPA mit statischem `index.html`, in dem der Manifest-Link fest im `<head>` steht. Von hier aus
nicht live geprüft, weil der Zugriff aus der Testumgebung gesperrt war.

## 3. Lösung

### 3.1 Manifest-Link fest im `<head>` (Kernfix)

- `app/manifest.ts` entfernen. Inhalt als statische Datei `public/manifest.webmanifest`
  ablegen (Cloudflare liefert sie direkt aus den Assets aus).
- In `app/layout.tsx` im `<head>` direkt `<link rel="manifest" href="/manifest.webmanifest" />`
  rendern, vor dem Theme-Skript.
- Damit gibt es genau einen Manifest-Link, immer im `<head>`, auf jeder Seite, egal ob die
  Seite Metadaten streamt.

Verworfene Alternativen:

- _Nur statische Metadaten im Layout:_ behebt `/`, aber nicht Seiten mit eigenem
  `generateMetadata`. Jede künftige Seite könnte den Fehler wieder einführen.
- _`app/manifest.ts` behalten und zusätzlich einen Link setzen:_ doppelte Links, einer davon
  weiterhin im `<body>`. Unsauber und verwirrend.
- _vinext patchen:_ Wartungslast bei jedem Update; der Fehler gehört upstream.
- _Wechsel auf Next.js mit OpenNext oder auf eine reine SPA:_ großer Umbau ohne Mehrwert für
  dieses Problem.

### 3.2 Manifest vervollständigen

`public/manifest.webmanifest`:

- `id: "/"`, `scope: "/"`, `start_url: "/"` (siehe offene Frage 7.1), `display: "standalone"`,
  `lang: "de"`, `dir: "ltr"`.
- `theme_color`/`background_color` passend zum hellen Standardthema (`#f6f2e8`). Der dunkle Modus
  bleibt über die vorhandenen `theme-color`-Meta-Tags mit `media` abgedeckt.
- Icons: `favicon.svg` (`any`), `icon-192.png`, `icon-512.png` (`purpose: "any"`),
  `icon-maskable-512.png` (`purpose: "maskable"`, Motiv innerhalb der 80-%-Schutzzone).
- Optional für die ausführliche Installationsansicht unter Android und Desktop: `screenshots`
  (je ein Bild `form_factor: "wide"` und `"narrow"`), dazu `description` und `categories:
["education"]`.

### 3.3 App-Icons erzeugen

- Neues Skript `scripts/generate-app-icons.mjs`. Es rendert `public/favicon.svg` mit dem bereits
  vorhandenen Playwright (wie `scripts/render-design-references.mjs`) als PNG in 180, 192 und
  512 px, dazu eine maskable-Variante mit Innenabstand. Keine neue Abhängigkeit.
- Die PNGs werden eingecheckt (`public/icons/`). Das Skript läuft nur bei Icon-Änderungen,
  nicht in jedem Build.

### 3.4 iOS und iPadOS

Safari zeigt nie einen Installieren-Knopf. Der Weg führt dort immer über „Teilen → Zum
Home-Bildschirm“. Damit das Ergebnis eine richtige App ist:

- In den Layout-Metadaten `icons.apple: "/icons/apple-touch-icon.png"` (180 px, ohne
  Transparenz) und `appleWebApp: { capable: true, title: "Lernraum", statusBarStyle: "default" }`.
- Da vinext `apple-touch-icon` korrekt in den `<head>` verschiebt, kann das über die Metadaten
  laufen. Der Regressionstest (3.6) prüft es trotzdem.

### 3.5 Service Worker zentral registrieren

- Neue Client-Komponente `app/ui/service-worker-registration.tsx`, im Root-Layout eingebunden.
  Sie registriert `/sw.js` (`updateViaCache: "none"`) auf jeder Seite, auch auf `/`.
- `VersionButton` registriert nicht mehr selbst, sondern nutzt
  `navigator.serviceWorker.ready`/`getRegistration()` für die Update-Anzeige. Die Update-Logik
  (Intervall, `SKIP_WAITING`, Neuladen bei `controllerchange`) bleibt unverändert.
- `scripts/service-worker.template.js`: `APP_SHELL` um `/manifest.webmanifest` (schon drin) und
  die PNG-Icons ergänzen. Die Offline-Antwort bleibt wie heute.

### 3.6 Aufräumen

- `app/entwicklung/screens/manifest.ts` in `design-screens.ts` umbenennen, Importe anpassen.
- Das Folgeticket „vinext auf 1.0.1“ und den Upstream-Bericht in
  `docs/upstream-integration.md` vermerken.

### 3.7 Optional: eigener Installationshinweis

Nur auf Wunsch (siehe 7.2): ein unaufdringlicher Eintrag in den Einstellungen. Er heißt
„Als App installieren“ und nutzt `beforeinstallprompt` in Chromium; auf iOS zeigt er eine kurze
Anleitung. Für die Grundfunktion ist das nicht nötig, weil der Browser-Knopf nach 3.1 erscheint.

## 4. Tests (Regressionsschutz)

- `tests/rendered-html.test.mjs`, neue Fälle:
  - Das rohe HTML von `/` und `/lernen/faecher/deutsch` enthält genau ein `rel="manifest"`, und
    zwar **vor** `</head>`. Dieser Test hätte den aktuellen Fehler gefunden.
  - `/manifest.webmanifest` liefert `200`, gültiges JSON mit `id`, `start_url`, `display` und
    Icons in 192 und 512 px. Alle Icon-URLs liefern `200`.
- `e2e/platform-quality.spec.ts`, nur Chromium-Projekte:
  - Über CDP `Page.getInstallabilityErrors` gibt es auf `/` keine Fehler. `in-incognito` wird
    ignoriert, weil Playwright-Kontexte als inkognito gelten.
  - Auf `/` ist nach dem Laden ein Service Worker registriert.
- Bestehende Tests zu `VersionButton`/Update-Hinweis müssen grün bleiben.

## 5. Abnahme nach dem Deployment

1. Desktop-Chrome/Edge: Installieren-Symbol in der Adressleiste. DevTools → Application →
   Manifest ohne Warnungen.
2. Android-Chrome: „App installieren“ im Menü, Icon im App-Drawer, Start im Vollbild ohne
   Browserleiste.
3. iPad/iPhone Safari: „Zum Home-Bildschirm“ zeigt das Lernraum-Icon. Der Start erfolgt ohne
   Safari-Leiste.
4. Installierte App offline starten: Die App-Hülle oder der Offline-Hinweis erscheint, keine
   Browser-Fehlerseite.
5. Update-Hinweis über den Versionsknopf funktioniert weiterhin in der installierten App.

Firefox (Desktop) bietet keine PWA-Installation an. Das ist kein Fehler des Lernraums.

## 6. Reihenfolge

1. 3.1 + Render-Test aus 4: behebt das gemeldete Problem allein. Kann als eigener kleiner PR
   zuerst gehen.
2. 3.2–3.4 (Manifest, Icons, iOS).
3. 3.5 (Service Worker zentral) mit E2E-Tests.
4. 3.6, Upstream-Bericht, separater PR für das vinext-Update.
5. Optional 3.7.

## 7. Offene Entscheidungen

1. **Start-Adresse der installierten App:** `/` (Startseite mit Wahl Schüler/Lehrkraft,
   empfohlen) oder direkt `/lernen`?
2. **Eigener Installationshinweis (3.7)** gewünscht oder reicht der Browser-Knopf?
3. **Icon-Motiv:** das vorhandene „L“-Favicon als App-Icon verwenden (empfohlen) oder ein eigenes
   App-Icon gestalten?
