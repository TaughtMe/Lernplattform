# Lernraum

Gemeinsam lernen, im Unterricht und zu Hause.

Dieses Repository enthält den gemeinsamen Lernraum: die schülerorientierte Startseite, Klassenbereiche und die integrierten Lernmodule. Aus LernBoxV2 und Laufdiktat werden geprüfte Fachlogik, Lernabläufe und Tests gezielt übernommen. Eigene App-Hüllen, Router, Themes und Einstellungen werden nicht eingebettet; Navigation, Speicherung, Ergebnisfluss und der gemeinsame Service Worker bleiben Lernraum-Grundlagen.

Die App-Version kommt zentral aus `package.json`. Vor Entwicklung und Build wird daraus ein Service Worker mit einem reproduzierbaren Quell-Fingerabdruck erzeugt. Die Versionsanzeige prüft regelmäßig und beim Zurückkehren in den Tab auf Updates; ein bereitstehendes Update wird erst nach Klick übernommen.

## Lokal starten

```bash
npm install
npm run dev
```

Alle Lernraum- und Lehrkraft-Bereiche sind standardmäßig erreichbar – auch im
Produktionsbuild. Die frühere Pilot-Routenschranke (nur Laufdiktat und
Kopfrechnen) ist opt-in und lässt sich mit `LERNRAUM_PILOT_GATE=1` wieder
aktivieren.

## Oberfläche

Die Farben und Flächen folgen dem Design „Lernraum UI“ (warmes Anthrazit für
Navigation und Einstieg, Bernstein als Akzent, Papier-Hintergrund, hell und
dunkel). Die Werte stehen zentral als Variablen am Anfang von
`app/globals.css`; dunkle Navigationsflächen schalten diese Variablen lokal um
(Abschnitt „Lernraum UI“ am Ende der Datei). Die Design-Vorlage liegt im
Branch `claude/tender-turing-gg1wv3` unter `docs/design/`.

## Häuser

`/haus` (Schüler) und `/lehrer/haeuser` (Lehrkraft) setzen Konzept 10/11 um:
Hauspunkte werden lokal aus den eigenen Lernereignissen berechnet (Tageslimit
150, keine Minuspunkte). Der Haus-Leistungsbrief ist ein QR-Code mit
fortlaufender Standnummer, signiert mit dem persönlichen Einschreibe-Schlüssel
(HMAC-SHA-256, wie der Aufgaben-Leistungsbrief). Das Lehrergerät prüft die
Signatur, übernimmt nur höhere Standnummern und erkennt doppelte, veraltete,
klassenfremde und manipulierte Briefe. Einen Rückkanal zum Schülergerät gibt es
bewusst nicht.

## Prüfen

```bash
npm test
npm run lint
```

Die Architekturentscheidungen stehen in [docs/architecture.md](docs/architecture.md), der verbindliche Coding- und Bibliotheksstandard in [docs/engineering-quality.md](docs/engineering-quality.md) und die mobile Teststrategie in [docs/device-support.md](docs/device-support.md). Die vollständige fachliche Konzeption liegt derzeit unter `obsidian-export/Lernplattform`.
