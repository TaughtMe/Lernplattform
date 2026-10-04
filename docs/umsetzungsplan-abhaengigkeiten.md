# Umsetzungsplan: vinext und übrige Abhängigkeiten aktualisieren

Stand: 04.10.2026 · Ausgangsstand `claude/lernraum-ui-v2` @ `e89c555` · Node 22 (CI und `engines`)

Dieser Plan ist die Arbeitsgrundlage für einen KI-Agenten. Er läuft **getrennt** vom PWA-Plan
(`docs/umsetzungsplan-pwa-installierbarkeit.md`) und beginnt erst, wenn dessen Kernfix
(Abschnitt 3.1) gemergt ist. So lässt sich jeder Fehler eindeutig einer Änderung zuordnen.

## 0. Arbeitsweise

- **Ein PR pro Stufe** (Abschnitt 3), jeweils abgezweigt von `claude/lernraum-ui-v2`. Stufen
  nicht mischen. Bricht etwas, wird nur diese Stufe zurückgenommen.
- Versionen mit `npm install <paket>@<version>` ändern, damit `package-lock.json` von npm
  geschrieben wird. Den Lockfile nie von Hand bearbeiten. Exakt gepinnte Pakete bleiben exakt
  gepinnt.
- Vor jedem Push: `npm run check`, `npm run test:e2e:chromium`, `npm run test:design`. Bei
  Stufe 1 und 2 zusätzlich `npm run test:e2e:live`. Die volle Cross-Browser-Suite läuft in
  GitHub (`AGENTS.md`).
- Nach jedem Update die Release-Notes des Pakets auf „breaking“ prüfen und Auffälligkeiten
  im PR-Text nennen.

## 1. Bestandsaufnahme

`npm audit`:

- **Ausgelieferte Pakete (`--omit=dev`): 0 Schwachstellen.** Im Browser und im Worker steckt
  nichts Bekanntes.
- **Entwicklungswerkzeuge: 18 Meldungen (14 hoch, 4 mittel).** Betroffen sind `undici`, `sharp`
  (über `@cloudflare/vite-plugin` → `miniflare` und über `jsdom`), `brace-expansion`, `braces`,
  `js-yaml`, `fast-uri` und `@vitest/mocker`. Das betrifft nur den lokalen Dev-Server und die
  Tests, nicht die Nutzer. Es sollte trotzdem mit Stufe 0/1 verschwinden.

`npm outdated` (Auswahl, gruppiert):

| Gruppe                   | Paket                                                     | Aktuell      | Neueste      |
| ------------------------ | --------------------------------------------------------- | ------------ | ------------ |
| Framework/Build          | `vinext`                                                  | 1.0.0-beta.8 | 1.0.1        |
|                          | `vite`                                                    | 8.2.2        | 8.3.2        |
|                          | `@vitejs/plugin-rsc`                                      | 0.5.34       | 0.5.35       |
|                          | `@vitejs/plugin-react`                                    | 6.0.2        | 6.1.1        |
|                          | `@cloudflare/vite-plugin`                                 | 1.51.3       | 1.62.5       |
|                          | `wrangler`                                                | 4.121.0      | 4.147.0      |
| React                    | `react`, `react-dom`, `react-server-dom-webpack`          | 19.2.8       | 19.3.0       |
|                          | `@types/react`, `@types/react-dom`                        | 19.2.x       | 19.3.0       |
| Laufzeit (im Browser)    | `@supabase/supabase-js`                                   | 2.105.4      | 2.117.2      |
|                          | `dexie`                                                   | 4.4.4        | 4.4.6        |
|                          | `zod`                                                     | 4.4.3        | 4.6.5        |
|                          | `katex`                                                   | 0.17.0       | 0.19.0       |
| Werkzeuge (klein)        | `@playwright/test`                                        | 1.62.1       | 1.63.0       |
|                          | `prettier`                                                | 3.9.6        | 3.9.9        |
|                          | `tailwindcss`, `@tailwindcss/postcss`                     | 4.2.1        | 4.3.3        |
|                          | `typescript-eslint`                                       | 8.59.3       | 8.71.0       |
|                          | `@next/eslint-plugin-next`, Testing Library, `fast-check` | –            | Patch/Minor  |
| Werkzeuge (Hauptversion) | `eslint`, `@eslint/js`, `globals`                         | 9 / 9 / 16   | 10 / 10 / 17 |
|                          | `vitest`, `@vitest/coverage-v8`                           | 4.1.10       | 5.0.3        |
|                          | `typescript`                                              | 5.9.3        | 7.0.2        |
|                          | `@types/node`                                             | 22.19.19     | 26.6.4       |

Nicht veraltet: `qr-scanner`, `qrcode.react`, Fontsource-Schriften.

## 2. Bewertung

- **vinext von Beta auf 1.0.1:** sinnvoll. Wir verlassen die Beta, bekommen Fehlerbehebungen und
  eine stabile Grundlage. Der Manifest-Fehler aus dem PWA-Plan ist in 1.0.1 **nicht** behoben.
  Der Kernfix dort bleibt also nötig.
- **Die Build-Kette gehört zusammen.** vinext, vite, die Vite-Plugins, der Cloudflare-Plugin,
  wrangler und React sind eng gekoppelt (vinext verlangt `vite ^8`, `@vitejs/plugin-rsc
^0.5.34`, `react ^19.2.6`). Sie werden gemeinsam angehoben. Einzeln entstehen sonst
  Zwischenstände, die nie getestet wurden.
- **Laufzeit-Bibliotheken separat.** Sie berühren echte Nutzerdaten: `dexie` die lokale
  Datenbank, `supabase-js` den Live-Raum, `katex` die Matheanzeige. Fehler zeigen sich anders als
  bei der Build-Kette.
- **Hauptversionen der Werkzeuge zuletzt und einzeln.** Sie bringen nichts für die Nutzer, aber
  Umbauaufwand (ESLint-Konfiguration, Vitest-API, TypeScript 7).
- **`@types/node` folgt der Node-Version**, nicht der neuesten Version. Solange Node 22 läuft,
  bleibt es bei `@types/node@22`.

## 3. Stufen

### Stufe 0: Sicherheits-Patches ohne Versionssprünge

- `npm audit fix` (ohne `--force`). Das hebt nur transitive Pakete wie `brace-expansion`,
  `js-yaml` und `fast-uri` innerhalb erlaubter Bereiche an.
- Erwartung: Ein Teil der Meldungen verschwindet. `undici`/`sharp` bleiben bis Stufe 1 (sie
  hängen an `miniflare`).

### Stufe 1: Build-Kette mit vinext 1.0.1

- `vinext@1.0.1`, `vite@8.3.x`, `@vitejs/plugin-rsc@0.5.35`, `@vitejs/plugin-react@6.1.x`,
  `@cloudflare/vite-plugin@1.62.x`, `wrangler@4.147.x`, `react`/`react-dom`/
  `react-server-dom-webpack@19.3.0`, `@types/react`/`@types/react-dom@19.3.0`,
  `@next/eslint-plugin-next` passend.
- `worker/index.ts` stammt aus der vinext-Vorlage. Mit der Vorlage von 1.0.1 vergleichen
  (Importe `vinext/server/image-optimization` und `vinext/server/app-router-entry`).
- `build/sites-vite-plugin.ts` und `vite.config.ts` auf geänderte Plugin-Optionen prüfen.
- Das Kompatibilitätsdatum des Workers (derzeit `2026-08-11`, steht im erzeugten
  `dist/server/wrangler.json`) kann sich mit dem Cloudflare-Plugin verschieben. Den neuen Wert
  im PR nennen.
- Besonders prüfen:
  - Metadaten: Titel und Icons im `<head>`. Der Render-Test aus dem PWA-Plan muss grün bleiben.
  - Freigabesteuerung über `proxy.ts` (`?vorschau=an|aus`, Weiterleitungen).
  - Service-Worker-Update und Versionsknopf.
  - Bildoptimierung (`/_vinext/image`) und die Live-Räume (`test:e2e:live`).
- Danach erneut `npm audit`. Erwartung: `undici`/`sharp` sind behoben.
- Bonus: prüfen, ob vinext den Manifest-Link inzwischen in den `<head>` schiebt. Nur dann
  könnte der Kernfix später vereinfacht werden. Er bleibt aber ohnehin unschädlich.

### Stufe 2: Laufzeit-Bibliotheken

- `zod@4.6`, `dexie@4.4.6`, `@supabase/supabase-js@2.117`: Minor und Patch, geringes Risiko.
  Prüfen: lokale Daten bleiben nach dem Update lesbar (Gerät mit vorhandenen Daten aus der
  Vorversion), Live-Raum beitreten und Ergebnisse übertragen.
- `katex@0.19`: Bei 0.x-Versionen kann ein Minor-Sprung inkompatibel sein. Deshalb als eigener
  Commit. Matheaufgaben, Mathe-Editor im Laufdiktat und Design-Referenzen prüfen. Bei
  Abweichungen zurückstellen.

### Stufe 3: kleine Werkzeug-Updates

- `@playwright/test@1.63` (lädt neue Browser-Versionen; CI-Cache beachten), `prettier@3.9.9`
  (eventuelle Umformatierung als eigener Commit nur mit `npm run format`), `tailwindcss`/
  `@tailwindcss/postcss@4.3`, `typescript-eslint@8.71`, Testing Library, `fast-check`.

### Stufe 4: Hauptversionen (später, je ein PR)

1. `vitest@5` + `@vitest/coverage-v8@5`: `vitest.config.ts`, `vitest.setup.ts` und
   Coverage-Schwellen prüfen.
2. `eslint@10` + `@eslint/js@10` + `globals@17`: erst, wenn `typescript-eslint` und
   `@next/eslint-plugin-next` ESLint 10 offiziell unterstützen.
3. `typescript@7`: erst, wenn `typescript-eslint` TS 7 unterstützt. Bis dahin bleibt 5.9.
4. **Node 24 LTS** statt Node 22. Node 22 erhält nur noch Wartungs-Updates (bis April 2027).
   Dazu passen: `node-version` in `.github/workflows/quality.yml`, `engines` in
   `package.json`, `@types/node@24`.

## 4. Künftig: Updates automatisch vorschlagen lassen

Empfehlung: `.github/dependabot.yml` mit wöchentlichen, gruppierten PRs:

- eine Gruppe „Build-Kette“ (die Pakete aus Stufe 1),
- eine Gruppe „Laufzeit“,
- eine Gruppe „Werkzeuge“ (nur Patch/Minor),
- Hauptversionen einzeln,
- Sicherheits-Updates sofort.

So bleibt der Abstand zu den aktuellen Versionen klein, und solche Sammel-Updates werden
seltener. Jeder Dependabot-PR durchläuft dieselben Quality Gates.

## 5. Reihenfolge

1. PWA-Kernfix (eigener Plan) mergen.
2. Stufe 0 → Stufe 1 → Stufe 2 → Stufe 3, jeweils erst nach grünem Merge der vorigen.
3. Dependabot einrichten (nach Stufe 3, damit nicht sofort viele PRs entstehen).
4. Stufe 4 nach Bedarf, Node 24 spätestens vor April 2027.
