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
Navigation und Kacheln blenden sie aus. Motivation (Häuser, Serie), Duell und
alte Demo-Seiten sind `aus`.

Standardstufen im Schulbetrieb (Entscheidung 48):

<!-- freigabe:start -->

| Bereich           | Bezeichnung                   | Routen                                                                                                                                                               | Standard   |
| ----------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `start`           | Start                         | `/`                                                                                                                                                                  | `frei`     |
| `recht`           | Impressum und Datenschutz     | `/impressum`, `/datenschutz`                                                                                                                                         | `frei`     |
| `raum`            | Laufdiktat-Raum               | `/raum`                                                                                                                                                              | `frei`     |
| `lehrer-live`     | Laufdiktat Lehrkraft          | `/lehrer/live`                                                                                                                                                       | `frei`     |
| `mathe`           | Kopfrechnen                   | `/frei/mathematics`                                                                                                                                                  | `frei`     |
| `lernen`          | Mein Lernraum                 | `/lernen`, `/ueben`, `/frei`, `/klasse`, `/lernen/klasse`, `/lernen/aufgaben`, `/lernen/fortschritt`, `/lernen/einstellungen`, `/lernen/material`, `/lernen/faecher` | `frei`     |
| `lernbox`         | LernBox                       | `/lernbox`, `/frei/vocabulary`                                                                                                                                       | `frei`     |
| `wortspeicher`    | Wortspeicher                  | `/frei/german`                                                                                                                                                       | `frei`     |
| `textbox`         | Textbox                       | `/frei/german/textbox`                                                                                                                                               | `frei`     |
| `laufdiktat-frei` | Laufdiktat allein üben        | `/frei/german/laufdiktat`                                                                                                                                            | `frei`     |
| `tastenwelt`      | Tastenwelt                    | `/frei/typing`                                                                                                                                                       | `frei`     |
| `lehrer`          | Lehrerbereich                 | `/lehrer`                                                                                                                                                            | `frei`     |
| `lehrer-aufgaben` | Aufgaben der Lehrkraft        | `/lehrer/aufgaben`                                                                                                                                                   | `vorschau` |
| `geraete-sync`    | Geräte abgleichen (Lehrkraft) | –                                                                                                                                                                    | `frei`     |
| `motivation`      | Häuser, Serie und Abzeichen   | `/haus`, `/lehrer/haeuser`                                                                                                                                           | `aus`      |
| `duell`           | Duell                         | `/duell`                                                                                                                                                             | `aus`      |
| `demo-klasse`     | Demo-Klasse 7b                | `/klasse/7b`                                                                                                                                                         | `vorschau` |
| `demo`            | Alte Demo-Seiten              | `/demo`                                                                                                                                                              | `aus`      |

<!-- freigabe:end -->

`/klasse/7b` ist die feste Demo-Klasse und dient den Browser-Tests als
Testgelände. Sie erscheint nur mit Vorschau; echte Klassen laufen über
`/klasse/[classId]`.

- Stufen ändern: `LERNRAUM_FREIGABE="lernbox=frei,motivation=vorschau"`
- Vorschau für ein Gerät: `?vorschau=an` an eine beliebige Adresse hängen
  (`?vorschau=aus` schaltet sie ab). Für eine ganze Testumgebung gibt es
  `LERNRAUM_VORSCHAU=1`.

Das Register regelt Sichtbarkeit, keine Zugriffsrechte: Persönliche Daten
bleiben ohnehin auf dem Gerät, und Raumfunktionen sind über Raum- und
Lehrkrafttoken geschützt.

## Oberfläche

Die Oberfläche folgt dem Design „Lernraum UI“ (`docs/design/`, Referenzbilder
je Screen) und besteht aus genau einer Gestaltungsschicht:

- `app/ui/base.css`: Reset (Tailwind-Preflight in der Ebene `base`) und wenige
  Dokumentregeln. Tailwind-Hilfsklassen werden nicht verwendet.
- `app/ui/lernraum-ui.css`: Tokens (hell/dunkel) und alle Klassen mit Präfix
  `ui-`; Zustände heißen `is-*`.
- `app/ui/`: React-Bausteine (`primitives.tsx`, `sheet.tsx`, `icons.tsx`,
  Tiere, QR-Scanner, Raumcode-Eingabe, Seitenfuß) sowie Schüler- und
  Lehrerrahmen in `app/ui/shell/`.

Größere Screens trennen Zustand und Darstellung, zum Beispiel das
Lehrkraft-Laufdiktat (`app/lehrer/live/`: `useTeacherLiveRoom` plus
Schritt-Komponenten) und das Schülerspiel (`app/raum/spiel/`). Die
Bausteinübersicht liegt im Entwicklungsmodus unter `/entwicklung/ui`.
Fachwissen zu exemplarisch gefüllten Screens steht in `docs/inhalte/`.

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

`npm run test:e2e` enthält auch `e2e/platform-quality.spec.ts` (axe-Prüfung der Hauptseiten, LernBox, Lehrer-Arbeitsbereich, Einschreibung, Kopfrechnen) und ist Teil der Pflichtsuite.

Die Architekturentscheidungen stehen in [docs/architecture.md](docs/architecture.md), der verbindliche Coding- und Bibliotheksstandard in [docs/engineering-quality.md](docs/engineering-quality.md) und die mobile Teststrategie in [docs/device-support.md](docs/device-support.md). Die vollständige fachliche Konzeption liegt derzeit unter `obsidian-export/Lernplattform`.
