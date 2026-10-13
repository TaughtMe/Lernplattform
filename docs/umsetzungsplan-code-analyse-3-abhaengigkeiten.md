# Teilplan 3: Abhängigkeiten aktualisieren und SR-001 neu bewerten

Stand: 13.10.2026 · Übersicht: [umsetzungsplan-code-analyse.md](umsetzungsplan-code-analyse.md) ·
Branch: `claude/code-analyse-3-abhaengigkeiten`

## Befund

SR-001 in `docs/security-risk-register.md` (Stand 12.08.2026) beschreibt `vinext → image-size`.
Das ist überholt: `image-size` ist nicht mehr im Lockfile. `npm audit` meldete am 13.10.2026
15 Befunde (3 mittel, 12 hoch):

| Paket (Kette)                                                                                                     | Schwere     | Angebotene Behebung                                             |
| ----------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------- |
| `source-map-js` 1.2.1 (über postcss, jsdom, tailwind, coverage)                                                   | hoch        | `npm audit fix`, ohne Versionsbruch                             |
| `@cloudflare/vite-plugin` 1.62.5 → `miniflare` → `sharp`; `wrangler` 4.147.0                                      | hoch        | `@cloudflare/vite-plugin` 1.63.2 (verlangt `wrangler ^4.150.0`) |
| `@next/eslint-plugin-next` 16.2.6 → `fast-glob` → `micromatch` → `braces`                                         | hoch        | nur Rückstufung auf 14.x angeboten, **nicht anwenden**          |
| `vinext` 1.0.1 → `vite-plugin-commonjs`, `vite-plugin-dynamic-import`, `@vercel/og` → `satori`, `sharp`, `fflate` | hoch/mittel | nur Rückstufung auf 0.2.1 angeboten, **nicht anwenden**         |

Verfügbar ist inzwischen `vinext` 1.1.0. Das bisherige Vorgehen für Updates der Build-Kette steht in
`docs/umsetzungsplan-abhaengigkeiten.md` (Stufe 1); daran halten.

## Schritte

Je Stufe ein Commit. Nach jeder Stufe die Prüfungen aus der Übersicht und zusätzlich
`npm run test:e2e:chromium` sowie `npm run test:e2e:live`, weil Build und Worker betroffen sind.
Schlägt eine Stufe fehl und lässt sich die Ursache nicht klein beheben: Stufe zurücknehmen, im
Risikoregister dokumentieren, mit der nächsten Stufe weitermachen.

1. **Ausgangslage festhalten:** `npm audit --json > /tmp/audit-vorher.json` und die Liste wie oben
   in die PR-Beschreibung übernehmen (aktuellen Stand, nicht diese Tabelle abschreiben).
2. **Ohne Versionsbruch:** `npm audit fix` (ohne `--force`). Danach `git diff package.json`: Es darf
   sich nur das Lockfile ändern. Ändert `npm audit fix` `package.json`, prüfen, ob es nur
   Patch-/Minor-Sprünge sind.
3. **Cloudflare-Kette:** `@cloudflare/vite-plugin` auf die aktuelle 1.x-Version und `wrangler` auf
   die dazu passende Version (mindestens 4.150.0) heben, beide exakt gepinnt wie bisher.
   `worker/index.ts` und `wrangler.jsonc`/`wrangler.toml` auf nötige Anpassungen prüfen
   (Changelog der beiden Pakete lesen).
4. **vinext 1.1.0:** Changelog von 1.0.1 → 1.1.0 lesen. Wenn es keine Brüche für App-Router,
   Metadaten, Bildoptimierung oder Worker-Einstieg nennt: auf 1.1.0 heben und
   `worker/index.ts` mit der Vorlage von 1.1.0 vergleichen (wie in
   `docs/umsetzungsplan-abhaengigkeiten.md` beschrieben). Danach `npm audit` erneut: Welche
   vinext-Meldungen bleiben? Wenn der Changelog Brüche nennt, nicht aktualisieren, sondern im
   Register festhalten.
5. **Lint-Kette (`@next/eslint-plugin-next`):** Nur Entwicklungswerkzeug, läuft nicht im Worker.
   Prüfen, ob eine neuere 16.x-Version die Kette behebt. Wenn nicht: per `overrides` in
   `package.json` `braces`, `micromatch` und `fast-glob` auf die gepatchten Versionen heben, sofern
   die Semver-Bereiche der Eltern das zulassen und `npm run lint` unverändert läuft. Sonst als
   akzeptiertes Restrisiko (nur Entwicklungszeit) eintragen.
6. **Erreichbarkeit bewerten:** Für jede verbleibende Meldung festhalten, ob das Paket
   - im ausgelieferten Worker-Bundle landet (prüfen: `npm run build`, dann im Build-Ausgabeordner
     nach dem Paketnamen suchen) oder
   - nur zur Build- bzw. Entwicklungszeit läuft.
     Und ob ein Angreifer den betroffenen Pfad erreichen kann (z. B. `sharp`/`satori` nur bei
     Bildoptimierung oder OG-Bildern mit fremden Eingaben; die App verarbeitet keine hochgeladenen
     Bilder).

## Risikoregister

`docs/security-risk-register.md`, SR-001 neu fassen (Titel z. B. „Indirekte Abhängigkeiten der
Build-Kette (vinext, Cloudflare, Lint)“):

- **Stand** mit Datum, **Status**, Tabelle der verbleibenden Meldungen mit Erreichbarkeit aus
  Schritt 6.
- **Gegenmaßnahmen:** die durchgeführten Updates, bestehende Regel „keine Bild-Uploads“.
- **Ausstiegspfad vinext:** zwei, drei Sätze. Die App verwendet die Next-APIs (`next/link`,
  `next/navigation`, Metadaten, `proxy.ts`). Ein Wechsel auf Next.js mit Cloudflare-Adapter
  (OpenNext) ist grundsätzlich möglich; bekannte Hürden aus dem Code auflisten (z. B. die
  vinext-spezifischen Importe in `worker/index.ts`, vinext-Besonderheiten wie in
  `docs/umsetzungsplan-pwa-installierbarkeit.md` beschrieben). Keine Umsetzung, nur
  Bestandsaufnahme.
- **Neubewertung:** monatlich oder bei jedem neuen vinext-Release.

Den alten Text zu `image-size` nicht löschen, sondern als „Historie“ unter dem neuen Stand kürzen.

## Nicht Teil dieses Plans

- `npm audit fix --force` oder jede Rückstufung.
- Der tatsächliche Wechsel weg von vinext.
- Updates von React, Zod, Dexie oder Supabase, sofern sie nicht für eine der Stufen nötig sind.
