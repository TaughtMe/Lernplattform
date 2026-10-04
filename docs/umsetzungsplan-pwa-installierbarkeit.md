# Umsetzungsplan: Lernraum als installierbare Web-App (PWA)

Stand: 04.10.2026 · Ausgangsstand `claude/lernraum-ui-v2` @ `b4bc3e0` · vinext `1.0.0-beta.8`

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

| Zustand                                                                                | Manifest-Link | Ergebnis von Chromium       |
| -------------------------------------------------------------------------------------- | ------------- | --------------------------- |
| `bbb4702` (Manifest über `app/manifest.ts`)                                            | im `<body>`   | `no-manifest`               |
| `b4bc3e0` (statische `public/manifest.webmanifest`, verlinkt über `metadata.manifest`) | im `<body>`   | `no-manifest`               |
| Gleiche Seite, Manifest-Link per Skript in `<head>` verschoben                         | im `<head>`   | keine Fehler, installierbar |
| Prototyp aus 3.1 auf `/`, `/lernen`, `/lehrer`, `/lernen/faecher/deutsch`              | im `<head>`   | keine Fehler, installierbar |

**Ursache:** Der `<link rel="manifest">` landet im `<body>`, nicht im `<head>`. Chrome wertet
Manifest-Links aber nur im `<head>` aus. Das Manifest selbst ist korrekt und wird ausgeliefert.

Wie es dazu kommt:

1. `app/layout.tsx` nutzt ein asynchrones `generateMetadata()` mit `headers()`, um
   `metadataBase` aus dem Host zu bilden. Dadurch gelten die Metadaten als dynamisch.
2. vinext streamt dynamische Metadaten in den `<body>` und schiebt sie danach per Inline-Skript
   (`REINSERT_STREAMED_ICONS_SCRIPT` in `vinext/dist/server/app-page-route-wiring.js`) zurück in
   den `<head>`, **aber nur** `icon`- und `apple-touch-icon`-Links. Der Manifest-Link bleibt im
   `<body>`. Das gilt für `app/manifest.ts` genauso wie für den Eintrag `manifest:` in den
   Metadaten. Die Commits `ad54507`/`b4bc3e0` haben das Problem deshalb nicht behoben.
3. Dasselbe passiert auf jeder Seite mit eigenem `generateMetadata`, derzeit
   `app/lernen/faecher/[subject]/page.tsx`.

Gegenprobe: Mit statischem `export const metadata` im Layout steht der Manifest-Link im `<head>`.
Für Seiten mit eigenem `generateMetadata` gilt das aber nicht, deshalb reicht diese Variante
allein nicht (siehe 3.1).

Bereits erledigt (`ad54507`, `b4bc3e0`): statische `public/manifest.webmanifest` mit `id` und
`scope`, PNG-Icons in 180, 192 und 512 px, `apple-touch-icon` und `appleWebApp` in den Metadaten.

Weitere offene Befunde. Sie verhindern die Installation nicht, schwächen die App aber als
„funktionale Web-App“:

- **Service Worker nur über den Seitenfuß.** `navigator.serviceWorker.register("/sw.js")` steckt in
  `app/ui/version-button.tsx`. `SiteFooter` rendert auf `/` nichts. Auf der Startseite, der
  `start_url` des Manifests, wird also kein Service Worker registriert (gemessen: 0
  Registrierungen auf `/`, 1 auf `/lernen`). Wer dort installiert und offline startet, bekommt
  keine App-Hülle.
- **Maskable-Icon ist das normale Icon.** `icon-512.png` hat abgerundete, transparente Ecken und
  wird zusätzlich als `purpose: "maskable"` eingetragen. Android-Masken zeigen die transparenten
  Ecken als schwarze oder weiße Flächen.
- **Farben passen nicht zusammen.** `theme_color`/`background_color` im Manifest sind `#211f1b`,
  das Layout nutzt `#f6f2e8` (hell) und `#17150f` (dunkel). Ergebnis: ein unpassender
  Splash-Screen und eine unpassende Titelleiste.
- **Ungewollte Metadaten-Route.** `app/entwicklung/screens/manifest.ts` ist eine Hilfsdatei. Wegen
  ihres Namens behandelt vinext sie als Manifest-Route für `/entwicklung/screens`.
- **Kein Regressionstest.** Kein Test prüft, ob die App installierbar ist. Deshalb ist der
  Fehler unbemerkt geblieben.

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

- In `app/layout.tsx` den Eintrag `manifest: "/manifest.webmanifest"` aus `generateMetadata()`
  entfernen.
- Stattdessen im JSX von `RootLayout` direkt im `<head>` rendern:
  `<link rel="manifest" href="/manifest.webmanifest" />`, vor dem Theme-Skript.
- `public/manifest.webmanifest` bleibt die einzige Quelle. Es darf keine `app/manifest.*`-Datei
  geben (sonst erzeugt vinext wieder einen zweiten Link im `<body>`).
- Kurzer Kommentar am Link: Er steht absichtlich nicht in den Metadaten, weil vinext gestreamte
  Manifest-Links nicht in den `<head>` zurückschiebt.

Verworfene Alternativen:

- _Nur statische Metadaten im Layout:_ behebt `/`, aber nicht Seiten mit eigenem
  `generateMetadata`. Jede künftige Seite könnte den Fehler wieder einführen.
- _Link in den Metadaten behalten und zusätzlich im `<head>` setzen:_ doppelte Links, einer davon
  weiterhin im `<body>`. Unsauber und verwirrend.
- _vinext patchen:_ Wartungslast bei jedem Update; der Fehler gehört upstream.
- _Wechsel auf Next.js mit OpenNext oder auf eine reine SPA:_ großer Umbau ohne Mehrwert für
  dieses Problem.

### 3.2 Manifest nachschärfen

`public/manifest.webmanifest`:

- `theme_color`/`background_color` passend zum hellen Standardthema (`#f6f2e8`). Der dunkle Modus
  bleibt über die vorhandenen `theme-color`-Meta-Tags mit `media` abgedeckt.
- Eigenes `icon-maskable-512.png` statt `icon-512.png` für `purpose: "maskable"`. Es hat einen
  vollflächigen Hintergrund ohne abgerundete Ecken, und das Motiv liegt in der 80-%-Schutzzone.
- `dir: "ltr"`, `categories: ["education"]`.
- Optional für die ausführliche Installationsansicht unter Android und Desktop: `screenshots`
  (je ein Bild `form_factor: "wide"` und `"narrow"`).

### 3.3 Icons reproduzierbar erzeugen

- Neues Skript `scripts/generate-app-icons.mjs`. Es rendert `public/favicon.svg` mit dem bereits
  vorhandenen Playwright (wie `scripts/render-design-references.mjs`) als PNG in 180, 192 und
  512 px und erzeugt die maskable-Variante. Keine neue Abhängigkeit.
- Die PNGs bleiben eingecheckt. Das Skript läuft nur bei Icon-Änderungen, nicht in jedem Build.

### 3.4 iOS und iPadOS

Safari zeigt nie einen Installieren-Knopf. Der Weg führt dort immer über „Teilen → Zum
Home-Bildschirm“. `apple-touch-icon` (180 px) und `appleWebApp` sind bereits gesetzt. vinext
schiebt `apple-touch-icon` korrekt in den `<head>`; der Regressionstest (4) prüft das trotzdem.
Ergänzen: `appleWebApp.statusBarStyle: "default"`.

### 3.5 Service Worker zentral registrieren

- Neue Client-Komponente `app/ui/service-worker-registration.tsx`, im Root-Layout eingebunden.
  Sie registriert `/sw.js` (`updateViaCache: "none"`) auf jeder Seite, auch auf `/`.
- `VersionButton` registriert nicht mehr selbst, sondern nutzt
  `navigator.serviceWorker.ready`/`getRegistration()` für die Update-Anzeige. Die Update-Logik
  (Intervall, `SKIP_WAITING`, Neuladen bei `controllerchange`) bleibt unverändert.
- `scripts/service-worker.template.js`: `APP_SHELL` um die PNG-Icons ergänzen. Die
  Offline-Antwort bleibt wie heute.

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
  - Es gibt keine Datei `app/manifest.*`.
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

1. 3.1 + Render-Test aus 4: behebt das gemeldete Problem allein (wenige Zeilen). Kann als eigener
   kleiner PR zuerst gehen.
2. 3.5 (Service Worker zentral) mit E2E-Tests.
3. 3.2–3.4 (Farben, Maskable-Icon, Icon-Skript, iOS-Feinschliff).
4. 3.6, Upstream-Bericht, separater PR für das vinext-Update.
5. Optional 3.7.

## 7. Offene Entscheidungen

1. **Start-Adresse der installierten App:** `/` (Startseite mit Wahl Schüler/Lehrkraft,
   empfohlen) oder direkt `/lernen`?
2. **Eigener Installationshinweis (3.7)** gewünscht oder reicht der Browser-Knopf?
3. **Icon-Motiv:** das vorhandene „L“-Favicon als App-Icon verwenden (empfohlen) oder ein eigenes
   App-Icon gestalten?
