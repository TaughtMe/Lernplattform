# Umsetzungsplan: Lernraum als installierbare Web-App (PWA)

Stand: 04.10.2026 · Ausgangsstand `claude/lernraum-ui-v2` @ `b4bc3e0` · vinext `1.0.0-beta.8`

Dieser Plan ist die Arbeitsgrundlage für einen KI-Agenten. Die Entscheidungen in Abschnitt 7
sind mit der projektverantwortlichen Lehrkraft abgestimmt und verbindlich. Das Update von vinext
und den übrigen Abhängigkeiten ist nicht Teil dieses Plans, sondern steht in
`docs/umsetzungsplan-abhaengigkeiten.md`.

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
  (raus aus der Beta), aber unabhängig von diesem Problem. Plan: `docs/umsetzungsplan-abhaengigkeiten.md`.

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

Entscheidung: Vorerst bleibt das vorhandene „L“ (`public/favicon.svg`) das App-Icon. Ein eigenes
App-Icon folgt später. Der Austausch soll dann nur aus „neue SVG ablegen, Skript ausführen“
bestehen.

- Neues Skript `scripts/generate-app-icons.mjs`. Es rendert eine Quell-SVG (Standard:
  `public/favicon.svg`, später die neue Icon-Datei) mit dem bereits vorhandenen Playwright (wie
  `scripts/render-design-references.mjs`) als PNG in 180, 192 und 512 px und erzeugt die
  maskable-Variante. Keine neue Abhängigkeit.
- Die PNGs bleiben eingecheckt. Das Skript läuft nur bei Icon-Änderungen, nicht in jedem Build.
- Hinweis für das spätere Icon: Bei installierten Apps bleibt das alte Icon auf manchen Geräten
  stehen, bis die App neu installiert wird. Deshalb erhalten neue Icon-Dateien neue Dateinamen
  (z. B. `icon-v2-192.png`) statt die alten zu überschreiben.

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

### 3.7 Knopf „Als App installieren“ auf der Startseite

Entscheidung: Ein eigener Knopf direkt auf der Startseite, **unter dem Raumcode**.

Platzierung und Aussehen:

- In `app/views/start/landing-screen.tsx` innerhalb der Raumcode-Gruppe, nach den Codefeldern
  und dem `notice`, vor der Zeile „Ohne Konto · …“.
- Zurückhaltend als Textknopf mit Symbol, damit die Startseite nach Design 2a („ein Tier, ein
  Code, sonst nichts“) ruhig bleibt. Mindestens 44 px Touch-Ziel, sichtbarer Fokus.
- Die Ansicht bleibt rein (Regel aus `docs/umsetzungsplan-lernraum-ui-v2.md`): Sie bekommt nur
  eine neue Eigenschaft `renderInstall?: (className: string) => ReactNode`, analog zu
  `renderScan`. Die Logik liegt in `app/landing/start-page.tsx`. Die bewusste Ergänzung zur
  Vorlage 2a wird im v2-Plan als Abweichung vermerkt.

Verhalten:

- **Chrome, Edge, Android:** Ein früh eingebundener Listener speichert das Ereignis
  `beforeinstallprompt` (mit `preventDefault()`). Der Browser feuert es oft vor der Hydration;
  deshalb sitzt der Listener in der Komponente aus 3.5 oder in einem kleinen Inline-Skript im
  `<head>`. Ein Klick ruft `prompt()` auf. Nach `appinstalled` oder einer Annahme verschwindet
  der Knopf.
- **iPhone/iPad (Safari):** Hier gibt es kein `beforeinstallprompt`. Der Knopf öffnet ein kurzes
  Blatt (vorhandenes `app/ui/sheet.tsx`) mit der Anleitung „Teilen → Zum Home-Bildschirm“.
- **Bereits installiert** (`display-mode: standalone` oder `navigator.standalone`): Der Knopf
  erscheint nicht.
- **Browser ohne Installation** (z. B. Firefox Desktop): Der Knopf erscheint nicht.
- Vor der Hydration wird nichts gerendert, damit nichts springt oder flackert.

Neue Bausteine:

- `app/ui/use-install-prompt.ts`: ein Hook mit dem Zustand
  `"unavailable" | "available" | "ios" | "installed"` und der Aktion `install()`.
- Texte: Knopf „Als App installieren“; iOS-Blatt „So installierst du Lernraum“ mit zwei kurzen
  Schritten.

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
- Installieren-Knopf (3.7):
  - Unit-Test für `use-install-prompt` mit einem nachgebauten `beforeinstallprompt`-Ereignis,
    iOS-Erkennung und dem Standalone-Fall.
  - E2E auf `/`: Nach einem künstlich ausgelösten `beforeinstallprompt` erscheint der Knopf
    unter dem Raumcode. Im Standalone-Modus erscheint er nicht. axe-Prüfung ohne Befund.
  - `npm run test:design`: Die Startseiten-Referenz wird bewusst aktualisiert.
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
6. Knopf „Als App installieren“: In Chrome und Android installiert er die App, auf dem iPad zeigt
   er die Anleitung, in der installierten App ist er verschwunden.

Firefox (Desktop) bietet keine PWA-Installation an. Das ist kein Fehler des Lernraums.

## 6. Reihenfolge

1. 3.1 + Render-Test aus 4: behebt das gemeldete Problem allein (wenige Zeilen). Kann als eigener
   kleiner PR zuerst gehen.
2. 3.5 (Service Worker zentral) mit E2E-Tests. Der frühe `beforeinstallprompt`-Listener für 3.7
   kommt gleich mit.
3. 3.7 (Knopf auf der Startseite).
4. 3.2–3.4 (Farben, Maskable-Icon, Icon-Skript, iOS-Feinschliff).
5. 3.6 und Upstream-Bericht.

Das vinext-Update folgt danach separat (`docs/umsetzungsplan-abhaengigkeiten.md`). Nach dem
Update prüft der Render-Test aus 4, ob der Kernfix weiter greift.

## 7. Entscheidungen (abgestimmt am 04.10.2026)

1. **Start-Adresse:** Die installierte App startet auf der Startseite (`start_url: "/"`).
2. **Eigener Installieren-Knopf:** ja, auf der Startseite unter dem Raumcode (3.7).
3. **Icon:** vorerst das vorhandene „L“. Ein eigenes App-Icon gestaltet die Lehrkraft später; es
   wird über das Skript aus 3.3 eingespielt.
