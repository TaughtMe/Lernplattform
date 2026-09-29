# Lernraum

Gemeinsam lernen, im Unterricht und zu Hause.

Dieses Repository enthält den gemeinsamen Lernraum: die schülerorientierte Startseite, Klassenbereiche und die integrierten Lernmodule. Aus LernBoxV2 und Laufdiktat werden geprüfte Fachlogik, Lernabläufe und Tests gezielt übernommen. Eigene App-Hüllen, Router, Themes und Einstellungen werden nicht eingebettet; Navigation, Speicherung, Ergebnisfluss und der gemeinsame Service Worker bleiben Lernraum-Grundlagen.

Die App-Version kommt zentral aus `package.json`. Vor Entwicklung und Build wird daraus ein Service Worker mit einem reproduzierbaren Quell-Fingerabdruck erzeugt. Die Versionsanzeige prüft regelmäßig und beim Zurückkehren in den Tab auf Updates; ein bereitstehendes Update wird erst nach Klick übernommen.

## Lokal starten

```bash
npm install
npm run dev
```

Im Entwicklungsmodus sind alle Bereiche in der Vorschau sichtbar.

## Freigaberegister

Welche Lernbereiche Schüler sehen, steuert `src/domain/release.ts`
(Entscheidung 47). Jeder Bereich hat eine Stufe:

- `frei`: für alle sichtbar
- `vorschau`: nur auf Geräten mit eingeschalteter Vorschau
- `aus`: nirgends sichtbar

Nicht sichtbare Routen leiten zum Start bzw. zum Lehrkraft-Laufdiktat um, und
Navigation und Kacheln blenden sie aus. Standard im Schulbetrieb: Laufdiktat
(Schüler und Lehrkraft) und Kopfrechnen sind `frei`, alles Weitere liegt in der
`vorschau`. Motivation (Häuser, Serie), Duell und alte Demo-Seiten sind `aus`.

- Stufen ändern: `LERNRAUM_FREIGABE="lernbox=frei,motivation=vorschau"`
- Vorschau für ein Gerät: `?vorschau=an` an eine beliebige Adresse hängen
  (`?vorschau=aus` schaltet sie ab). Für eine ganze Testumgebung gibt es
  `LERNRAUM_VORSCHAU=1`.

Das Register regelt Sichtbarkeit, keine Zugriffsrechte: Persönliche Daten
bleiben ohnehin auf dem Gerät, und Raumfunktionen sind über Raum- und
Lehrkrafttoken geschützt.

## Oberfläche

Die Oberfläche folgt dem Design „Lernraum UI“ (`docs/design/`, Referenzbilder
je Screen). Tokens und Grundbausteine stehen in `app/ui/lernraum-ui.css`
(Klassen mit Präfix `ui-`), die React-Bausteine in `app/ui/`: Grundbausteine
(`primitives.tsx`), Dialog (`sheet.tsx`), Tiere, Icons sowie Schüler- und
Lehrerrahmen (`app/ui/shell/`). Neue Screens nutzen ausschließlich diese
Schicht. `app/globals.css` enthält nur noch Stile, die ältere, noch nicht
umgebaute Seiteninhalte tatsächlich verwenden (Klassenbereich, Kopfrechnen,
Lehrer-Unterseiten); sie laufen im Rahmen als `.ui-legacy` und erhalten dort
die Design-Typografie. Die Bausteinübersicht liegt im Entwicklungsmodus unter
`/entwicklung/ui`. Der Umbau ist in `docs/umsetzungsplan-lernraum-ui.md`
beschrieben, Fachwissen zu exemplarisch gefüllten Screens in `docs/inhalte/`.

## Häuser

`/haus` (Schüler) und `/lehrer/haeuser` (Lehrkraft) setzen Konzept 10/11 um.
Sie sind im Schulbetrieb ausgeschaltet (Freigabebereich `motivation`) und
lassen sich mit `LERNRAUM_FREIGABE="motivation=vorschau"` für Vorschaugeräte
einschalten.
Hauspunkte werden lokal aus den eigenen Lernereignissen berechnet (Tageslimit
150, keine Minuspunkte). Der Haus-Leistungsbrief ist ein QR-Code mit
fortlaufender Standnummer, signiert mit dem persönlichen Einschreibe-Schlüssel
(HMAC-SHA-256, wie der Aufgaben-Leistungsbrief). Das Lehrergerät prüft die
Signatur, übernimmt nur höhere Standnummern und erkennt doppelte, veraltete,
klassenfremde und manipulierte Briefe. Einen Rückkanal zum Schülergerät gibt es
bewusst nicht.

## Prüfen

```bash
npm run check          # Format, Lint, Typen, Unit- und Datenbanktests, Build, Render-Tests
npm run test:e2e:live  # Laufdiktat-Räume im Browser
```

Die vollständige Plattformsuite läuft mit `ENABLE_PRE_PILOT_E2E=1`.

Die Architekturentscheidungen stehen in [docs/architecture.md](docs/architecture.md), der verbindliche Coding- und Bibliotheksstandard in [docs/engineering-quality.md](docs/engineering-quality.md) und die mobile Teststrategie in [docs/device-support.md](docs/device-support.md). Die vollständige fachliche Konzeption liegt derzeit unter `obsidian-export/Lernplattform`.
