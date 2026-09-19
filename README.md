# Lernraum

Gemeinsam lernen, im Unterricht und zu Hause.

Dieses Repository enthält den gemeinsamen Lernraum: die schülerorientierte Startseite, Klassenbereiche und die integrierten Lernmodule. Aus LernBoxV2 und Laufdiktat werden geprüfte Fachlogik, Lernabläufe und Tests gezielt übernommen. Eigene App-Hüllen, Router, Themes und Einstellungen werden nicht eingebettet; Navigation, Speicherung, Ergebnisfluss und der gemeinsame Service Worker bleiben Lernraum-Grundlagen.

Die App-Version kommt zentral aus `package.json`. Vor Entwicklung und Build wird daraus ein Service Worker mit einem reproduzierbaren Quell-Fingerabdruck erzeugt. Die Versionsanzeige prüft regelmäßig und beim Zurückkehren in den Tab auf Updates; ein bereitstehendes Update wird erst nach Klick übernommen.

## Lokal starten

```bash
npm install
npm run dev
```

## Prüfen

```bash
npm test
npm run lint
```

Die Architekturentscheidungen stehen in [docs/architecture.md](docs/architecture.md), der verbindliche Coding- und Bibliotheksstandard in [docs/engineering-quality.md](docs/engineering-quality.md) und die mobile Teststrategie in [docs/device-support.md](docs/device-support.md). Die vollständige fachliche Konzeption liegt derzeit unter `obsidian-export/Lernplattform`.
